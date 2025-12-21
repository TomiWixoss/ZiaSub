/**
 * Cache Service - In-memory cache with background file persistence
 * Write-through pattern: Update cache immediately, persist to file in background
 */
import type {
  AppSettings,
  GeminiConfig,
  ChatSession,
  VideoTranslations,
} from "@src/types";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_CHAT_CONFIG_ID,
  DEFAULT_SYSTEM_PROMPT,
} from "@constants/defaults";

// Cache data types
interface CacheData {
  settings: AppSettings | null;
  geminiConfigs: GeminiConfig[] | null;
  chatSessions: ChatSession[] | null;
  activeTranslationConfigId: string | null;
  activeChatConfigId: string | null;
  translations: Map<string, VideoTranslations>;
  srtFiles: Map<string, string>;
}

// Pending writes queue
interface PendingWrite {
  type:
    | "settings"
    | "geminiConfigs"
    | "chatSessions"
    | "activeTranslationConfig"
    | "activeChatConfig"
    | "translation"
    | "srt";
  key?: string; // For translations and srt
  data: any;
  timestamp: number;
}

class CacheService {
  private static instance: CacheService;

  // Reference to fileStorage for background writes
  private fileStorageRef: any = null;

  // In-memory cache
  private cache: CacheData = {
    settings: null,
    geminiConfigs: null,
    chatSessions: null,
    activeTranslationConfigId: null,
    activeChatConfigId: null,
    translations: new Map(),
    srtFiles: new Map(),
  };

  // Track if initial load is complete
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  // Pending writes for background persistence
  private pendingWrites: PendingWrite[] = [];
  private isWriting: boolean = false;
  private writeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Listeners for cache updates
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Check if cache is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Wait for initialization to complete
   */
  async waitForInit(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Initialize cache by loading all data from files
   */
  async initialize(fileStorage: any): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    // Store reference for background writes
    this.fileStorageRef = fileStorage;
    this.initPromise = this._doInitialize(fileStorage);
    await this.initPromise;
  }

  private async _doInitialize(fileStorage: any): Promise<void> {
    try {
      console.log("[CacheService] Starting initialization...");

      // Load all data in parallel
      const [
        settings,
        geminiConfigs,
        chatSessions,
        activeTranslationConfig,
        activeChatConfig,
      ] = await Promise.all([
        fileStorage.loadData("settings.json", null),
        fileStorage.loadData("gemini_configs.json", []),
        fileStorage.loadData("chat_sessions.json", []),
        fileStorage.loadData("active_translation_config.json", { id: null }),
        fileStorage.loadData("active_chat_config.json", { id: null }),
      ]);

      // Merge with defaults
      if (settings && Object.keys(settings).length > 0) {
        this.cache.settings = {
          subtitle: { ...DEFAULT_APP_SETTINGS.subtitle, ...settings.subtitle },
          batch: { ...DEFAULT_APP_SETTINGS.batch, ...settings.batch },
          apiKeys: { ...DEFAULT_APP_SETTINGS.apiKeys, ...settings.apiKeys },
          tts: { ...DEFAULT_APP_SETTINGS.tts, ...settings.tts },
          floatingUI: {
            ...DEFAULT_APP_SETTINGS.floatingUI,
            ...settings.floatingUI,
          },
        };
      } else {
        this.cache.settings = { ...DEFAULT_APP_SETTINGS };
      }

      this.cache.geminiConfigs = geminiConfigs || [];
      this.cache.chatSessions = chatSessions || [];
      this.cache.activeTranslationConfigId =
        activeTranslationConfig?.id || null;
      this.cache.activeChatConfigId = activeChatConfig?.id || null;

      // Ensure default configs exist
      await this._ensureDefaultConfigs(fileStorage);

      this.initialized = true;
      console.log("[CacheService] Initialization complete");
    } catch (error) {
      console.error("[CacheService] Initialization error:", error);
      // Set defaults on error
      this.cache.settings = { ...DEFAULT_APP_SETTINGS };
      this.cache.geminiConfigs = [];
      this.cache.chatSessions = [];
      this.initialized = true;
    }
  }

  private async _ensureDefaultConfigs(fileStorage: any): Promise<void> {
    let needsSave = false;

    // Ensure default chat config exists
    const hasChatConfig = this.cache.geminiConfigs?.some(
      (c) => c.id === DEFAULT_CHAT_CONFIG_ID
    );
    if (!hasChatConfig) {
      const chatConfig: GeminiConfig = {
        id: DEFAULT_CHAT_CONFIG_ID,
        name: "Chat",
        model: "models/gemini-flash-latest",
        temperature: 1.0,
        systemPrompt: "",
      };
      this.cache.geminiConfigs = [
        chatConfig,
        ...(this.cache.geminiConfigs || []),
      ];
      needsSave = true;
    }

    // Ensure at least one translation config exists
    const hasTranslationConfig = this.cache.geminiConfigs?.some(
      (c) => c.id !== DEFAULT_CHAT_CONFIG_ID
    );
    if (!hasTranslationConfig) {
      const defaultConfig: GeminiConfig = {
        id: Date.now().toString(),
        name: "Mặc định",
        model: "models/gemini-3-flash-preview",
        temperature: 0.7,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
      };
      this.cache.geminiConfigs?.push(defaultConfig);
      needsSave = true;
    }

    if (needsSave) {
      this.queueWrite({
        type: "geminiConfigs",
        data: this.cache.geminiConfigs,
        timestamp: Date.now(),
      });
    }
  }

  // ============================================
  // SETTINGS
  // ============================================

  getSettings(): AppSettings {
    return this.cache.settings || { ...DEFAULT_APP_SETTINGS };
  }

  setSettings(settings: AppSettings): void {
    this.cache.settings = settings;
    this.queueWrite({
      type: "settings",
      data: settings,
      timestamp: Date.now(),
    });
    this.notifyListeners("settings", settings);
  }

  getApiKeys(): string[] {
    return this.cache.settings?.apiKeys?.keys || [];
  }

  setApiKeys(keys: string[]): void {
    if (this.cache.settings) {
      this.cache.settings.apiKeys = { keys };
      this.queueWrite({
        type: "settings",
        data: this.cache.settings,
        timestamp: Date.now(),
      });
      this.notifyListeners("apiKeys", keys);
    }
  }

  // ============================================
  // GEMINI CONFIGS
  // ============================================

  getGeminiConfigs(): GeminiConfig[] {
    return this.cache.geminiConfigs || [];
  }

  setGeminiConfigs(configs: GeminiConfig[]): void {
    this.cache.geminiConfigs = configs;
    this.queueWrite({
      type: "geminiConfigs",
      data: configs,
      timestamp: Date.now(),
    });
    this.notifyListeners("geminiConfigs", configs);
  }

  getActiveTranslationConfigId(): string | null {
    return this.cache.activeTranslationConfigId;
  }

  setActiveTranslationConfigId(id: string): void {
    this.cache.activeTranslationConfigId = id;
    this.queueWrite({
      type: "activeTranslationConfig",
      data: { id },
      timestamp: Date.now(),
    });
  }

  getActiveChatConfigId(): string | null {
    return this.cache.activeChatConfigId;
  }

  setActiveChatConfigId(id: string): void {
    this.cache.activeChatConfigId = id;
    this.queueWrite({
      type: "activeChatConfig",
      data: { id },
      timestamp: Date.now(),
    });
  }

  // ============================================
  // CHAT SESSIONS
  // ============================================

  getChatSessions(): ChatSession[] {
    return this.cache.chatSessions || [];
  }

  setChatSessions(sessions: ChatSession[]): void {
    this.cache.chatSessions = sessions;
    this.queueWrite({
      type: "chatSessions",
      data: sessions,
      timestamp: Date.now(),
    });
    this.notifyListeners("chatSessions", sessions);
  }

  // ============================================
  // TRANSLATIONS (lazy loaded)
  // ============================================

  getTranslation(videoId: string): VideoTranslations | null {
    return this.cache.translations.get(videoId) || null;
  }

  setTranslation(videoId: string, data: VideoTranslations): void {
    this.cache.translations.set(videoId, data);
    this.queueWrite({
      type: "translation",
      key: videoId,
      data,
      timestamp: Date.now(),
    });
    this.notifyListeners(`translation:${videoId}`, data);
  }

  deleteTranslation(videoId: string): void {
    // Instead of deleting from cache, set to empty state
    // This prevents loading stale data from file before flush completes
    this.cache.translations.set(videoId, {
      videoUrl: "",
      translations: [],
      activeTranslationId: null,
    });
    // Queue delete operation
    this.queueWrite({
      type: "translation",
      key: videoId,
      data: null,
      timestamp: Date.now(),
    });
  }

  // ============================================
  // SRT FILES (lazy loaded)
  // ============================================

  getSrt(videoId: string): string | null {
    return this.cache.srtFiles.get(videoId) || null;
  }

  setSrt(videoId: string, content: string): void {
    this.cache.srtFiles.set(videoId, content);
    this.queueWrite({
      type: "srt",
      key: videoId,
      data: content,
      timestamp: Date.now(),
    });
  }

  deleteSrt(videoId: string): void {
    this.cache.srtFiles.delete(videoId);
    this.queueWrite({
      type: "srt",
      key: videoId,
      data: null,
      timestamp: Date.now(),
    });
  }

  // ============================================
  // BACKGROUND PERSISTENCE
  // ============================================

  private queueWrite(write: PendingWrite): void {
    // Remove any existing write of same type/key
    this.pendingWrites = this.pendingWrites.filter((w) => {
      if (w.type !== write.type) return true;
      if (write.key && w.key !== write.key) return true;
      return false;
    });

    this.pendingWrites.push(write);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.writeDebounceTimer) {
      clearTimeout(this.writeDebounceTimer);
    }

    // Debounce writes by 500ms
    this.writeDebounceTimer = setTimeout(() => {
      this.flushWrites();
    }, 500);
  }

  async flushWrites(): Promise<void> {
    if (this.isWriting || this.pendingWrites.length === 0) return;

    this.isWriting = true;
    const writes = [...this.pendingWrites];
    this.pendingWrites = [];

    try {
      // Use stored reference or import dynamically
      const fileStorage =
        this.fileStorageRef ||
        (await import("./fileStorageService")).fileStorage;

      if (!fileStorage.isConfigured()) {
        console.warn("[CacheService] Storage not configured, skipping flush");
        this.isWriting = false;
        return;
      }

      for (const write of writes) {
        try {
          switch (write.type) {
            case "settings":
              await fileStorage.saveData("settings.json", write.data);
              break;
            case "geminiConfigs":
              await fileStorage.saveData("gemini_configs.json", write.data);
              break;
            case "chatSessions":
              await fileStorage.saveData("chat_sessions.json", write.data);
              break;
            case "activeTranslationConfig":
              await fileStorage.saveData(
                "active_translation_config.json",
                write.data
              );
              break;
            case "activeChatConfig":
              await fileStorage.saveData("active_chat_config.json", write.data);
              break;
            case "translation":
              if (write.key) {
                if (write.data === null) {
                  await fileStorage.deleteSubData(
                    "translations",
                    `${write.key}.json`
                  );
                } else {
                  await fileStorage.saveSubData(
                    "translations",
                    `${write.key}.json`,
                    write.data
                  );
                }
              }
              break;
            case "srt":
              if (write.key) {
                if (write.data === null) {
                  await fileStorage.deleteSubData("srt", `${write.key}.srt`);
                } else {
                  await fileStorage.saveSubData(
                    "srt",
                    `${write.key}.srt`,
                    write.data
                  );
                }
              }
              break;
          }
        } catch (error) {
          console.error(`[CacheService] Error writing ${write.type}:`, error);
        }
      }
    } catch (error) {
      console.error("[CacheService] Error flushing writes:", error);
    } finally {
      this.isWriting = false;

      // If more writes came in while we were writing, flush again
      if (this.pendingWrites.length > 0) {
        this.scheduleFlush();
      }
    }
  }

  // ============================================
  // LISTENERS
  // ============================================

  subscribe(key: string, listener: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    return () => {
      this.listeners.get(key)?.delete(listener);
    };
  }

  private notifyListeners(key: string, data: any): void {
    this.listeners.get(key)?.forEach((listener) => listener(data));
  }

  // ============================================
  // LAZY LOAD HELPERS
  // ============================================

  async loadTranslation(
    videoId: string,
    fileStorage: any
  ): Promise<VideoTranslations | null> {
    // Check cache first
    const cached = this.cache.translations.get(videoId);
    if (cached) return cached;

    // Load from file
    try {
      const data = (await fileStorage.loadSubData(
        "translations",
        `${videoId}.json`,
        null
      )) as VideoTranslations | null;
      if (data) {
        this.cache.translations.set(videoId, data);
      }
      return data;
    } catch {
      return null;
    }
  }

  async loadSrt(videoId: string, fileStorage: any): Promise<string | null> {
    // Check cache first
    const cached = this.cache.srtFiles.get(videoId);
    if (cached) return cached;

    // Load from file
    try {
      const content = (await fileStorage.loadSubData(
        "srt",
        `${videoId}.srt`,
        null
      )) as string | null;
      if (content) {
        this.cache.srtFiles.set(videoId, content);
      }
      return content;
    } catch {
      return null;
    }
  }

  /**
   * Clear all cache (for logout/reset)
   */
  clearCache(): void {
    this.cache = {
      settings: null,
      geminiConfigs: null,
      chatSessions: null,
      activeTranslationConfigId: null,
      activeChatConfigId: null,
      translations: new Map(),
      srtFiles: new Map(),
    };
    this.pendingWrites = [];
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Force flush all pending writes immediately (call before app closes)
   */
  async forceFlush(): Promise<void> {
    if (this.writeDebounceTimer) {
      clearTimeout(this.writeDebounceTimer);
      this.writeDebounceTimer = null;
    }
    await this.flushWrites();
  }
}

export const cacheService = CacheService.getInstance();
