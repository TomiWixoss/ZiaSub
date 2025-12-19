import AsyncStorage from "@react-native-async-storage/async-storage";

const SRT_STORAGE_KEY_PREFIX = "srt_";
const SUBTITLE_SETTINGS_KEY = "subtitle_settings";
const GEMINI_CONFIGS_KEY = "gemini_configs";
const ACTIVE_GEMINI_CONFIG_KEY = "active_gemini_config";

export interface SubtitleSettings {
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
}

export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  fontSize: 15,
  fontWeight: "bold",
  fontStyle: "normal",
};

export const saveSubtitleSettings = async (
  settings: SubtitleSettings
): Promise<void> => {
  try {
    await AsyncStorage.setItem(SUBTITLE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving subtitle settings:", error);
  }
};

export const getSubtitleSettings = async (): Promise<SubtitleSettings> => {
  try {
    const data = await AsyncStorage.getItem(SUBTITLE_SETTINGS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return DEFAULT_SUBTITLE_SETTINGS;
  } catch (error) {
    console.error("Error getting subtitle settings:", error);
    return DEFAULT_SUBTITLE_SETTINGS;
  }
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

// Gemini Config with multiple profiles
export interface GeminiConfig {
  id: string;
  name: string;
  apiKey: string;
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
  apiKey: "",
  model: "gemini-3-flash-preview",
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
