import type {
  GeminiConfig,
  BatchSettings,
  BatchProgress,
  TranslationJob,
  KeyStatusCallback,
} from "@src/types";
import { saveTranslation, savePartialTranslation } from "@utils/storage";
import { translateVideoWithGemini } from "./geminiService";

type TranslationListener = (job: TranslationJob) => void;

class TranslationManager {
  private static instance: TranslationManager;
  private currentJob: TranslationJob | null = null;
  private listeners: Set<TranslationListener> = new Set();
  private abortController: AbortController | null = null;
  private isAborted: boolean = false;

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

    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    this.currentJob = {
      id: jobId,
      videoUrl,
      configName: config.name,
      configId: config.id,
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
          onBatchProgress: (progress: BatchProgress) => {
            if (
              this.currentJob &&
              this.currentJob.id === jobId &&
              !this.isAborted
            ) {
              this.currentJob = {
                ...this.currentJob,
                progress,
              };
              this.notify();
            }
          },
          onKeyStatus,
          onBatchComplete: (
            partialSrt: string,
            _batchIndex: number,
            _totalBatches: number,
            newCompletedRanges: Array<{ start: number; end: number }>
          ) => {
            if (
              this.currentJob &&
              this.currentJob.id === jobId &&
              !this.isAborted
            ) {
              accumulatedSrt = partialSrt;
              completedRanges = newCompletedRanges;
              this.currentJob = {
                ...this.currentJob,
                partialResult: partialSrt,
                completedBatchRanges: newCompletedRanges,
              };
              this.notify();
            }
          },
        }
      );

      if (this.isAborted) {
        throw new Error("Đã dừng dịch");
      }

      await saveTranslation(videoUrl, result, config.name);

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
              }
            );
            const { cacheService } = await import("./cacheService");
            await cacheService.forceFlush();
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
        }
      }
      // If aborted, job status was already updated in abortTranslation()

      throw error;
    } finally {
      this.abortController = null;
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
          }
        );
        // Force flush to persist immediately
        const { cacheService } = await import("./cacheService");
        await cacheService.forceFlush();
        console.log(
          "[TranslationManager] Saved partial translation immediately:",
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

    // Abort the signal (this will eventually trigger catch block, but we don't wait)
    if (this.abortController) {
      this.abortController.abort();
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
    this.notify();

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
}

export const translationManager = TranslationManager.getInstance();
