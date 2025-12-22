/**
 * Storage Service - Primary storage using AsyncStorage
 * All app data is stored here. File system is only used for backup/restore.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
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

// Storage keys
const KEYS = {
  SETTINGS: "@ziasub_settings",
  GEMINI_CONFIGS: "@ziasub_gemini_configs",
  CHAT_SESSIONS: "@ziasub_chat_sessions",
  ACTIVE_TRANSLATION_CONFIG: "@ziasub_active_translation_config",
  ACTIVE_CHAT_CONFIG: "@ziasub_active_chat_config",
  ACTIVE_CHAT_SESSION: "@ziasub_active_chat_session",
  TRANSLATION_INDEX: "@ziasub_translation_index", // List of video IDs
  TRANSLATION_PREFIX: "@ziasub_translation_", // + videoId
  SRT_PREFIX: "@ziasub_srt_", // + videoId
  ONBOARDING_COMPLETED: "@onboarding_completed",
  BACKUP_PATH: "@ziasub_backup_path",
  BACKUP_TYPE: "@ziasub_backup_type",
  AUTO_BACKUP_ENABLED: "@ziasub_auto_backup",
  LAST_BACKUP_TIME: "@ziasub_last_backup",
};

class StorageService {
  private static instance: StorageService;
  private initialized = false;

  // In-memory cache for frequently accessed data
  private cache: {
    settings: AppSettings | null;
    geminiConfigs: GeminiConfig[] | null;
    chatSessions: ChatSession[] | null;
    translationIndex: Set<string>;
  } = {
    settings: null,
    geminiConfigs: null,
    chatSessions: null,
    translationIndex: new Set(),
  };

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Initialize storage - load frequently accessed data into memory cache
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log("[StorageService] Initializing...");

      // Load core data in parallel
      const [settings, configs, sessions, indexJson] = await Promise.all([
        AsyncStorage.getItem(KEYS.SETTINGS),
        AsyncStorage.getItem(KEYS.GEMINI_CONFIGS),
        AsyncStorage.getItem(KEYS.CHAT_SESSIONS),
        AsyncStorage.getItem(KEYS.TRANSLATION_INDEX),
      ]);

      // Parse and merge with defaults
      if (settings) {
        const parsed = JSON.parse(settings);
        this.cache.settings = this.mergeWithDefaults(parsed);
      } else {
        this.cache.settings = { ...DEFAULT_APP_SETTINGS };
      }

      this.cache.geminiConfigs = configs ? JSON.parse(configs) : [];
      this.cache.chatSessions = sessions ? JSON.parse(sessions) : [];
      this.cache.translationIndex = indexJson
        ? new Set(JSON.parse(indexJson))
        : new Set();

      // Ensure default configs exist
      await this.ensureDefaultConfigs();

      this.initialized = true;
      console.log("[StorageService] Initialized successfully");
    } catch (error) {
      console.error("[StorageService] Init error:", error);
      this.cache.settings = { ...DEFAULT_APP_SETTINGS };
      this.cache.geminiConfigs = [];
      this.cache.chatSessions = [];
      this.initialized = true;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private mergeWithDefaults(settings: Partial<AppSettings>): AppSettings {
    return {
      subtitle: { ...DEFAULT_APP_SETTINGS.subtitle, ...settings.subtitle },
      batch: { ...DEFAULT_APP_SETTINGS.batch, ...settings.batch },
      apiKeys: { ...DEFAULT_APP_SETTINGS.apiKeys, ...settings.apiKeys },
      tts: { ...DEFAULT_APP_SETTINGS.tts, ...settings.tts },
      floatingUI: {
        ...DEFAULT_APP_SETTINGS.floatingUI,
        ...settings.floatingUI,
      },
      notification: {
        ...DEFAULT_APP_SETTINGS.notification,
        ...settings.notification,
      },
    };
  }

  private async ensureDefaultConfigs(): Promise<void> {
    let needsSave = false;
    let configs = this.cache.geminiConfigs || [];

    // Ensure default chat config
    if (!configs.some((c) => c.id === DEFAULT_CHAT_CONFIG_ID)) {
      configs = [
        {
          id: DEFAULT_CHAT_CONFIG_ID,
          name: "Chat",
          model: "models/gemini-flash-latest",
          temperature: 1.0,
          systemPrompt: "",
        },
        ...configs,
      ];
      needsSave = true;
    }

    // Ensure at least one translation config
    if (!configs.some((c) => c.id !== DEFAULT_CHAT_CONFIG_ID)) {
      configs.push({
        id: Date.now().toString(),
        name: "Mặc định",
        model: "models/gemini-3-flash-preview",
        temperature: 0.7,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
      });
      needsSave = true;
    }

    if (needsSave) {
      this.cache.geminiConfigs = configs;
      await AsyncStorage.setItem(KEYS.GEMINI_CONFIGS, JSON.stringify(configs));
    }
  }

  // ============================================
  // SETTINGS
  // ============================================

  getSettings(): AppSettings {
    return this.cache.settings || { ...DEFAULT_APP_SETTINGS };
  }

  async setSettings(settings: AppSettings): Promise<void> {
    this.cache.settings = settings;
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  getApiKeys(): string[] {
    return this.cache.settings?.apiKeys?.keys || [];
  }

  async setApiKeys(keys: string[]): Promise<void> {
    if (!this.cache.settings) {
      this.cache.settings = { ...DEFAULT_APP_SETTINGS };
    }
    this.cache.settings.apiKeys = { keys };
    await AsyncStorage.setItem(
      KEYS.SETTINGS,
      JSON.stringify(this.cache.settings)
    );
  }

  // ============================================
  // GEMINI CONFIGS
  // ============================================

  getGeminiConfigs(): GeminiConfig[] {
    return this.cache.geminiConfigs || [];
  }

  async setGeminiConfigs(configs: GeminiConfig[]): Promise<void> {
    this.cache.geminiConfigs = configs;
    await AsyncStorage.setItem(KEYS.GEMINI_CONFIGS, JSON.stringify(configs));
  }

  async getActiveTranslationConfigId(): Promise<string | null> {
    const id = await AsyncStorage.getItem(KEYS.ACTIVE_TRANSLATION_CONFIG);
    return id;
  }

  async setActiveTranslationConfigId(id: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.ACTIVE_TRANSLATION_CONFIG, id);
  }

  async getActiveChatConfigId(): Promise<string | null> {
    const id = await AsyncStorage.getItem(KEYS.ACTIVE_CHAT_CONFIG);
    return id;
  }

  async setActiveChatConfigId(id: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.ACTIVE_CHAT_CONFIG, id);
  }

  // ============================================
  // CHAT SESSIONS
  // ============================================

  getChatSessions(): ChatSession[] {
    return this.cache.chatSessions || [];
  }

  async setChatSessions(sessions: ChatSession[]): Promise<void> {
    this.cache.chatSessions = sessions;
    await AsyncStorage.setItem(KEYS.CHAT_SESSIONS, JSON.stringify(sessions));
  }

  async getActiveChatSessionId(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.ACTIVE_CHAT_SESSION);
  }

  async setActiveChatSessionId(id: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.ACTIVE_CHAT_SESSION, id);
  }

  // ============================================
  // TRANSLATIONS
  // ============================================

  hasTranslationIndex(videoId: string): boolean {
    return this.cache.translationIndex.has(videoId);
  }

  getTranslationVideoIds(): string[] {
    return Array.from(this.cache.translationIndex);
  }

  async getTranslation(videoId: string): Promise<VideoTranslations | null> {
    try {
      const data = await AsyncStorage.getItem(
        KEYS.TRANSLATION_PREFIX + videoId
      );
      if (!data) return null;
      const parsed = JSON.parse(data) as VideoTranslations;
      if (!parsed.translations || parsed.translations.length === 0) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async setTranslation(
    videoId: string,
    data: VideoTranslations
  ): Promise<void> {
    await AsyncStorage.setItem(
      KEYS.TRANSLATION_PREFIX + videoId,
      JSON.stringify(data)
    );
    // Update index
    if (!this.cache.translationIndex.has(videoId)) {
      this.cache.translationIndex.add(videoId);
      await this.saveTranslationIndex();
    }
  }

  async deleteTranslation(videoId: string): Promise<void> {
    await AsyncStorage.removeItem(KEYS.TRANSLATION_PREFIX + videoId);
    this.cache.translationIndex.delete(videoId);
    await this.saveTranslationIndex();
  }

  private async saveTranslationIndex(): Promise<void> {
    await AsyncStorage.setItem(
      KEYS.TRANSLATION_INDEX,
      JSON.stringify(Array.from(this.cache.translationIndex))
    );
  }

  // ============================================
  // SRT FILES
  // ============================================

  async getSrt(videoId: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.SRT_PREFIX + videoId);
    } catch {
      return null;
    }
  }

  async setSrt(videoId: string, content: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.SRT_PREFIX + videoId, content);
  }

  async deleteSrt(videoId: string): Promise<void> {
    await AsyncStorage.removeItem(KEYS.SRT_PREFIX + videoId);
  }

  // ============================================
  // ONBOARDING & BACKUP CONFIG
  // ============================================

  async getOnboardingCompleted(): Promise<boolean> {
    const value = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETED);
    return value === "true";
  }

  async setOnboardingCompleted(completed: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETED, String(completed));
  }

  async getBackupPath(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.BACKUP_PATH);
  }

  async setBackupPath(path: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.BACKUP_PATH, path);
  }

  async getBackupType(): Promise<"local" | "saf"> {
    const type = await AsyncStorage.getItem(KEYS.BACKUP_TYPE);
    return (type as "local" | "saf") || "local";
  }

  async setBackupType(type: "local" | "saf"): Promise<void> {
    await AsyncStorage.setItem(KEYS.BACKUP_TYPE, type);
  }

  async isAutoBackupEnabled(): Promise<boolean> {
    const value = await AsyncStorage.getItem(KEYS.AUTO_BACKUP_ENABLED);
    return value === "true";
  }

  async setAutoBackupEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(KEYS.AUTO_BACKUP_ENABLED, String(enabled));
  }

  async getLastBackupTime(): Promise<number | null> {
    const value = await AsyncStorage.getItem(KEYS.LAST_BACKUP_TIME);
    return value ? parseInt(value, 10) : null;
  }

  async setLastBackupTime(time: number): Promise<void> {
    await AsyncStorage.setItem(KEYS.LAST_BACKUP_TIME, String(time));
  }

  // ============================================
  // BULK OPERATIONS (for backup/restore)
  // ============================================

  /**
   * Export all data for backup
   */
  async exportAllData(): Promise<{
    settings: AppSettings;
    geminiConfigs: GeminiConfig[];
    chatSessions: ChatSession[];
    translations: Record<string, VideoTranslations>;
    srtFiles: Record<string, string>;
    activeTranslationConfigId: string | null;
    activeChatConfigId: string | null;
    activeChatSessionId: string | null;
  }> {
    const translations: Record<string, VideoTranslations> = {};
    const srtFiles: Record<string, string> = {};

    // Load all translations
    for (const videoId of this.cache.translationIndex) {
      const data = await this.getTranslation(videoId);
      if (data) translations[videoId] = data;
    }

    // Load all SRT files (get all keys starting with SRT_PREFIX)
    const allKeys = await AsyncStorage.getAllKeys();
    const srtKeys = allKeys.filter((k) => k.startsWith(KEYS.SRT_PREFIX));
    for (const key of srtKeys) {
      const videoId = key.replace(KEYS.SRT_PREFIX, "");
      const content = await this.getSrt(videoId);
      if (content) srtFiles[videoId] = content;
    }

    return {
      settings: this.getSettings(),
      geminiConfigs: this.getGeminiConfigs(),
      chatSessions: this.getChatSessions(),
      translations,
      srtFiles,
      activeTranslationConfigId: await this.getActiveTranslationConfigId(),
      activeChatConfigId: await this.getActiveChatConfigId(),
      activeChatSessionId: await this.getActiveChatSessionId(),
    };
  }

  /**
   * Import all data from backup
   */
  async importAllData(data: {
    settings?: AppSettings;
    geminiConfigs?: GeminiConfig[];
    chatSessions?: ChatSession[];
    translations?: Record<string, VideoTranslations>;
    srtFiles?: Record<string, string>;
    activeTranslationConfigId?: string | null;
    activeChatConfigId?: string | null;
    activeChatSessionId?: string | null;
  }): Promise<void> {
    // Import settings
    if (data.settings) {
      await this.setSettings(this.mergeWithDefaults(data.settings));
    }

    // Import configs
    if (data.geminiConfigs) {
      await this.setGeminiConfigs(data.geminiConfigs);
    }

    // Import chat sessions
    if (data.chatSessions) {
      await this.setChatSessions(data.chatSessions);
    }

    // Import translations
    if (data.translations) {
      for (const [videoId, translation] of Object.entries(data.translations)) {
        await this.setTranslation(videoId, translation);
      }
    }

    // Import SRT files
    if (data.srtFiles) {
      for (const [videoId, content] of Object.entries(data.srtFiles)) {
        await this.setSrt(videoId, content);
      }
    }

    // Import active IDs
    if (data.activeTranslationConfigId) {
      await this.setActiveTranslationConfigId(data.activeTranslationConfigId);
    }
    if (data.activeChatConfigId) {
      await this.setActiveChatConfigId(data.activeChatConfigId);
    }
    if (data.activeChatSessionId) {
      await this.setActiveChatSessionId(data.activeChatSessionId);
    }
  }

  /**
   * Clear all app data
   */
  async clearAllData(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    // Include @ziasub_ keys and @translation_queue
    const appKeys = allKeys.filter(
      (k) => k.startsWith("@ziasub_") || k === "@translation_queue"
    );
    await AsyncStorage.multiRemove(appKeys);

    // Reset cache
    this.cache = {
      settings: { ...DEFAULT_APP_SETTINGS },
      geminiConfigs: [],
      chatSessions: [],
      translationIndex: new Set(),
    };

    // Re-ensure defaults
    await this.ensureDefaultConfigs();

    // Reset queueManager in-memory state
    const { queueManager } = await import("./queueManager");
    await queueManager.reset();
  }
}

export const storageService = StorageService.getInstance();
export { KEYS as STORAGE_KEYS };
