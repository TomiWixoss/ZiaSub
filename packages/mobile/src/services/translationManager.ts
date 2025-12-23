import type {
  GeminiConfig,
  BatchSettings,
  BatchProgress,
  TranslationJob,
  KeyStatusCallback,
} from "@src/types";
import { saveTranslation, savePartialTranslation } from "@utils/storage";
import { translateVideoWithGemini } from "./geminiService";
import { notificationService } from "./notificationService";
import { backgroundService } from "./backgroundService";

type TranslationListener = (job: TranslationJob) => void;

class TranslationManager {
  private static instance: TranslationManager;
  private currentJob: TranslationJob | null = null;
  private listeners: Set<TranslationListener> = new Set();
  private abortController: AbortController | null = null;
  private isAborted: boolean = false;
  private skipBackgroundControl: boolean = false; // true khi gọi từ queue
  private skipNotification: boolean = false; // true khi gọi từ queue

  private constructor() {}

  static getInstance(): TranslationManager {
    if (!TranslationManager.instance) {
      TranslationManager.instance = new TranslationManager();
    }
    return TranslationManager.instance;
  }

  subscribe(listener: TranslationListener): () => void {
    this.listeners.add(listener);
    if (this.currentJob) {
      listener(this.currentJob);
    }
    return () => this.listeners.delete(listener);
  }

  private notify() {
    if (this.currentJob) {
      this.listeners.forEach((listener) => listener(this.currentJob!));
    }
  }

  getCurrentJob(): TranslationJob | null {
    return this.currentJob;
  }

  isTranslating(): boolean {
    return this.currentJob?.status === "processing";
  }

  isTranslatingUrl(videoUrl: string): boolean {
    return (
      this.currentJob?.videoUrl === videoUrl &&
      this.currentJob?.status === "processing"
    );
  }

  getJobForUrl(videoUrl: string): TranslationJob | null {
    if (this.currentJob?.videoUrl === videoUrl) {
      return this.currentJob;
    }
    return null;
  }

  async startTranslation(
    videoUrl: string,
    config: GeminiConfig,
    videoDuration?: number,
    batchSettings?: BatchSettings,
    rangeStart?: number,
    rangeEnd?: number,
    resumeData?: {
      partialSrt: string;
      completedBatchRanges: Array<{ start: number; end: number }>;
      existingTranslationId?: string;
    },
    presubConfig?: GeminiConfig,
    options?: {
      skipBackgroundControl?: boolean; // true khi gọi từ queue - queue tự quản lý background
      skipNotification?: boolean; // true khi gọi từ queue - queue tự gửi notification
    }
  ): Promise<string> {
    if (this.isTranslatingUrl(videoUrl)) {
      throw new Error("Video này đang dịch rồi");
    }

    if (this.isTranslating()) {
      throw new Error("Đang dịch video khác, vui lòng đợi hoặc dừng trước");
    }

    this.abortController = new AbortController();
    this.isAborted = false;

    // Start background service để giữ app chạy khi ở background
    // Skip nếu được gọi từ queue (queue tự quản lý background)
    this.skipBackgroundControl = options?.skipBackgroundControl ?? false;
    this.skipNotification = options?.skipNotification ?? false;
    if (!this.skipBackgroundControl) {
      await backgroundService.onTranslationStart(config.name);
    }

    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    this.currentJob = {
      id: jobId,
      videoUrl,
      configName: config.name,
      configId: config.id,
      presetId: config.presetId,
      status: "processing",
      progress: null,
      keyStatus: null,
      result: null,
      error: null,
      startedAt: Date.now(),
      completedAt: null,
      partialResult: resumeData?.partialSrt || null,
      rangeStart,
      rangeEnd,
      videoDuration,
      batchSettings,
      completedBatchRanges: resumeData?.completedBatchRanges || [],
      existingTranslationId: resumeData?.existingTranslationId,
    };
    this.notify();

    const onKeyStatus: KeyStatusCallback = (status) => {
      if (this.currentJob && this.currentJob.id === jobId && !this.isAborted) {
        this.currentJob = {
          ...this.currentJob,
          keyStatus: status.message,
        };
        this.notify();
      }
    };

    // Track completed ranges for resume support
    let completedRanges: Array<{ start: number; end: number }> =
      resumeData?.completedBatchRanges || [];
    let accumulatedSrt = resumeData?.partialSrt || "";
    let currentBatchStatuses: Array<"pending" | "completed" | "error"> = [];

    try {
      const result = await translateVideoWithGemini(
        videoUrl,
        config,
        undefined,
        {
          videoDuration,
          batchSettings,
          rangeStart,
          rangeEnd,
          abortSignal: this.abortController.signal,
          skipRanges: resumeData?.completedBatchRanges,
          existingPartialSrt: resumeData?.partialSrt,
          presubConfig,
          onBatchProgress: (progress: BatchProgress) => {
            if (
              this.currentJob &&
              this.currentJob.id === jobId &&
              !this.isAborted
            ) {
              // Update batch statuses from progress
              currentBatchStatuses = progress.batchStatuses.map((s) =>
                s === "processing"
                  ? ("pending" as const)
                  : (s as "pending" | "completed" | "error")
              );
              this.currentJob = {
                ...this.currentJob,
                progress,
                batchStatuses: currentBatchStatuses,
              };
              this.notify();

              // Update background notification progress
              backgroundService.updateProgress(
                progress.currentBatch,
                progress.totalBatches,
                config.name
              );
            }
          },
          onKeyStatus,
          onBatchComplete: (
            partialSrt: string,
            batchIndex: number,
            totalBatches: number,
            newCompletedRanges: Array<{ start: number; end: number }>
          ) => {
            if (
              this.currentJob &&
              this.currentJob.id === jobId &&
              !this.isAborted
            ) {
              accumulatedSrt = partialSrt;
              completedRanges = newCompletedRanges;
              // Update batch statuses - mark completed batch
              if (currentBatchStatuses.length === 0) {
                currentBatchStatuses = Array(totalBatches).fill("pending");
              }
              currentBatchStatuses[batchIndex] = "completed";
              this.currentJob = {
                ...this.currentJob,
                partialResult: partialSrt,
                completedBatchRanges: newCompletedRanges,
                batchStatuses: [...currentBatchStatuses],
              };
              this.notify();

              // Gửi notification khi dịch xong từng phần
              // Skip nếu được gọi từ queue (queue tự gửi notification)
              if (!this.skipNotification) {
                notificationService.notifyBatchComplete(
                  config.name,
                  batchIndex + 1,
                  totalBatches,
                  "direct"
                );
              }
            }
          },
        }
      );

      if (this.isAborted) {
        throw new Error("Đã dừng dịch");
      }

      await saveTranslation(
        videoUrl,
        result,
        config.name,
        resumeData?.existingTranslationId,
        config.presetId,
        {
          videoDuration: this.currentJob?.videoDuration,
          batchSettings: this.currentJob?.batchSettings as BatchSettings,
          totalBatches: this.currentJob?.progress?.totalBatches,
          batchStatuses:
            currentBatchStatuses.length > 0 ? currentBatchStatuses : undefined,
        }
      );

      if (this.currentJob && this.currentJob.id === jobId && !this.isAborted) {
        this.currentJob = {
          ...this.currentJob,
          status: "completed",
          result,
          partialResult: null,
          keyStatus: null,
          completedAt: Date.now(),
          completedBatchRanges: [],
        };
        this.notify();

        // Gửi notification khi dịch xong
        // Skip nếu được gọi từ queue (queue tự gửi notification)
        if (!this.skipNotification) {
          notificationService.notifyTranslationComplete(config.name, "direct");
        }
      }

      return result;
    } catch (error: any) {
      // If aborted, partial was already saved in abortTranslation()
      // Only save here if it's a real error (not user abort)
      if (!this.isAborted) {
        const hasPartialResult = accumulatedSrt && completedRanges.length > 0;

        if (hasPartialResult && this.currentJob) {
          try {
            await savePartialTranslation(
              videoUrl,
              accumulatedSrt,
              config.name,
              {
                completedBatches: completedRanges.length,
                totalBatches: this.currentJob.progress?.totalBatches || 0,
                rangeStart,
                rangeEnd,
                videoDuration,
                batchSettings,
                batchStatuses: currentBatchStatuses,
                presetId: config.presetId,
              }
            );
            console.log(
              "[TranslationManager] Saved partial on error:",
              completedRanges.length,
              "batches"
            );
          } catch (saveError) {
            console.error(
              "[TranslationManager] Failed to save partial:",
              saveError
            );
          }
        }

        // Update job status for real errors
        if (this.currentJob && this.currentJob.id === jobId) {
          this.currentJob = {
            ...this.currentJob,
            status: "error",
            error: error.message || "Có lỗi xảy ra",
            completedAt: Date.now(),
            partialResult: accumulatedSrt || null,
            completedBatchRanges: completedRanges,
          };
          this.notify();

          // Gửi notification khi lỗi
          // Skip nếu được gọi từ queue (queue tự gửi notification)
          if (!this.skipNotification) {
            notificationService.notifyTranslationError(
              config.name,
              error.message,
              "direct"
            );
          }
        }
      }
      // If aborted, job status was already updated in abortTranslation()

      throw error;
    } finally {
      this.abortController = null;
      // Stop background service khi dịch xong (dù thành công hay lỗi)
      // Skip nếu được gọi từ queue (queue tự quản lý background)
      if (!this.skipBackgroundControl) {
        backgroundService.onTranslationComplete();
      }
    }
  }

  clearCompletedJob(videoUrl?: string) {
    if (
      this.currentJob &&
      (this.currentJob.status === "completed" ||
        this.currentJob.status === "error")
    ) {
      if (!videoUrl || this.currentJob.videoUrl === videoUrl) {
        this.currentJob = null;
        this.notify();
      }
    }
  }

  async abortTranslation(videoUrl?: string): Promise<{
    aborted: boolean;
    partialResult?: string;
    completedRanges?: Array<{ start: number; end: number }>;
  }> {
    if (!this.currentJob || this.currentJob.status !== "processing") {
      return { aborted: false };
    }

    if (videoUrl && this.currentJob.videoUrl !== videoUrl) {
      return { aborted: false };
    }

    this.isAborted = true;

    const partialResult = this.currentJob.partialResult || undefined;
    const completedRanges = this.currentJob.completedBatchRanges || [];
    const batchStatuses = this.currentJob.batchStatuses || [];
    const presetId = this.currentJob.presetId;
    const hasPartial = partialResult && completedRanges.length > 0;

    // Save partial translation IMMEDIATELY (don't wait for catch block)
    if (hasPartial) {
      try {
        await savePartialTranslation(
          this.currentJob.videoUrl,
          partialResult,
          this.currentJob.configName,
          {
            completedBatches: completedRanges.length,
            totalBatches: this.currentJob.progress?.totalBatches || 0,
            rangeStart: this.currentJob.rangeStart,
            rangeEnd: this.currentJob.rangeEnd,
            videoDuration: this.currentJob.videoDuration,
            batchSettings: this.currentJob.batchSettings as any,
            batchStatuses,
            presetId,
          }
        );
      } catch (saveError) {
        console.error(
          "[TranslationManager] Failed to save partial:",
          saveError
        );
      }
    }

    // Abort the signal (this will eventually trigger catch block, but we don't wait)
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch (abortError) {
        // Ignore abort errors
      }
      this.abortController = null;
    }

    // Update job status and notify IMMEDIATELY
    this.currentJob = {
      ...this.currentJob,
      status: "error",
      error: hasPartial
        ? `Đã dừng (${completedRanges.length} phần đã dịch)`
        : "Đã dừng dịch",
      completedAt: Date.now(),
    };

    try {
      this.notify();
    } catch (notifyError) {
      // Ignore notify errors - subscribers may have stale references
    }

    return { aborted: true, partialResult, completedRanges };
  }

  canAbort(videoUrl?: string): boolean {
    if (!this.currentJob || this.currentJob.status !== "processing") {
      return false;
    }
    if (videoUrl && this.currentJob.videoUrl !== videoUrl) {
      return false;
    }
    return true;
  }

  // Get partial result for a video (for resume)
  getPartialResult(videoUrl: string): {
    partialSrt: string;
    completedRanges: Array<{ start: number; end: number }>;
  } | null {
    if (
      this.currentJob?.videoUrl === videoUrl &&
      this.currentJob.partialResult
    ) {
      return {
        partialSrt: this.currentJob.partialResult,
        completedRanges: this.currentJob.completedBatchRanges || [],
      };
    }
    return null;
  }

  // Translate a single batch and replace in existing SRT
  async translateSingleBatch(
    videoUrl: string,
    config: GeminiConfig,
    existingSrt: string,
    batchStart: number,
    batchEnd: number,
    videoDuration?: number,
    existingTranslationId?: string
  ): Promise<string> {
    if (this.isTranslating()) {
      throw new Error("Đang dịch video khác, vui lòng đợi hoặc dừng trước");
    }

    this.abortController = new AbortController();
    this.isAborted = false;

    // Start background service
    await backgroundService.onTranslationStart(config.name);

    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    this.currentJob = {
      id: jobId,
      videoUrl,
      configName: config.name,
      configId: config.id,
      status: "processing",
      progress: {
        currentBatch: 1,
        totalBatches: 1,
        completedBatches: 0,
        status: "processing",
        batchStatuses: ["processing"],
      },
      keyStatus: null,
      result: null,
      error: null,
      startedAt: Date.now(),
      completedAt: null,
      partialResult: null,
      rangeStart: batchStart,
      rangeEnd: batchEnd,
      videoDuration,
      batchSettings: undefined,
      completedBatchRanges: [],
      existingTranslationId,
    };
    this.notify();

    const onKeyStatus: KeyStatusCallback = (status) => {
      if (this.currentJob && this.currentJob.id === jobId && !this.isAborted) {
        this.currentJob = {
          ...this.currentJob,
          keyStatus: status.message,
        };
        this.notify();
      }
    };

    try {
      // Translate only this batch
      // Skip timestamp adjustment here - replaceBatchInSrt will handle it
      const newBatchSrt = await translateVideoWithGemini(
        videoUrl,
        config,
        undefined,
        {
          videoDuration,
          rangeStart: batchStart,
          rangeEnd: batchEnd,
          abortSignal: this.abortController.signal,
          onKeyStatus,
          skipTimestampAdjust: true, // replaceBatchInSrt will adjust timestamps
        }
      );

      if (this.isAborted) {
        throw new Error("Đã dừng dịch");
      }

      // Replace this batch in existing SRT (also cleans up subtitles exceeding video duration)
      const { replaceBatchInSrt } = await import("@utils/srtParser");
      const updatedSrt = replaceBatchInSrt(
        existingSrt,
        newBatchSrt,
        batchStart,
        batchEnd,
        videoDuration // Pass video duration to clean up out-of-range subtitles
      );

      // Save translation - update existing if ID provided, otherwise create new
      await saveTranslation(
        videoUrl,
        updatedSrt,
        config.name,
        existingTranslationId,
        config.presetId,
        {
          videoDuration,
        }
      );

      if (this.currentJob && this.currentJob.id === jobId && !this.isAborted) {
        this.currentJob = {
          ...this.currentJob,
          status: "completed",
          result: updatedSrt,
          keyStatus: null,
          completedAt: Date.now(),
        };
        this.notify();

        // Gửi notification khi dịch xong batch
        notificationService.notifyTranslationComplete(config.name, "direct");
      }

      return updatedSrt;
    } catch (error: any) {
      if (!this.isAborted && this.currentJob && this.currentJob.id === jobId) {
        this.currentJob = {
          ...this.currentJob,
          status: "error",
          error: error.message || "Có lỗi xảy ra",
          completedAt: Date.now(),
        };
        this.notify();

        // Gửi notification khi lỗi
        notificationService.notifyTranslationError(
          config.name,
          error.message,
          "direct"
        );
      }
      throw error;
    } finally {
      this.abortController = null;
      // Stop background service
      // Skip nếu được gọi từ queue (queue tự quản lý background)
      if (!this.skipBackgroundControl) {
        backgroundService.onTranslationComplete();
      }
    }
  }
}

export const translationManager = TranslationManager.getInstance();
