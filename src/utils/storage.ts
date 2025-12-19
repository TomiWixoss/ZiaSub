import AsyncStorage from "@react-native-async-storage/async-storage";

const SRT_STORAGE_KEY_PREFIX = "srt_";
const TRANSLATION_STORAGE_KEY_PREFIX = "translation_";
const APP_SETTINGS_KEY = "app_settings";
const GEMINI_CONFIGS_KEY = "gemini_configs";
const ACTIVE_GEMINI_CONFIG_KEY = "active_gemini_config";

// Helper to extract video ID from URL
const extractVideoId = (url: string): string | null => {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /[?&]v=([a-zA-Z0-9_-]+)/,
    /\/shorts\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

// Subtitle display settings
export interface SubtitleSettings {
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  portraitBottom: number; // Bottom position in portrait mode (px)
  landscapeBottom: number; // Bottom position in landscape/fullscreen mode (px)
}

// Batch translation settings (shared across all Gemini profiles)
export interface BatchSettings {
  maxVideoDuration: number; // Max duration per batch in seconds (default: 600 = 10 minutes)
  maxConcurrentBatches: number; // Max concurrent API calls (default: 2)
  batchOffset: number; // Offset tolerance in seconds (default: 60). If video exceeds maxVideoDuration by less than this, don't split
  streamingMode: boolean; // If true, apply each batch result immediately for live preview (default: false)
  presubMode: boolean; // If true, first batch uses shorter duration for quick preview (default: false)
  presubDuration: number; // Duration for first batch in presub mode (default: 120 = 2 minutes)
}

// API Keys settings (shared, with rotation support)
export interface ApiKeysSettings {
  keys: string[]; // List of API keys
}

// TTS (Text-to-Speech) settings
export interface TTSSettings {
  enabled: boolean;
  rate: number; // 0.5 - 2.0, default 1.0
  pitch: number; // 0.5 - 2.0, default 1.0
  language: string; // default 'vi-VN'
  duckVideo: boolean; // Reduce video volume when speaking (default: true)
  duckLevel: number; // Video volume when speaking (0-1, default: 0.2)
  autoRate: boolean; // Auto adjust rate based on subtitle duration (default: true)
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  enabled: false,
  rate: 1.0,
  pitch: 1.0,
  language: "vi-VN",
  duckVideo: true,
  duckLevel: 0.2,
  autoRate: true,
};

// Combined app settings
export interface AppSettings {
  subtitle: SubtitleSettings;
  batch: BatchSettings;
  apiKeys: ApiKeysSettings;
  tts: TTSSettings;
}

export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  fontSize: 15,
  fontWeight: "bold",
  fontStyle: "normal",
  portraitBottom: 100,
  landscapeBottom: 8,
};

export const DEFAULT_BATCH_SETTINGS: BatchSettings = {
  maxVideoDuration: 600, // 10 minutes
  maxConcurrentBatches: 2,
  batchOffset: 60, // 1 minute tolerance
  streamingMode: false, // Apply each batch immediately for live preview
  presubMode: false, // First batch uses shorter duration for quick preview
  presubDuration: 120, // 2 minutes for first batch in presub mode
};

export const DEFAULT_API_KEYS_SETTINGS: ApiKeysSettings = {
  keys: [],
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  subtitle: DEFAULT_SUBTITLE_SETTINGS,
  batch: DEFAULT_BATCH_SETTINGS,
  apiKeys: DEFAULT_API_KEYS_SETTINGS,
  tts: DEFAULT_TTS_SETTINGS,
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
        tts: { ...DEFAULT_TTS_SETTINGS, ...parsed.tts },
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

export const saveTTSSettings = async (settings: TTSSettings): Promise<void> => {
  const appSettings = await getAppSettings();
  appSettings.tts = settings;
  await saveAppSettings(appSettings);
};

export const getTTSSettings = async (): Promise<TTSSettings> => {
  const appSettings = await getAppSettings();
  return appSettings.tts;
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
    // First try exact URL match
    const key = `${TRANSLATION_STORAGE_KEY_PREFIX}${videoUrl}`;
    const data = await AsyncStorage.getItem(key);
    if (data) return JSON.parse(data);

    // If not found, search by video ID
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return null;

    const allKeys = await AsyncStorage.getAllKeys();
    const translationKeys = allKeys.filter((k) =>
      k.startsWith(TRANSLATION_STORAGE_KEY_PREFIX)
    );

    for (const k of translationKeys) {
      const storedUrl = k.replace(TRANSLATION_STORAGE_KEY_PREFIX, "");
      const storedVideoId = extractVideoId(storedUrl);
      if (storedVideoId === videoId) {
        const storedData = await AsyncStorage.getItem(k);
        return storedData ? JSON.parse(storedData) : null;
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting translations:", error);
    return null;
  }
};

// Helper to find the actual storage key for a video URL (handles URL variations)
const findTranslationKey = async (videoUrl: string): Promise<string | null> => {
  // First try exact URL match
  const exactKey = `${TRANSLATION_STORAGE_KEY_PREFIX}${videoUrl}`;
  const exactData = await AsyncStorage.getItem(exactKey);
  if (exactData) return exactKey;

  // If not found, search by video ID
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return null;

  const allKeys = await AsyncStorage.getAllKeys();
  const translationKeys = allKeys.filter((k) =>
    k.startsWith(TRANSLATION_STORAGE_KEY_PREFIX)
  );

  for (const k of translationKeys) {
    const storedUrl = k.replace(TRANSLATION_STORAGE_KEY_PREFIX, "");
    const storedVideoId = extractVideoId(storedUrl);
    if (storedVideoId === videoId) {
      return k;
    }
  }

  return null;
};

export const setActiveTranslation = async (
  videoUrl: string,
  translationId: string
): Promise<void> => {
  try {
    const key = await findTranslationKey(videoUrl);
    if (!key) return;

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
    const key = await findTranslationKey(videoUrl);
    if (!key) return;

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

// Get all video URLs that have translations
export const getAllTranslatedVideoUrls = async (): Promise<string[]> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const translationKeys = allKeys.filter((k) =>
      k.startsWith(TRANSLATION_STORAGE_KEY_PREFIX)
    );
    return translationKeys.map((k) =>
      k.replace(TRANSLATION_STORAGE_KEY_PREFIX, "")
    );
  } catch (error) {
    console.error("Error getting all translated videos:", error);
    return [];
  }
};

// Check if video has any translation
export const hasTranslation = async (videoUrl: string): Promise<boolean> => {
  const data = await getVideoTranslations(videoUrl);
  return data !== null && data.translations.length > 0;
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

export const DEFAULT_SYSTEM_PROMPT = `You are an expert translator and subtitler. Your task is to watch the video, listen to all spoken content, and create accurate Vietnamese SRT subtitles.

Critical Rules:
1. Natural Translation: Translate into natural, fluent Vietnamese that matches the video's tone and context.
2. Accuracy: Capture the meaning faithfully while adapting expressions to sound natural in Vietnamese.
3. Timing: Ensure subtitle timing matches the audio precisely.
4. Formatting: Use parentheses ( ) for non-dialogue elements like sound effects, music descriptions, or on-screen text.
5. Line Limit: Each subtitle block must have a maximum of 2 lines for readability.
6. Strict SRT Output: Output ONLY raw SRT content with no additional commentary or explanations.`;

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
