/**
 * Translation Queue Manager - Quản lý danh sách video cần dịch
 * Kiểu MAL: Chưa dịch (Plan to Watch), Đang dịch (Watching), Đã dịch (Completed)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QueueItem, QueueStatus } from "@src/types";
import { translationManager } from "./translationManager";
import { notificationService } from "./notificationService";
import { backgroundService } from "./backgroundService";
import {
  getActiveGeminiConfig,
  getBatchSettings,
  getGeminiConfigs,
  getPartialTranslation,
} from "@utils/storage";

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
  private translationManagerUnsubscribe: (() => void) | null = null; // Track subscription
  private currentProcessingItemId: string | null = null; // Track which item is being processed
  private userPausedItems: Set<string> = new Set(); // Track items paused by user (won't auto-resume)
  private queueStartCompletedCount: number = 0; // Track completed count when queue started
  private directTranslationVideoUrl: string | null = null; // Track video being translated directly (not from queue)
  private removingItemId: string | null = null; // Track item being removed (to skip subscription handling)

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
        // Reset stuck "translating" items to "paused" - they were interrupted by app restart
        // This allows user to resume them later
        this.items = this.items.map((item) => {
          if (item.status === "translating") {
            // Move all translating items to paused (was interrupted by app restart)
            // Keep all existing data (partial, config, etc.) for resume
            return {
              ...item,
              status: "paused" as QueueStatus,
              // Only set completedBatches if not present (don't override totalBatches)
              completedBatches: item.completedBatches ?? 0,
            };
          }
          return item;
        });
      }

      await this.save();
      this.initialized = true;
      this.notify();

      // Subscribe to translationManager to know when it becomes free
      // Only subscribe once - unsubscribe first if already subscribed
      if (this.translationManagerUnsubscribe) {
        this.translationManagerUnsubscribe();
        this.translationManagerUnsubscribe = null;
      }
      this.subscribeToTranslationManager();
    } catch (e) {
      console.error("[QueueManager] Init error:", e);
    }
  }

  // Subscribe to translationManager to detect when it becomes free
  // NOTE: This is only for logging/debugging - actual queue continuation is handled in processItem's subscription
  private subscribeToTranslationManager(): void {
    this.translationManagerUnsubscribe = translationManager.subscribe((job) => {
      // Skip if job is null or missing videoUrl
      if (!job || !job.videoUrl) return;

      // When a job completes or errors, check if it was a direct translation
      if (job.status === "completed" || job.status === "error") {
        const isQueueItem = this.items.some(
          (item) =>
            item.videoUrl === job.videoUrl && item.status === "translating"
        );

        if (!isQueueItem) {
          // Direct translation finished
          console.log("[QueueManager] Direct translation finished");

          // Clear direct translation tracking
          if (this.directTranslationVideoUrl === job.videoUrl) {
            this.directTranslationVideoUrl = null;
          }

          // If there are items in queue that were waiting, start processing them
          // This works even if autoProcessEnabled is false - we process waiting items
          const waitingItems = this.items.filter(
            (i) => i.status === "translating" && !this.userPausedItems.has(i.id)
          );
          if (waitingItems.length > 0) {
            console.log(
              "[QueueManager] Direct translation done, continuing queue with",
              waitingItems.length,
              "items"
            );
            // Enable auto-process to continue with remaining items
            this.autoProcessEnabled = true;
            setTimeout(() => this.processNextInQueue(), 1000);
          }
        }
        // Note: Queue item completion is handled by processItem's subscription
      }
    });
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
  // If busy, will add to queue instead of returning error
  // Returns: { success: boolean, reason?: string, queued?: boolean }
  async startTranslation(
    itemId: string,
    isResume: boolean = false
  ): Promise<{ success: boolean; reason?: string; queued?: boolean }> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return { success: false, reason: "not_found" };

    // If item is already completed, skip (unless it has partial data and isResume)
    if (item.status === "completed")
      return { success: false, reason: "completed" };

    // If currently translating without partial data, skip
    if (item.status === "translating" && !item.partialSrt && !isResume)
      return { success: false, reason: "already_translating" };

    // Clear userStoppedItemId if it matches this item (user is starting/resuming after stopping)
    if (this.userStoppedItemId === itemId) {
      this.userStoppedItemId = null;
    }

    // Get current config and batch settings to save (only if not already set)
    let configToSave: Partial<QueueItem> = {};
    if (!item.configId || !item.batchSettings) {
      const activeConfig = await getActiveGeminiConfig();
      const currentBatchSettings = await getBatchSettings();
      if (!item.configId && activeConfig) {
        configToSave.configId = activeConfig.id;
        configToSave.configName = activeConfig.name;
        configToSave.presetId = activeConfig.presetId;
      }
      if (!item.batchSettings && currentBatchSettings) {
        configToSave.batchSettings = currentBatchSettings;
      }
    }

    // Check if translationManager is busy with another video
    // Instead of returning error, add to queue
    if (translationManager.isTranslating() || this.isProcessing) {
      console.log(
        "[QueueManager] Busy, adding item to translating queue instead"
      );

      // Mark as translating (waiting in queue) and save config
      await this.updateItem(itemId, {
        status: "translating",
        startedAt: Date.now(),
        error: undefined,
        ...configToSave,
      });

      // Enable auto-process so this item will be picked up when current finishes
      this.autoProcessEnabled = true;

      return { success: true, queued: true };
    }

    // Mark as translating (add to queue) and save config
    await this.updateItem(itemId, {
      status: "translating",
      startedAt: item.startedAt || Date.now(),
      error: undefined,
      ...configToSave,
    });

    // Start processing this item (don't enable auto-process for single item)
    await this.processItem(item, isResume);
    return { success: true };
  }

  // Resume translation for an item with partial data or paused item
  // Returns: { success: boolean, reason?: string, queued?: boolean }
  async resumeTranslation(
    itemId: string
  ): Promise<{ success: boolean; reason?: string; queued?: boolean }> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return { success: false, reason: "not_found" };

    // Clear from user paused items since user is manually resuming
    this.userPausedItems.delete(itemId);

    // Clear userStoppedItemId if it matches this item (user is resuming after stopping)
    if (this.userStoppedItemId === itemId) {
      this.userStoppedItemId = null;
    }

    // Check if has partial data to resume
    const hasPartialData = !!(
      item.partialSrt &&
      item.completedBatchRanges &&
      item.completedBatchRanges.length > 0
    );

    // For paused items without partial data (e.g., single-part video that was paused before starting)
    // Just start fresh translation
    return await this.startTranslation(itemId, hasPartialData);
  }

  // Internal: Process a specific item
  private async processItem(
    itemParam: QueueItem,
    isResume: boolean = false
  ): Promise<void> {
    if (this.isProcessing) {
      console.log("[QueueManager] Already processing, skipping processItem");
      return;
    }

    // Double-check translationManager is not busy
    if (translationManager.isTranslating()) {
      console.log(
        "[QueueManager] translationManager busy, skipping processItem"
      );
      return;
    }

    // Get the latest item data from this.items (itemParam might be stale)
    const item = this.items.find((i) => i.id === itemParam.id);
    if (!item) {
      console.log("[QueueManager] Item not found, skipping processItem");
      return;
    }

    // Check if this item was stopped by user - don't process it
    if (this.userStoppedItemId === item.id) {
      console.log("[QueueManager] Item was stopped by user, skipping");
      return;
    }

    // Check if we're already processing this exact item (prevent duplicate)
    if (this.currentProcessingItemId === item.id) {
      console.log(
        "[QueueManager] Already processing this item, skipping duplicate"
      );
      return;
    }

    // Auto-detect if should resume based on partial data
    const shouldResume =
      isResume ||
      !!(
        item.partialSrt &&
        item.completedBatchRanges &&
        item.completedBatchRanges.length > 0
      );

    // Get config - use saved configId if available (for resume or continuing), otherwise get active config
    let config = null;
    if (item.configId) {
      const configs = await getGeminiConfigs();
      config = configs.find((c) => c.id === item.configId) || null;
    }
    if (!config) {
      config = await getActiveGeminiConfig();
    }

    if (!config) {
      await this.updateItem(item.id, {
        status: "error",
        error: "Chưa chọn kiểu dịch",
      });
      // Only continue if auto-process enabled
      if (this.autoProcessEnabled) {
        this.processNextInQueue();
      }
      return;
    }

    // Use saved presetId if available (for resume/continue), otherwise use config's presetId
    const effectivePresetId = item.presetId ?? config.presetId;

    // Create effective config with saved presetId
    const effectiveConfig =
      effectivePresetId !== config.presetId
        ? { ...config, presetId: effectivePresetId }
        : config;

    const batchSettings = item.batchSettings || (await getBatchSettings());

    // Force streaming mode for queue items to support resume
    const queueBatchSettings = {
      ...batchSettings,
      streamingMode: true, // Always use streaming for queue to track partial results
    };

    this.isProcessing = true;
    this.currentProcessingItemId = item.id;

    // Start background service để giữ app chạy khi ở background
    await backgroundService.onTranslationStart(
      item.title || effectiveConfig.name
    );

    // Keep existing startedAt to maintain order, only set if not exists
    // Save presetId when starting translation (only if not already saved)
    await this.updateItem(item.id, {
      status: "translating",
      startedAt: item.startedAt || Date.now(),
      configName: effectiveConfig.name,
      configId: effectiveConfig.id,
      presetId: item.presetId ?? effectiveConfig.presetId, // Preserve saved presetId or save new one
      batchSettings: queueBatchSettings,
      error: undefined,
    });

    // Prepare resume data if available
    let resumeData:
      | {
          partialSrt: string;
          completedBatchRanges: Array<{ start: number; end: number }>;
          existingTranslationId?: string;
        }
      | undefined;

    if (shouldResume && item.partialSrt && item.completedBatchRanges) {
      // Try to get existing translation ID from storage
      let existingTranslationId = item.savedTranslationId;
      if (!existingTranslationId) {
        // Fallback: find partial translation in storage
        const partialTranslation = await getPartialTranslation(
          item.videoUrl,
          effectiveConfig.name
        );
        existingTranslationId = partialTranslation?.id;
      }

      resumeData = {
        partialSrt: item.partialSrt,
        completedBatchRanges: item.completedBatchRanges,
        existingTranslationId,
      };
    }

    // Clear any completed/error job for this video before starting new one
    // This prevents the subscription from receiving old job notifications
    translationManager.clearCompletedJob(item.videoUrl);

    // Subscribe to translation progress
    let hasUnsubscribed = false;
    let jobStarted = false; // Track if new job has started
    const currentItemId = item.id; // Capture item ID for this subscription
    const safeUnsubscribe = () => {
      if (!hasUnsubscribed) {
        hasUnsubscribed = true;
        unsubscribe();
      }
    };
    const unsubscribe = translationManager.subscribe((job) => {
      // Skip if already unsubscribed or job is null
      if (hasUnsubscribed || !job || !job.videoUrl) return;

      // Skip notifications from old jobs (before our new job started)
      // This prevents processing error status from previous aborted job
      if (!jobStarted) {
        // Only mark jobStarted when we see a processing job for our video
        if (job.videoUrl === item.videoUrl && job.status === "processing") {
          jobStarted = true;
        } else {
          // Ignore this notification - it's from an old job
          return;
        }
      }

      if (job.videoUrl === item.videoUrl) {
        if (job.progress) {
          this.updateItem(currentItemId, {
            progress: {
              completed: job.progress.completedBatches,
              total: job.progress.totalBatches,
            },
            completedBatches: job.progress.completedBatches,
            totalBatches: job.progress.totalBatches,
          });

          // Update background notification progress
          backgroundService.updateProgress(
            job.progress.currentBatch,
            job.progress.totalBatches,
            item.title
          );
        }

        // Update partial result for streaming
        if (job.partialResult) {
          this.updateItem(currentItemId, {
            partialSrt: job.partialResult,
            completedBatchRanges: job.completedBatchRanges,
          });
        }

        if (job.status === "completed") {
          // Check if this was a user-initiated stop - if so, don't mark as completed
          if (this.userStoppedItemId === currentItemId) {
            safeUnsubscribe();
            return;
          }

          // Get item title for notification
          const completedItem = this.items.find((i) => i.id === currentItemId);
          const videoTitle = completedItem?.title || "Video";

          this.updateItem(currentItemId, {
            status: "completed",
            completedAt: Date.now(),
            progress: undefined,
            partialSrt: undefined,
            completedBatches: undefined,
            totalBatches: undefined,
            completedBatchRanges: undefined,
            // Clear batch retranslation mode
            retranslateBatchIndex: undefined,
            retranslateMode: undefined,
          });
          this.isProcessing = false;
          this.currentProcessingItemId = null;
          safeUnsubscribe();

          // Send notification when translation completes
          notificationService.notifyTranslationComplete(videoTitle, "queue");

          // Only continue to next item if auto-process is enabled (user clicked "Translate All")
          if (this.autoProcessEnabled) {
            console.log(
              "[QueueManager] Queue item completed, checking for next..."
            );
            // Check if there are more items to process
            const remainingItems = this.items.filter(
              (i) => i.status === "translating" || i.status === "pending"
            );
            if (remainingItems.length === 0) {
              // All done - send queue complete notification and stop background service
              // Calculate how many videos were completed since queue started
              const currentCompletedCount = this.items.filter(
                (i) => i.status === "completed"
              ).length;
              const completedInThisSession =
                currentCompletedCount - this.queueStartCompletedCount;
              notificationService.notifyQueueComplete(
                completedInThisSession > 0
                  ? completedInThisSession
                  : currentCompletedCount
              );
              backgroundService.onTranslationComplete();
            }
            this.processNextInQueue();
          } else {
            // Auto-process disabled (single item translation) - stop background service
            backgroundService.onTranslationComplete();
          }
        }

        if (job.status === "error") {
          // Check if this item is being removed - if so, skip handling
          // abortAndRemove will handle processNextInQueue
          if (this.removingItemId === currentItemId) {
            this.isProcessing = false;
            this.currentProcessingItemId = null;
            safeUnsubscribe();
            return;
          }

          // Check if this was a user-initiated stop - if so, stopTranslation already handled it
          const wasUserStopped = this.userStoppedItemId === currentItemId;
          if (wasUserStopped) {
            // User stopped - stopTranslation() already handled the state update and processNextInQueue
            // Just cleanup subscription and return - DON'T reset isProcessing here
            // stopTranslation will handle isProcessing reset after it finishes
            safeUnsubscribe();
            return;
          }

          // Get item title for notification
          const errorItem = this.items.find((i) => i.id === currentItemId);
          const videoTitle = errorItem?.title || "Video";

          // Error (not user stopped) - check for partial
          const hasPartial =
            job.partialResult &&
            job.completedBatchRanges &&
            job.completedBatchRanges.length > 0;
          if (hasPartial) {
            // Keep partial data for resume
            this.updateItem(currentItemId, {
              status: "translating",
              partialSrt: job.partialResult || undefined,
              completedBatches: job.completedBatchRanges?.length || 0,
              totalBatches: job.progress?.totalBatches || 0,
              completedBatchRanges: job.completedBatchRanges,
              progress: undefined, // Clear progress to show paused state
              error: job.error || "Có lỗi xảy ra",
            });
          } else {
            this.updateItem(currentItemId, {
              status: "error",
              error: job.error || "Có lỗi xảy ra",
              progress: undefined,
            });
            // Send error notification
            notificationService.notifyTranslationError(
              videoTitle,
              job.error || undefined,
              "queue"
            );
          }
          this.isProcessing = false;
          this.currentProcessingItemId = null;
          safeUnsubscribe();

          // Only continue to next item if auto-process is enabled (user clicked "Translate All")
          if (this.autoProcessEnabled) {
            console.log(
              "[QueueManager] Queue item errored, checking for next..."
            );
            // Check if there are more items to process
            const remainingItems = this.items.filter(
              (i) => i.status === "translating" || i.status === "pending"
            );
            if (remainingItems.length === 0) {
              // No more items - stop background service
              backgroundService.onTranslationStop();
            }
            this.processNextInQueue();
          } else {
            // Auto-process disabled (single item translation) - stop background service
            backgroundService.onTranslationStop();
          }
        }
      }
    });

    try {
      await translationManager.startTranslation(
        item.videoUrl,
        effectiveConfig,
        item.duration,
        queueBatchSettings,
        undefined,
        undefined,
        resumeData,
        undefined,
        { skipBackgroundControl: true, skipNotification: true } // Queue tự quản lý background và notification
      );
    } catch (e: any) {
      // Error handled in subscription
    }
  }

  // Process next item in queue (translating status first by startedAt order)
  private async processNextInQueue(): Promise<void> {
    // Only continue if auto-process is enabled
    if (!this.autoProcessEnabled) {
      return;
    }

    // Prevent concurrent calls
    if (this.isProcessing) {
      return;
    }

    // Check if translationManager is already busy (e.g., user translating directly)
    if (translationManager.isTranslating()) {
      return;
    }

    // First, check for items already marked as "translating" (in queue)
    // Sort by startedAt to process in order they were added to translating
    // Exclude items that were stopped/paused by user
    const translatingItems = this.items
      .filter(
        (i) =>
          i.status === "translating" &&
          i.id !== this.userStoppedItemId &&
          !this.userPausedItems.has(i.id)
      )
      .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));

    const nextTranslating = translatingItems[0];

    if (nextTranslating) {
      // processItem will auto-detect if should resume based on partial data
      console.log(
        "[QueueManager] Processing next translating item:",
        nextTranslating.videoId
      );
      setTimeout(() => this.processItem(nextTranslating), 2000);
      return;
    }

    // No more translating items - disable auto-process
    // Don't automatically pick up pending items - user must explicitly start them
    this.autoProcessEnabled = false;
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

  // Move to pending (re-queue) - clear old config so it uses new config when translated
  async moveToPending(itemId: string): Promise<void> {
    // Clear from user paused items
    this.userPausedItems.delete(itemId);

    await this.updateItem(itemId, {
      status: "pending",
      error: undefined,
      progress: undefined,
      startedAt: undefined,
      completedAt: undefined,
      // Clear config so it uses new config when translated again
      configId: undefined,
      configName: undefined,
      presetId: undefined,
      batchSettings: undefined,
      // Clear partial data
      partialSrt: undefined,
      completedBatches: undefined,
      totalBatches: undefined,
      completedBatchRanges: undefined,
    });
  }

  // Move to pending and mark as user-paused (won't auto-resume)
  // Keep config so it can resume with same settings
  async moveToPendingByUser(itemId: string): Promise<void> {
    // Add to user paused items to prevent auto-resume
    this.userPausedItems.add(itemId);

    await this.updateItem(itemId, {
      status: "pending",
      error: undefined,
      progress: undefined,
      startedAt: undefined,
      completedAt: undefined,
      // Keep config for resume - don't clear configId, configName, presetId, batchSettings
    });
  }

  // Remove from queue - also aborts if video is being translated
  async removeFromQueue(itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return;

    // Set flag to indicate this item is being removed
    // This prevents subscription from handling the abort error
    this.removingItemId = itemId;

    // If this video is currently being translated, abort it
    if (translationManager.isTranslatingUrl(item.videoUrl)) {
      const result = await translationManager.abortTranslation(item.videoUrl);
      if (result.aborted) {
        this.isProcessing = false;
        this.currentProcessingItemId = null;
        await backgroundService.onTranslationStop();
      }
    }

    // Clear from user paused items
    this.userPausedItems.delete(item.id);

    this.items = this.items.filter((i) => i.id !== itemId);
    await this.save();
    this.notify();

    // Clear the removing flag after a delay (to ensure subscription has processed)
    setTimeout(() => {
      if (this.removingItemId === itemId) {
        this.removingItemId = null;
      }
    }, 500);
  }

  // Remove from queue by video URL - also aborts if video is being translated
  async removeFromQueueByUrl(videoUrl: string): Promise<void> {
    const videoId = this.extractVideoId(videoUrl);
    const item = this.items.find((i) => i.videoId === videoId);
    if (!item) return;

    // Set flag to indicate this item is being removed
    // This prevents subscription from handling the abort error
    this.removingItemId = item.id;

    // If this video is currently being translated, abort it
    if (translationManager.isTranslatingUrl(item.videoUrl)) {
      const result = await translationManager.abortTranslation(item.videoUrl);
      if (result.aborted) {
        this.isProcessing = false;
        this.currentProcessingItemId = null;
        await backgroundService.onTranslationStop();
      }
    }

    // Clear from user paused items
    this.userPausedItems.delete(item.id);

    this.items = this.items.filter((i) => i.id !== item.id);
    await this.save();
    this.notify();

    // Clear the removing flag after a delay (to ensure subscription has processed)
    setTimeout(() => {
      if (this.removingItemId === item.id) {
        this.removingItemId = null;
      }
    }, 500);
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
      if (status === "paused") return (b.startedAt || 0) - (a.startedAt || 0); // Most recently paused first
      // Pending: oldest first (FIFO - video thêm trước hiện trước)
      return a.addedAt - b.addedAt;
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
    paused: number;
    completed: number;
    error: number;
  } {
    return {
      pending: this.items.filter((i) => i.status === "pending").length,
      translating: this.items.filter((i) => i.status === "translating").length,
      paused: this.items.filter((i) => i.status === "paused").length,
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
  // Returns: { success: boolean, reason?: string, queued?: boolean }
  async startAutoProcess(): Promise<{
    success: boolean;
    reason?: string;
    queued?: boolean;
  }> {
    // Clear all user paused items - user is starting fresh auto-process
    this.userPausedItems.clear();

    // Get all pending and error items sorted by addedAt ascending (FIFO - oldest first)
    const pendingItems = this.items
      .filter((i) => i.status === "pending" || i.status === "error")
      .sort((a, b) => a.addedAt - b.addedAt);

    if (pendingItems.length === 0) return { success: true };

    // Get current active config and batch settings to save for all items
    const activeConfig = await getActiveGeminiConfig();
    const currentBatchSettings = await getBatchSettings();

    // Enable auto-process mode
    this.autoProcessEnabled = true;

    // Record current completed count for notification later
    this.queueStartCompletedCount = this.items.filter(
      (i) => i.status === "completed"
    ).length;

    // Mark ALL pending/error items as "translating" (in queue) with sequential startedAt
    // Save current config for each item so they use the same settings when processed
    // First item in display order gets smallest startedAt
    const baseTime = Date.now();
    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      // Only save config if not already set (preserve existing config for items that were paused/resumed)
      await this.updateItem(item.id, {
        status: "translating",
        startedAt: baseTime + i, // Sequential timestamps to maintain order
        error: undefined,
        // Save config info only if not already set
        configId: item.configId || activeConfig?.id,
        configName: item.configName || activeConfig?.name,
        presetId: item.presetId ?? activeConfig?.presetId,
        batchSettings: item.batchSettings || currentBatchSettings,
      });
    }

    // Check if translationManager is busy with a direct translation (not from queue)
    if (translationManager.isTranslating()) {
      const currentJob = translationManager.getCurrentJob();
      if (currentJob) {
        const isQueueItem = this.items.some(
          (item) =>
            item.videoUrl === currentJob.videoUrl &&
            item.status === "translating"
        );

        if (!isQueueItem) {
          // Direct translation in progress - track it and wait
          this.directTranslationVideoUrl = currentJob.videoUrl;
          console.log(
            "[QueueManager] Direct translation in progress, queue items will start when it finishes"
          );
          return { success: true, queued: true };
        }
      }

      // Already processing a queue item
      console.log("[QueueManager] Already processing, items added to queue");
      return { success: true, queued: true };
    }

    // Check if already processing
    if (this.isProcessing) {
      console.log("[QueueManager] Already processing, items added to queue");
      return { success: true, queued: true };
    }

    // If not already processing, start with the first one
    // Get first item by startedAt order (smallest = first in display)
    const translatingItems = this.items
      .filter((i) => i.status === "translating")
      .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));

    if (translatingItems[0]) {
      await this.processItem(translatingItems[0]);
    }

    return { success: true };
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
        // Clear partial data
        partialSrt: undefined,
        completedBatches: undefined,
        totalBatches: undefined,
        completedBatchRanges: undefined,
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
      // Don't change status of completed items - they stay completed
      // This prevents duplicate translations when translating from direct tab
      if (item.status === "completed") {
        return;
      }
      await this.updateItem(item.id, {
        status: "translating",
        progress: progress || undefined,
        configName: configName || item.configName,
        startedAt: item.startedAt || Date.now(),
      });
    }
  }

  // Mark video as stopped/paused (user manually stopped)
  async markVideoStopped(
    videoUrl: string,
    partialData?: {
      partialSrt: string;
      completedBatchRanges: Array<{ start: number; end: number }>;
      completedBatches: number;
      totalBatches: number;
    }
  ): Promise<void> {
    const videoId = this.extractVideoId(videoUrl);
    const item = this.items.find((i) => i.videoId === videoId);
    if (!item) return;

    // Add to userPausedItems to prevent auto-resume
    this.userPausedItems.add(item.id);

    // Always move to paused status (whether has partial data or not)
    // Keep retranslateBatchIndex and retranslateMode for batch retranslation
    await this.updateItem(item.id, {
      status: "paused",
      progress: undefined, // Clear progress to show paused
      partialSrt: partialData?.partialSrt,
      completedBatchRanges: partialData?.completedBatchRanges,
      completedBatches: partialData?.completedBatches ?? 0,
      totalBatches: partialData?.totalBatches ?? 1,
      error: undefined,
      // Keep batch retranslation info for resume
      // retranslateBatchIndex and retranslateMode are preserved
    });
  }

  // Pause batch retranslation - move to paused status while keeping batch info
  async pauseBatchRetranslation(videoUrl: string): Promise<void> {
    const videoId = this.extractVideoId(videoUrl);
    const item = this.items.find((i) => i.videoId === videoId);
    if (!item || item.retranslateBatchIndex === undefined) return;

    // Add to userPausedItems to prevent auto-resume
    this.userPausedItems.add(item.id);

    // Move to paused status - keep retranslateBatchIndex and retranslateMode
    await this.updateItem(item.id, {
      status: "paused",
      progress: undefined,
      error: undefined,
      // Keep batch retranslation info
      // retranslateBatchIndex and retranslateMode are preserved automatically
    });
  }

  // Resume batch retranslation
  async resumeBatchRetranslation(
    videoUrl: string
  ): Promise<{ success: boolean; item?: QueueItem }> {
    const videoId = this.extractVideoId(videoUrl);
    const item = this.items.find((i) => i.videoId === videoId);
    if (!item || item.retranslateBatchIndex === undefined) {
      return { success: false };
    }

    // Clear from user paused items
    this.userPausedItems.delete(item.id);

    // Move back to translating status
    // Clear progress so getBatchRetranslationInfo can find it
    await this.updateItem(item.id, {
      status: "translating",
      startedAt: Date.now(),
      error: undefined,
      progress: undefined, // Clear progress to indicate waiting for resume
    });

    return { success: true, item: this.items.find((i) => i.id === item.id) };
  }

  // Get paused batch retranslation info for a video
  getPausedBatchRetranslation(videoUrl: string): QueueItem | null {
    const videoId = this.extractVideoId(videoUrl);
    const item = this.items.find(
      (i) =>
        i.videoId === videoId &&
        i.status === "paused" &&
        i.retranslateBatchIndex !== undefined
    );
    return item || null;
  }

  // Get batch retranslation info for a video (paused or waiting to be resumed)
  // This is used by TranslateTab to show resume button
  getBatchRetranslationInfo(videoUrl: string): QueueItem | null {
    const videoId = this.extractVideoId(videoUrl);
    // Check for paused batch retranslation
    const pausedItem = this.items.find(
      (i) =>
        i.videoId === videoId &&
        i.status === "paused" &&
        i.retranslateBatchIndex !== undefined
    );
    if (pausedItem) return pausedItem;

    // Check for translating batch retranslation that's waiting (no active job)
    // This happens after user clicks "Resume" in queue but hasn't started actual translation
    const translatingItem = this.items.find(
      (i) =>
        i.videoId === videoId &&
        i.status === "translating" &&
        i.retranslateBatchIndex !== undefined &&
        !i.progress // No progress means not actively translating
    );
    return translatingItem || null;
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

  // Stop translation - keep partial data if available
  async stopTranslation(itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item || item.status !== "translating") return;

    // Set flag to indicate user-initiated stop BEFORE any async operations
    this.userStoppedItemId = itemId;

    // Add to user paused items - this item won't auto-resume in processNextInQueue
    this.userPausedItems.add(itemId);

    // Save auto-process state BEFORE any changes
    const wasAutoProcessEnabled = this.autoProcessEnabled;

    // Check if this specific item is currently being processed by translationManager
    const isThisItemProcessing = translationManager.isTranslatingUrl(
      item.videoUrl
    );

    if (isThisItemProcessing) {
      // This item is actively being translated - abort it (now async)
      const result = await translationManager.abortTranslation(item.videoUrl);

      // Always reset processing state after abort attempt
      this.isProcessing = false;
      this.currentProcessingItemId = null;

      // Only stop background service if no more items to process in queue
      const remainingItems = this.items.filter(
        (i) =>
          (i.status === "translating" || i.status === "pending") &&
          i.id !== itemId &&
          !this.userPausedItems.has(i.id)
      );

      if (remainingItems.length === 0 || !wasAutoProcessEnabled) {
        await backgroundService.onTranslationStop();
      }

      // Check if has partial data
      if (
        result.partialResult &&
        result.completedRanges &&
        result.completedRanges.length > 0
      ) {
        // Move to paused with partial data
        await this.updateItem(itemId, {
          status: "paused",
          partialSrt: result.partialResult,
          completedBatchRanges: result.completedRanges,
          completedBatches: result.completedRanges.length,
          progress: undefined, // Clear progress to show paused state
          error: undefined,
        });
      } else {
        // No partial - move to paused anyway (video with single part)
        await this.updateItem(itemId, {
          status: "paused",
          completedBatches: 0,
          totalBatches: 1,
          error: undefined,
          progress: undefined,
        });
      }

      // Clear the user stopped flag after handling
      // Use setTimeout to ensure all callbacks have processed
      // Clear AFTER processNextInQueue delay (1500ms > 1000ms)
      setTimeout(() => {
        if (this.userStoppedItemId === itemId) {
          this.userStoppedItemId = null;
        }
      }, 1500);

      // Process next item in queue if auto-process was enabled
      if (wasAutoProcessEnabled) {
        // Small delay to ensure state is settled
        setTimeout(() => this.processNextInQueue(), 1000);
      }
    } else {
      // Item is in translating queue but not actively being processed
      // Move to paused status (waiting item, not started yet)
      await this.updateItem(itemId, {
        status: "paused",
        completedBatches: 0,
        totalBatches: 1,
        progress: undefined,
        error: undefined,
      });

      // Clear the user stopped flag after a delay
      setTimeout(() => {
        if (this.userStoppedItemId === itemId) {
          this.userStoppedItemId = null;
        }
      }, 1500);
    }
  }

  // Abort and remove from queue
  async abortAndRemove(itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return;

    // Set flag to indicate this item is being removed
    // This prevents subscription from handling the abort error
    this.removingItemId = itemId;
    const wasAutoProcessEnabled = this.autoProcessEnabled;

    // If this video is currently being translated (by queue or direct), abort it
    if (translationManager.isTranslatingUrl(item.videoUrl)) {
      const result = await translationManager.abortTranslation(item.videoUrl);
      if (result.aborted) {
        this.isProcessing = false;
        this.currentProcessingItemId = null;
        await backgroundService.onTranslationStop();
      }
    }

    // Clear from user paused items
    this.userPausedItems.delete(itemId);

    // Remove from queue
    this.items = this.items.filter((i) => i.id !== itemId);
    await this.save();
    this.notify();

    // Clear the removing flag after a delay (to ensure subscription has processed)
    setTimeout(() => {
      if (this.removingItemId === itemId) {
        this.removingItemId = null;
      }
    }, 500);

    // Process next if auto-process is enabled
    if (wasAutoProcessEnabled) {
      // Small delay to ensure state is settled
      setTimeout(() => this.processNextInQueue(), 1000);
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

  // Check if item can be resumed (has partial data)
  canResume(itemId: string): boolean {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) return false;
    return !!(
      item.status === "translating" &&
      item.partialSrt &&
      item.completedBatchRanges &&
      item.completedBatchRanges.length > 0 &&
      !this.isCurrentlyProcessing(itemId)
    );
  }

  // Check if a video is being removed from queue
  isBeingRemoved(videoUrl: string): boolean {
    if (!this.removingItemId) return false;
    const videoId = this.extractVideoId(videoUrl);
    const item = this.items.find((i) => i.videoId === videoId);
    return item?.id === this.removingItemId;
  }

  // Get partial SRT for an item
  getPartialSrt(itemId: string): string | undefined {
    const item = this.items.find((i) => i.id === itemId);
    return item?.partialSrt;
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

  // Stop all - abort current translation and pause entire queue
  async stopAll(): Promise<void> {
    // Disable auto-process immediately
    this.autoProcessEnabled = false;

    // Find currently translating item
    const currentItem = this.items.find(
      (i) =>
        i.status === "translating" &&
        translationManager.isTranslatingUrl(i.videoUrl)
    );

    if (currentItem) {
      // Abort current translation
      const result = await translationManager.abortTranslation(
        currentItem.videoUrl
      );
      if (result.aborted) {
        this.isProcessing = false;
        this.currentProcessingItemId = null;

        // Stop background service
        await backgroundService.onTranslationStop();

        // Add to paused items
        this.userPausedItems.add(currentItem.id);

        // Always move to paused status
        await this.updateItem(currentItem.id, {
          status: "paused",
          partialSrt: result.partialResult || currentItem.partialSrt,
          completedBatchRanges:
            result.completedRanges || currentItem.completedBatchRanges,
          completedBatches:
            result.completedRanges?.length || currentItem.completedBatches,
          progress: undefined,
          error: undefined,
        });
      }
    }

    // Move all other translating items (waiting in queue) to paused
    const waitingItems = this.items.filter(
      (i) => i.status === "translating" && i.id !== currentItem?.id
    );

    for (const item of waitingItems) {
      this.userPausedItems.add(item.id);
      await this.updateItem(item.id, {
        status: "paused",
        completedBatches: item.completedBatches || 0,
        totalBatches: item.totalBatches || 1,
        progress: undefined,
        error: undefined,
      });
    }

    console.log("[QueueManager] Stopped all - queue paused");
  }

  // Resume all paused items - move to translating queue and start processing
  async resumeAllPaused(): Promise<{
    success: boolean;
    reason?: string;
    queued?: boolean;
  }> {
    // Get all paused items
    const pausedItems = this.items
      .filter((i) => i.status === "paused")
      .sort((a, b) => (a.startedAt || a.addedAt) - (b.startedAt || b.addedAt));

    if (pausedItems.length === 0) return { success: true };

    // Clear from user paused items
    for (const item of pausedItems) {
      this.userPausedItems.delete(item.id);
    }

    // Enable auto-process mode
    this.autoProcessEnabled = true;

    // Record current completed count for notification later
    this.queueStartCompletedCount = this.items.filter(
      (i) => i.status === "completed"
    ).length;

    // Mark ALL paused items as "translating" (in queue) with sequential startedAt
    const baseTime = Date.now();
    for (let i = 0; i < pausedItems.length; i++) {
      await this.updateItem(pausedItems[i].id, {
        status: "translating",
        startedAt: baseTime + i,
        error: undefined,
      });
    }

    // Check if translationManager is busy
    if (translationManager.isTranslating() || this.isProcessing) {
      console.log("[QueueManager] Busy, paused items added to queue");
      return { success: true, queued: true };
    }

    // Start processing
    const translatingItems = this.items
      .filter((i) => i.status === "translating")
      .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));

    if (translatingItems[0]) {
      await this.processItem(translatingItems[0], true); // true = resume with partial data if available
    }

    return { success: true };
  }

  // Clear all translating items (abort current and remove all from queue)
  async clearTranslating(): Promise<void> {
    // Disable auto-process immediately
    this.autoProcessEnabled = false;

    // Find currently translating item
    const currentItem = this.items.find(
      (i) =>
        i.status === "translating" &&
        translationManager.isTranslatingUrl(i.videoUrl)
    );

    if (currentItem) {
      // Set removing flag
      this.removingItemId = currentItem.id;

      // Abort current translation
      const result = await translationManager.abortTranslation(
        currentItem.videoUrl
      );
      if (result.aborted) {
        this.isProcessing = false;
        this.currentProcessingItemId = null;
        await backgroundService.onTranslationStop();
      }

      // Clear removing flag after delay
      setTimeout(() => {
        if (this.removingItemId === currentItem.id) {
          this.removingItemId = null;
        }
      }, 500);
    }

    // Remove all translating items
    const translatingIds = this.items
      .filter((i) => i.status === "translating")
      .map((i) => i.id);

    for (const id of translatingIds) {
      this.userPausedItems.delete(id);
    }

    this.items = this.items.filter((i) => i.status !== "translating");
    await this.save();
    this.notify();

    console.log("[QueueManager] Cleared all translating items");
  }

  // Check if auto-process is currently enabled
  isAutoProcessing(): boolean {
    return this.autoProcessEnabled;
  }

  // Add or update video in queue when translating directly
  // This syncs the queue state with direct translation
  // forceRetranslate: if true, will change completed status to translating
  // retranslateBatchIndex & retranslateMode: for batch retranslation (single batch or fromHere)
  async syncDirectTranslation(
    videoUrl: string,
    title?: string,
    duration?: number,
    configName?: string,
    forceRetranslate: boolean = false,
    configId?: string,
    presetId?: string,
    batchSettings?: any,
    retranslateBatchIndex?: number,
    retranslateMode?: "single" | "fromHere"
  ): Promise<QueueItem> {
    const videoId = this.extractVideoId(videoUrl);
    let item = this.items.find((i) => i.videoId === videoId);

    // Batch retranslation fields to include in updates
    const batchRetranslateFields =
      retranslateBatchIndex !== undefined
        ? { retranslateBatchIndex, retranslateMode }
        : { retranslateBatchIndex: undefined, retranslateMode: undefined };

    if (item) {
      // Video exists in queue - update status based on current state
      if (item.status === "completed") {
        if (forceRetranslate) {
          // User wants to re-translate - change to translating
          // Save all config info for this translation
          await this.updateItem(item.id, {
            status: "translating",
            startedAt: Date.now(),
            configName: configName || item.configName,
            configId: configId || item.configId,
            presetId: presetId ?? item.presetId, // Use nullish coalescing to allow undefined override
            batchSettings: batchSettings || item.batchSettings,
            completedAt: undefined,
            error: undefined,
            // Clear partial data for fresh translation
            partialSrt: undefined,
            completedBatches: undefined,
            totalBatches: undefined,
            completedBatchRanges: undefined,
            // Batch retranslation mode
            ...batchRetranslateFields,
          });
          return this.items.find((i) => i.id === item!.id)!;
        }
        // Don't change completed status, just return
        return item;
      }
      if (item.status === "translating") {
        // Already in translating queue
        if (forceRetranslate) {
          // User wants to re-translate with new config - update all config info
          // Reset startedAt to ensure proper ordering
          await this.updateItem(item.id, {
            startedAt: Date.now(),
            configName: configName || item.configName,
            configId: configId || item.configId,
            presetId: presetId ?? item.presetId,
            batchSettings: batchSettings || item.batchSettings,
            // Clear partial data for fresh translation
            partialSrt: undefined,
            completedBatches: undefined,
            totalBatches: undefined,
            completedBatchRanges: undefined,
            error: undefined,
            // Batch retranslation mode
            ...batchRetranslateFields,
          });
        } else {
          // Only update config if not already set (preserve original config)
          const updates: Partial<QueueItem> = { ...batchRetranslateFields };
          if (!item.configName && configName) updates.configName = configName;
          if (!item.configId && configId) updates.configId = configId;
          if (item.presetId === undefined && presetId !== undefined)
            updates.presetId = presetId;
          if (!item.batchSettings && batchSettings)
            updates.batchSettings = batchSettings;

          if (Object.keys(updates).length > 0) {
            await this.updateItem(item.id, updates);
          }
        }
        return this.items.find((i) => i.id === item!.id)!;
      }
      // Update pending/error to translating - save all config info
      await this.updateItem(item.id, {
        status: "translating",
        startedAt: item.startedAt || Date.now(),
        configName: configName || item.configName,
        configId: configId || item.configId,
        presetId: presetId ?? item.presetId,
        batchSettings: batchSettings || item.batchSettings,
        error: undefined,
        // Batch retranslation mode
        ...batchRetranslateFields,
      });
      return this.items.find((i) => i.id === item!.id)!;
    } else {
      // Add new item to queue with all config info
      const newItem: QueueItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        videoUrl,
        videoId,
        title: title || `Video ${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        duration,
        status: "translating",
        addedAt: Date.now(),
        startedAt: Date.now(),
        configName,
        configId,
        presetId,
        batchSettings,
        // Batch retranslation mode
        retranslateBatchIndex,
        retranslateMode,
      };

      this.items.unshift(newItem);
      await this.save();
      this.notify();
      return newItem;
    }
  }

  // Clear batch retranslation mode from queue item (called when batch retranslation completes)
  async clearBatchRetranslateMode(videoUrl: string): Promise<void> {
    const videoId = this.extractVideoId(videoUrl);
    const item = this.items.find((i) => i.videoId === videoId);
    if (item) {
      await this.updateItem(item.id, {
        status: "completed",
        retranslateBatchIndex: undefined,
        retranslateMode: undefined,
        completedAt: Date.now(),
      });
    }
  }

  // Get queue status for a video (for UI display)
  getVideoQueueStatus(videoUrl: string): {
    inQueue: boolean;
    status?: QueueStatus;
    position?: number;
    isDirectTranslating?: boolean;
  } {
    const videoId = this.extractVideoId(videoUrl);
    const item = this.items.find((i) => i.videoId === videoId);

    if (!item) {
      // Check if this video is being translated directly
      if (this.directTranslationVideoUrl === videoUrl) {
        return { inQueue: false, isDirectTranslating: true };
      }
      return { inQueue: false };
    }

    // Calculate position in queue for translating items
    let position: number | undefined;
    if (item.status === "translating") {
      const translatingItems = this.items
        .filter((i) => i.status === "translating")
        .sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
      position = translatingItems.findIndex((i) => i.id === item.id) + 1;
    }

    return {
      inQueue: true,
      status: item.status,
      position,
    };
  }

  // Get total count of videos in translating queue (for notification display)
  getTranslatingQueueCount(): number {
    return this.items.filter((i) => i.status === "translating").length;
  }

  // Reset queue (called when clearing all app data)
  async reset(): Promise<void> {
    this.items = [];
    this.isProcessing = false;
    this.autoProcessEnabled = false;
    this.userStoppedItemId = null;
    this.currentProcessingItemId = null;
    this.userPausedItems.clear();
    this.queueStartCompletedCount = 0;
    this.directTranslationVideoUrl = null;
    this.removingItemId = null;
    await this.save();
    this.notify();
  }
}

export const queueManager = QueueManager.getInstance();
