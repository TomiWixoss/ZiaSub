import { GeminiConfig, BatchSettings, saveTranslation } from "@utils/storage";
import { translateVideoWithGemini, BatchProgress } from "./geminiService";
import { KeyStatusCallback } from "./keyManager";

export interface TranslationJob {
  id: string;
  videoUrl: string;
  configName: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: BatchProgress | null;
  keyStatus: string | null;
  result: string | null;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
}

type TranslationListener = (job: TranslationJob) => void;

class TranslationManager {
  private static instance: TranslationManager;
  private currentJob: TranslationJob | null = null;
  private listeners: Set<TranslationListener> = new Set();

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
    batchSettings?: BatchSettings
  ): Promise<string> {
    // Check if already translating this URL
    if (this.isTranslatingUrl(videoUrl)) {
      throw new Error("Video này đang được dịch");
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
          error: error.message || "Lỗi không xác định",
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
}

export const translationManager = TranslationManager.getInstance();
