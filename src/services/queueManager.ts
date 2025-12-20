/**
 * Translation Queue Manager - Quản lý danh sách video cần dịch
 * Kiểu MAL: Chưa dịch (Plan to Watch), Đang dịch (Watching), Đã dịch (Completed)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QueueItem, QueueStatus } from "@src/types";
import { translationManager } from "./translationManager";
import { getActiveGeminiConfig, getBatchSettings } from "@utils/storage";

// Re-export types for backward compatibility
export type { QueueItem, QueueStatus } from "@src/types";

const QUEUE_STORAGE_KEY = "@translation_queue";
const PAGE_SIZE = 10;

type QueueListener = (items: QueueItem[]) => void;

class QueueManager {
  private static instance: QueueManager;
  private items: QueueItem[] = [];
  private listeners: Set<QueueListener> = new Set();
  private isProcessing = false;
  private initialized = false;
  private autoProcessEnabled = false; // Flag to track if auto-process is active
  private userStoppedItemId: string | null = null; // Track item being stopped by user

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

  // Add video to queue - returns result with status info
  async addToQueue(
    videoUrl: string,
    title?: string,
    duration?: number
  ): Promise<{ item: QueueItem; isExisting: boolean; pendingCount: number }> {
    const videoId = this.extractVideoId(videoUrl);

    // Check if already exists
    const existing = this.items.find((i) => i.videoId === videoId);
    if (existing) {
      const pendingCount = this.items.filter(
        (i) => i.status === "pending"
      ).length;
      return { item: existing, isExisting: true, pendingCount };
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

    const pendingCount = this.items.filter(
      (i) => i.status === "pending"
    ).length;
    return { item, isExisting: false, pendingCount };
  }

  // Start translation for a single item - adds to translating queue and processes
  async startTranslation(itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return;

    // If item is already completed or currently translating, skip
    if (item.status === "completed" || item.status === "translating") return;

    // Enable auto-process mode so it continues after this item
    this.autoProcessEnabled = true;

    // Mark as translating (add to queue)
    await this.updateItem(itemId, {
      status: "translating",
      startedAt: Date.now(),
      error: undefined,
    });

    // If already processing another video, this item will be picked up automatically
    if (this.isProcessing) {
      console.log(
        "[QueueManager] Added to translation queue, will process after current"
      );
      return;
    }

    // Start processing this item
    await this.processItem(item);
  }

  // Internal: Process a specific item
  private async processItem(item: QueueItem): Promise<void> {
    if (this.isProcessing) return;

    const config = await getActiveGeminiConfig();
    if (!config) {
      await this.updateItem(item.id, {
        status: "error",
        error: "Chưa chọn kiểu dịch",
      });
      this.processNextInQueue();
      return;
    }

    const batchSettings = await getBatchSettings();
    this.isProcessing = true;

    // Keep existing startedAt to maintain order, only set if not exists
    await this.updateItem(item.id, {
      status: "translating",
      startedAt: item.startedAt || Date.now(),
      configName: config.name,
      error: undefined,
    });

    // Subscribe to translation progress
    const unsubscribe = translationManager.subscribe((job) => {
      if (job.videoUrl === item.videoUrl) {
        if (job.progress) {
          this.updateItem(item.id, {
            progress: {
              completed: job.progress.completedBatches,
              total: job.progress.totalBatches,
            },
          });
        }

        if (job.status === "completed") {
          this.updateItem(item.id, {
            status: "completed",
            completedAt: Date.now(),
            progress: undefined,
          });
          this.isProcessing = false;
          unsubscribe();
          this.processNextInQueue();
        }

        if (job.status === "error") {
          // Check if this was a user-initiated stop
          const wasUserStopped = this.userStoppedItemId === item.id;
          if (wasUserStopped) {
            // User stopped - don't update status (already set to pending) and don't process next
            this.userStoppedItemId = null;
            this.isProcessing = false;
            unsubscribe();
            return;
          }

          this.updateItem(item.id, {
            status: "error",
            error: job.error || "Có lỗi xảy ra",
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

  // Process next item in queue (translating status first by startedAt order)
  private async processNextInQueue(): Promise<void> {
    // First, check for items already marked as "translating" (in queue)
    // Sort by startedAt to process in order they were added to translating
    const translatingItems = this.items
      .filter((i) => i.status === "translating")
      .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));

    const nextTranslating = translatingItems[0];

    if (nextTranslating && !this.isProcessing) {
      setTimeout(() => this.processItem(nextTranslating), 2000);
      return;
    }

    // If auto-process is enabled, also pick up pending items
    if (this.autoProcessEnabled && !this.isProcessing) {
      const nextPending = this.items.find((i) => i.status === "pending");
      if (nextPending) {
        // Mark as translating first
        await this.updateItem(nextPending.id, {
          status: "translating",
          startedAt: Date.now(),
        });
        setTimeout(() => this.processItem(nextPending), 2000);
      } else {
        // No more items to process, disable auto-process
        this.autoProcessEnabled = false;
      }
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
        return (a.startedAt || 0) - (b.startedAt || 0); // FIFO order for translating
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

  // Start auto processing - mark ALL pending/error as translating and process sequentially
  async startAutoProcess(): Promise<void> {
    // Get all pending and error items sorted by addedAt descending (same order as displayed in pending tab)
    const pendingItems = this.items
      .filter((i) => i.status === "pending" || i.status === "error")
      .sort((a, b) => b.addedAt - a.addedAt);

    if (pendingItems.length === 0) return;

    // Enable auto-process mode
    this.autoProcessEnabled = true;

    // Mark ALL pending/error items as "translating" (in queue) with sequential startedAt
    // First item in display order gets smallest startedAt
    const baseTime = Date.now();
    for (let i = 0; i < pendingItems.length; i++) {
      await this.updateItem(pendingItems[i].id, {
        status: "translating",
        startedAt: baseTime + i, // Sequential timestamps to maintain order
        error: undefined,
      });
    }

    // If not already processing, start with the first one
    if (!this.isProcessing) {
      // Get first item by startedAt order (smallest = first in display)
      const translatingItems = this.items
        .filter((i) => i.status === "translating")
        .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));

      if (translatingItems[0]) {
        await this.processItem(translatingItems[0]);
      }
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

  // Stop translation - move back to pending
  async stopTranslation(itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item || item.status !== "translating") return;

    // Set flag to indicate user-initiated stop
    this.userStoppedItemId = itemId;

    // Move back to pending first (before abort triggers error callback)
    await this.updateItem(itemId, {
      status: "pending",
      error: undefined,
      progress: undefined,
      startedAt: undefined,
    });

    // If this item is currently being processed, abort it
    if (this.isProcessing) {
      const aborted = translationManager.abortTranslation(item.videoUrl);
      if (aborted) {
        this.isProcessing = false;
      }
    }
  }

  // Abort and remove from queue
  async abortAndRemove(itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return;

    // If this item is currently being processed, abort it
    if (item.status === "translating" && this.isProcessing) {
      const aborted = translationManager.abortTranslation(item.videoUrl);
      if (aborted) {
        this.isProcessing = false;
      }
    }

    // Remove from queue
    this.items = this.items.filter((i) => i.id !== itemId);
    await this.save();
    this.notify();

    // Process next if auto-process is enabled
    if (this.autoProcessEnabled) {
      this.processNextInQueue();
    }
  }

  // Check if a specific item is currently being processed
  isCurrentlyProcessing(itemId: string): boolean {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return false;
    return (
      item.status === "translating" &&
      this.isProcessing &&
      translationManager.isTranslatingUrl(item.videoUrl)
    );
  }

  // Remove completed video from queue (called when all translations are deleted)
  async removeCompletedVideo(videoUrl: string): Promise<void> {
    const videoId = this.extractVideoId(videoUrl);
    const item = this.items.find((i) => i.videoId === videoId);

    // Only remove if video is in completed status
    if (item && item.status === "completed") {
      this.items = this.items.filter((i) => i.id !== item.id);
      await this.save();
      this.notify();
    }
  }
}

export const queueManager = QueueManager.getInstance();
