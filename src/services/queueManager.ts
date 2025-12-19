/**
 * Translation Queue Manager - Quản lý danh sách video cần dịch
 * Kiểu MAL: Chưa dịch (Plan to Watch), Đang dịch (Watching), Đã dịch (Completed)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translationManager } from "./translationManager";
import { getActiveGeminiConfig, getBatchSettings } from "@utils/storage";

const QUEUE_STORAGE_KEY = "@translation_queue";
const PAGE_SIZE = 10;

export type QueueStatus = "pending" | "translating" | "completed" | "error";

export interface QueueItem {
  id: string;
  videoUrl: string;
  videoId: string;
  title: string;
  thumbnail: string;
  duration?: number;
  status: QueueStatus;
  configName?: string;
  progress?: { completed: number; total: number };
  error?: string;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
}

type QueueListener = (items: QueueItem[]) => void;

class QueueManager {
  private static instance: QueueManager;
  private items: QueueItem[] = [];
  private listeners: Set<QueueListener> = new Set();
  private isProcessing = false;
  private initialized = false;

  private constructor() {}

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      const data = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (data) {
        this.items = JSON.parse(data);
        // Reset any stuck "translating" items to "pending"
        this.items = this.items.map((item) =>
          item.status === "translating"
            ? { ...item, status: "pending" as QueueStatus }
            : item
        );
      }

      await this.save();
      this.initialized = true;
      this.notify();
    } catch (e) {
      console.error("[QueueManager] Init error:", e);
    }
  }

  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.error("[QueueManager] Save error:", e);
    }
  }

  private notify(): void {
    this.listeners.forEach((l) => l([...this.items]));
  }

  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener([...this.items]);
    return () => this.listeners.delete(listener);
  }

  // Extract video ID from URL
  private extractVideoId(url: string): string {
    const patterns = [
      /youtu\.be\/([a-zA-Z0-9_-]+)/,
      /[?&]v=([a-zA-Z0-9_-]+)/,
      /\/shorts\/([a-zA-Z0-9_-]+)/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return url;
  }

  // Add video to queue
  async addToQueue(
    videoUrl: string,
    title?: string,
    duration?: number
  ): Promise<QueueItem | null> {
    const videoId = this.extractVideoId(videoUrl);

    // Check if already exists
    const existing = this.items.find((i) => i.videoId === videoId);
    if (existing) {
      return existing;
    }

    const item: QueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      videoUrl,
      videoId,
      title: title || `Video ${videoId}`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      duration,
      status: "pending",
      addedAt: Date.now(),
    };

    this.items.unshift(item);
    await this.save();
    this.notify();
    return item;
  }

  // Move item to translating and start
  async startTranslation(itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item || item.status === "translating") return;

    // Check if already translating another
    if (this.isProcessing) {
      console.log("[QueueManager] Already processing, queued");
      return;
    }

    const config = await getActiveGeminiConfig();
    if (!config) {
      this.updateItem(itemId, {
        status: "error",
        error: "Chưa có cấu hình Gemini",
      });
      return;
    }

    const batchSettings = await getBatchSettings();
    this.isProcessing = true;

    this.updateItem(itemId, {
      status: "translating",
      startedAt: Date.now(),
      configName: config.name,
      error: undefined,
    });

    // Subscribe to translation progress
    const unsubscribe = translationManager.subscribe((job) => {
      if (job.videoUrl === item.videoUrl) {
        if (job.progress) {
          this.updateItem(itemId, {
            progress: {
              completed: job.progress.completedBatches,
              total: job.progress.totalBatches,
            },
          });
        }

        if (job.status === "completed") {
          this.updateItem(itemId, {
            status: "completed",
            completedAt: Date.now(),
            progress: undefined,
          });
          this.isProcessing = false;
          unsubscribe();
          this.processNextInQueue();
        }

        if (job.status === "error") {
          this.updateItem(itemId, {
            status: "error",
            error: job.error || "Lỗi không xác định",
            progress: undefined,
          });
          this.isProcessing = false;
          unsubscribe();
          this.processNextInQueue();
        }
      }
    });

    try {
      await translationManager.startTranslation(
        item.videoUrl,
        config,
        item.duration,
        batchSettings
      );
    } catch (e: any) {
      // Error handled in subscription
    }
  }

  // Process next pending item
  private async processNextInQueue(): Promise<void> {
    const next = this.items.find((i) => i.status === "pending");
    if (next) {
      // Small delay before next
      setTimeout(() => this.startTranslation(next.id), 2000);
    }
  }

  // Update item
  private async updateItem(
    itemId: string,
    updates: Partial<QueueItem>
  ): Promise<void> {
    this.items = this.items.map((i) =>
      i.id === itemId ? { ...i, ...updates } : i
    );
    await this.save();
    this.notify();
  }

  // Move to pending (re-queue)
  async moveToPending(itemId: string): Promise<void> {
    await this.updateItem(itemId, {
      status: "pending",
      error: undefined,
      progress: undefined,
      startedAt: undefined,
      completedAt: undefined,
    });
  }

  // Remove from queue
  async removeFromQueue(itemId: string): Promise<void> {
    this.items = this.items.filter((i) => i.id !== itemId);
    await this.save();
    this.notify();
  }

  // Get items by status with pagination
  getItemsByStatus(
    status: QueueStatus | "all",
    page: number = 1
  ): { items: QueueItem[]; total: number; totalPages: number } {
    let filtered =
      status === "all"
        ? this.items
        : this.items.filter((i) => i.status === status);

    // Sort by time
    filtered.sort((a, b) => {
      if (status === "completed")
        return (b.completedAt || 0) - (a.completedAt || 0);
      if (status === "translating")
        return (b.startedAt || 0) - (a.startedAt || 0);
      return b.addedAt - a.addedAt;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const start = (page - 1) * PAGE_SIZE;
    const items = filtered.slice(start, start + PAGE_SIZE);

    return { items, total, totalPages };
  }

  // Get counts
  getCounts(): {
    pending: number;
    translating: number;
    completed: number;
    error: number;
  } {
    return {
      pending: this.items.filter((i) => i.status === "pending").length,
      translating: this.items.filter((i) => i.status === "translating").length,
      completed: this.items.filter((i) => i.status === "completed").length,
      error: this.items.filter((i) => i.status === "error").length,
    };
  }

  // Check if video is in queue
  isInQueue(videoUrl: string): QueueItem | undefined {
    const videoId = this.extractVideoId(videoUrl);
    return this.items.find((i) => i.videoId === videoId);
  }

  // Start auto processing
  async startAutoProcess(): Promise<void> {
    if (this.isProcessing) return;
    const next = this.items.find((i) => i.status === "pending");
    if (next) {
      await this.startTranslation(next.id);
    }
  }

  // Mark video as completed (only if already in queue)
  async markVideoCompleted(
    videoUrl: string,
    configName?: string
  ): Promise<void> {
    const videoId = this.extractVideoId(videoUrl);
    const item = this.items.find((i) => i.videoId === videoId);

    if (item && item.status !== "completed") {
      await this.updateItem(item.id, {
        status: "completed",
        completedAt: Date.now(),
        configName: configName || item.configName,
        progress: undefined,
        error: undefined,
      });
    }
  }

  // Update video progress (called when translating outside of queue)
  async updateVideoProgress(
    videoUrl: string,
    progress: { completed: number; total: number } | null,
    configName?: string
  ): Promise<void> {
    const videoId = this.extractVideoId(videoUrl);
    const item = this.items.find((i) => i.videoId === videoId);
    if (item) {
      await this.updateItem(item.id, {
        status: "translating",
        progress: progress || undefined,
        configName: configName || item.configName,
        startedAt: item.startedAt || Date.now(),
      });
    }
  }

  // Mark video as error
  async markVideoError(videoUrl: string, error: string): Promise<void> {
    const videoId = this.extractVideoId(videoUrl);
    const item = this.items.find((i) => i.videoId === videoId);
    if (item) {
      await this.updateItem(item.id, {
        status: "error",
        error,
        progress: undefined,
      });
    }
  }

  // Clear all items by status
  async clearByStatus(status: QueueStatus): Promise<void> {
    this.items = this.items.filter((i) => i.status !== status);
    await this.save();
    this.notify();
  }

  // Clear pending and error items
  async clearPending(): Promise<void> {
    this.items = this.items.filter(
      (i) => i.status !== "pending" && i.status !== "error"
    );
    await this.save();
    this.notify();
  }
}

export const queueManager = QueueManager.getInstance();
