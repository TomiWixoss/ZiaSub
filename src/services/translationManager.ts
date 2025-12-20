import type {
  GeminiConfig,
  BatchSettings,
  BatchProgress,
  TranslationJob,
  KeyStatusCallback,
} from "@src/types";
import { saveTranslation } from "@utils/storage";
import { translateVideoWithGemini } from "./geminiService";

type TranslationListener = (job: TranslationJob) => void;

class TranslationManager {
  private static instance: TranslationManager;
  private currentJob: TranslationJob | null = null;
  private listeners: Set<TranslationListener> = new Set();
  private abortController: AbortController | null = null;

  private constructor() {}

  static getInstance(): TranslationManager {
    if (!TranslationManager.instance) {
      TranslationManager.instance = new TranslationManager();
    }
    return TranslationManager.instance;
  }

  subscribe(listener: TranslationListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
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
    rangeEnd?: number
  ): Promise<string> {
    // Check if already translating this URL
    if (this.isTranslatingUrl(videoUrl)) {
      throw new Error("Video này đang dịch rồi");
    }

    // Check if another video is being translated
    if (this.isTranslating()) {
      throw new Error("Đang dịch video khác, vui lòng đợi hoặc dừng trước");
    }

    // Create new job
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    this.currentJob = {
      id: jobId,
      videoUrl,
      configName: config.name,
      status: "processing",
      progress: null,
      keyStatus: null,
      result: null,
      error: null,
      startedAt: Date.now(),
      completedAt: null,
      partialResult: null,
      rangeStart,
      rangeEnd,
    };
    this.notify();

    // Key status callback
    const onKeyStatus: KeyStatusCallback = (status) => {
      if (this.currentJob && this.currentJob.id === jobId) {
        this.currentJob = {
          ...this.currentJob,
          keyStatus: status.message,
        };
        this.notify();
      }
    };

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
          onBatchProgress: (progress: BatchProgress) => {
            if (this.currentJob && this.currentJob.id === jobId) {
              this.currentJob = {
                ...this.currentJob,
                progress,
              };
              this.notify();
            }
          },
          onKeyStatus,
          // Streaming mode callback - update partial result as each batch completes
          onBatchComplete: (
            partialSrt: string,
            batchIndex: number,
            totalBatches: number
          ) => {
            if (this.currentJob && this.currentJob.id === jobId) {
              this.currentJob = {
                ...this.currentJob,
                partialResult: partialSrt,
              };
              this.notify();
            }
          },
        }
      );

      // Save translation to storage
      await saveTranslation(videoUrl, result, config.name);

      // Update job with result
      if (this.currentJob && this.currentJob.id === jobId) {
        this.currentJob = {
          ...this.currentJob,
          status: "completed",
          result,
          partialResult: null,
          keyStatus: null,
          completedAt: Date.now(),
        };
        this.notify();
      }

      return result;
    } catch (error: any) {
      // Update job with error
      if (this.currentJob && this.currentJob.id === jobId) {
        this.currentJob = {
          ...this.currentJob,
          status: "error",
          error: error.message || "Có lỗi xảy ra",
          completedAt: Date.now(),
        };
        this.notify();
      }
      throw error;
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

  // Abort current translation
  abortTranslation(videoUrl?: string): boolean {
    if (!this.currentJob || this.currentJob.status !== "processing") {
      return false;
    }

    // If videoUrl specified, only abort if it matches
    if (videoUrl && this.currentJob.videoUrl !== videoUrl) {
      return false;
    }

    // Abort the request
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Update job status
    this.currentJob = {
      ...this.currentJob,
      status: "error",
      error: "Đã dừng dịch",
      completedAt: Date.now(),
    };
    this.notify();
    return true;
  }

  // Check if can abort
  canAbort(videoUrl?: string): boolean {
    if (!this.currentJob || this.currentJob.status !== "processing") {
      return false;
    }
    if (videoUrl && this.currentJob.videoUrl !== videoUrl) {
      return false;
    }
    return true;
  }
}

export const translationManager = TranslationManager.getInstance();
