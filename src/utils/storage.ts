import AsyncStorage from "@react-native-async-storage/async-storage";

const SRT_STORAGE_KEY_PREFIX = "srt_";
const TRANSLATION_STORAGE_KEY_PREFIX = "translation_";
const APP_SETTINGS_KEY = "app_settings";
const GEMINI_CONFIGS_KEY = "gemini_configs";
const ACTIVE_GEMINI_CONFIG_KEY = "active_gemini_config";

// Subtitle display settings
export interface SubtitleSettings {
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
}

// Batch translation settings (shared across all Gemini profiles)
export interface BatchSettings {
  maxVideoDuration: number; // Max duration per batch in seconds (default: 600 = 10 minutes)
  maxConcurrentBatches: number; // Max concurrent API calls (default: 2)
}

// API Keys settings (shared, with rotation support)
export interface ApiKeysSettings {
  keys: string[]; // List of API keys
}

// Combined app settings
export interface AppSettings {
  subtitle: SubtitleSettings;
  batch: BatchSettings;
  apiKeys: ApiKeysSettings;
}

export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  fontSize: 15,
  fontWeight: "bold",
  fontStyle: "normal",
};

export const DEFAULT_BATCH_SETTINGS: BatchSettings = {
  maxVideoDuration: 600, // 10 minutes
  maxConcurrentBatches: 2,
};

export const DEFAULT_API_KEYS_SETTINGS: ApiKeysSettings = {
  keys: [],
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  subtitle: DEFAULT_SUBTITLE_SETTINGS,
  batch: DEFAULT_BATCH_SETTINGS,
  apiKeys: DEFAULT_API_KEYS_SETTINGS,
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving app settings:", error);
  }
};

export const getAppSettings = async (): Promise<AppSettings> => {
  try {
    const data = await AsyncStorage.getItem(APP_SETTINGS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Merge with defaults to handle missing fields
      return {
        subtitle: { ...DEFAULT_SUBTITLE_SETTINGS, ...parsed.subtitle },
        batch: { ...DEFAULT_BATCH_SETTINGS, ...parsed.batch },
        apiKeys: { ...DEFAULT_API_KEYS_SETTINGS, ...parsed.apiKeys },
      };
    }
    return DEFAULT_APP_SETTINGS;
  } catch (error) {
    console.error("Error getting app settings:", error);
    return DEFAULT_APP_SETTINGS;
  }
};

// Legacy compatibility
export const saveSubtitleSettings = async (
  settings: SubtitleSettings
): Promise<void> => {
  const appSettings = await getAppSettings();
  appSettings.subtitle = settings;
  await saveAppSettings(appSettings);
};

export const getSubtitleSettings = async (): Promise<SubtitleSettings> => {
  const appSettings = await getAppSettings();
  return appSettings.subtitle;
};

export const saveBatchSettings = async (
  settings: BatchSettings
): Promise<void> => {
  const appSettings = await getAppSettings();
  appSettings.batch = settings;
  await saveAppSettings(appSettings);
};

export const getBatchSettings = async (): Promise<BatchSettings> => {
  const appSettings = await getAppSettings();
  return appSettings.batch;
};

export const saveApiKeys = async (keys: string[]): Promise<void> => {
  const appSettings = await getAppSettings();
  appSettings.apiKeys = { keys };
  await saveAppSettings(appSettings);
};

export const getApiKeys = async (): Promise<string[]> => {
  const appSettings = await getAppSettings();
  return appSettings.apiKeys?.keys || [];
};

export const saveSRT = async (
  url: string,
  srtContent: string
): Promise<void> => {
  try {
    const key = `${SRT_STORAGE_KEY_PREFIX}${url}`;
    await AsyncStorage.setItem(key, srtContent);
  } catch (error) {
    console.error("Error saving SRT:", error);
  }
};

export const getSRT = async (url: string): Promise<string | null> => {
  try {
    const key = `${SRT_STORAGE_KEY_PREFIX}${url}`;
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error("Error getting SRT:", error);
    return null;
  }
};

export const removeSRT = async (url: string): Promise<void> => {
  try {
    const key = `${SRT_STORAGE_KEY_PREFIX}${url}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing SRT:", error);
  }
};

// Translation storage (Gemini translations saved per video URL)
export interface SavedTranslation {
  id: string;
  srtContent: string;
  createdAt: number;
  configName: string;
}

export interface VideoTranslations {
  videoUrl: string;
  translations: SavedTranslation[];
  activeTranslationId: string | null;
}

export const saveTranslation = async (
  videoUrl: string,
  srtContent: string,
  configName: string
): Promise<SavedTranslation> => {
  try {
    const key = `${TRANSLATION_STORAGE_KEY_PREFIX}${videoUrl}`;
    const existing = await AsyncStorage.getItem(key);
    const data: VideoTranslations = existing
      ? JSON.parse(existing)
      : { videoUrl, translations: [], activeTranslationId: null };

    const newTranslation: SavedTranslation = {
      id: Date.now().toString(),
      srtContent,
      createdAt: Date.now(),
      configName,
    };

    data.translations.push(newTranslation);
    data.activeTranslationId = newTranslation.id;

    await AsyncStorage.setItem(key, JSON.stringify(data));
    return newTranslation;
  } catch (error) {
    console.error("Error saving translation:", error);
    throw error;
  }
};

export const getVideoTranslations = async (
  videoUrl: string
): Promise<VideoTranslations | null> => {
  try {
    const key = `${TRANSLATION_STORAGE_KEY_PREFIX}${videoUrl}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error getting translations:", error);
    return null;
  }
};

export const setActiveTranslation = async (
  videoUrl: string,
  translationId: string
): Promise<void> => {
  try {
    const key = `${TRANSLATION_STORAGE_KEY_PREFIX}${videoUrl}`;
    const existing = await AsyncStorage.getItem(key);
    if (existing) {
      const data: VideoTranslations = JSON.parse(existing);
      data.activeTranslationId = translationId;
      await AsyncStorage.setItem(key, JSON.stringify(data));
    }
  } catch (error) {
    console.error("Error setting active translation:", error);
  }
};

export const deleteTranslation = async (
  videoUrl: string,
  translationId: string
): Promise<void> => {
  try {
    const key = `${TRANSLATION_STORAGE_KEY_PREFIX}${videoUrl}`;
    const existing = await AsyncStorage.getItem(key);
    if (existing) {
      const data: VideoTranslations = JSON.parse(existing);
      data.translations = data.translations.filter(
        (t) => t.id !== translationId
      );
      if (data.activeTranslationId === translationId) {
        data.activeTranslationId = data.translations[0]?.id || null;
      }
      await AsyncStorage.setItem(key, JSON.stringify(data));
    }
  } catch (error) {
    console.error("Error deleting translation:", error);
  }
};

export const getActiveTranslation = async (
  videoUrl: string
): Promise<SavedTranslation | null> => {
  try {
    const data = await getVideoTranslations(videoUrl);
    if (!data || !data.activeTranslationId) return null;
    return (
      data.translations.find((t) => t.id === data.activeTranslationId) || null
    );
  } catch (error) {
    console.error("Error getting active translation:", error);
    return null;
  }
};

// Gemini Config with multiple profiles (API key is now global)
export interface GeminiConfig {
  id: string;
  name: string;
  model: string;
  temperature: number;
  systemPrompt: string;
}

export const DEFAULT_SYSTEM_PROMPT = `Act as an expert translator and subtitler specializing in Japanese RPGs and anime. You must process all Japanese content—both spoken dialogue and on-screen text—and create a Vietnamese SRT subtitle file that preserves the original Japanese honorifics.

Critical Rules:
1. Localize for Fans: Translate into natural Vietnamese suitable for anime fans.
2. Honorifics and Pronouns Policy: Keep name suffixes (e.g., -chan, -sama); translate personal pronouns naturally.
3. Non-Dialogue Formatting: Use parentheses ( ) for on-screen text and internal monologues.
4. Line Limit: Each subtitle block must have a maximum of 2 lines.
5. Strict SRT Output: Output ONLY raw SRT content, no commentary.`;

export const createDefaultGeminiConfig = (): GeminiConfig => ({
  id: Date.now().toString(),
  name: "Mặc định",
  model: "models/gemini-3-flash-preview",
  temperature: 0.7,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
});

// Save all Gemini configs
export const saveGeminiConfigs = async (
  configs: GeminiConfig[]
): Promise<void> => {
  try {
    await AsyncStorage.setItem(GEMINI_CONFIGS_KEY, JSON.stringify(configs));
  } catch (error) {
    console.error("Error saving Gemini configs:", error);
  }
};

// Get all Gemini configs
export const getGeminiConfigs = async (): Promise<GeminiConfig[]> => {
  try {
    const data = await AsyncStorage.getItem(GEMINI_CONFIGS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Return default config if none exists
    const defaultConfig = createDefaultGeminiConfig();
    await saveGeminiConfigs([defaultConfig]);
    return [defaultConfig];
  } catch (error) {
    console.error("Error getting Gemini configs:", error);
    return [createDefaultGeminiConfig()];
  }
};

// Save active config ID
export const saveActiveGeminiConfigId = async (id: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(ACTIVE_GEMINI_CONFIG_KEY, id);
  } catch (error) {
    console.error("Error saving active Gemini config:", error);
  }
};

// Get active config ID
export const getActiveGeminiConfigId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(ACTIVE_GEMINI_CONFIG_KEY);
  } catch (error) {
    console.error("Error getting active Gemini config:", error);
    return null;
  }
};

// Get active Gemini config
export const getActiveGeminiConfig = async (): Promise<GeminiConfig | null> => {
  try {
    const configs = await getGeminiConfigs();
    const activeId = await getActiveGeminiConfigId();

    if (activeId) {
      const config = configs.find((c) => c.id === activeId);
      if (config) return config;
    }

    // Return first config if no active set
    return configs[0] || null;
  } catch (error) {
    console.error("Error getting active Gemini config:", error);
    return null;
  }
};
