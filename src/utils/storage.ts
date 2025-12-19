import AsyncStorage from "@react-native-async-storage/async-storage";

const SRT_STORAGE_KEY_PREFIX = "srt_";
const SUBTITLE_SETTINGS_KEY = "subtitle_settings";
const GEMINI_CONFIG_KEY = "gemini_config";

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

// Gemini Config
export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature: number;
  systemPrompt: string;
}

export const DEFAULT_GEMINI_CONFIG: GeminiConfig = {
  apiKey: "",
  model: "gemini-3-flash-preview",
  temperature: 0.7,
  systemPrompt: `Act as an expert translator and subtitler specializing in Japanese RPGs and anime. Your task is to analyze this video clip from the "Princess Connect! Re: Dive" franchise (game cutscene or anime). You must process all Japanese content—both spoken dialogue and on-screen text—and create a Vietnamese SRT subtitle file that preserves the original Japanese honorifics.

Critical Rules:
1. Localize for Fans: Translate into natural Vietnamese suitable for anime fans. Capture the original tone and character personalities (e.g., Pecorine's energy, Kyaru's "tsundere" style).
2. Honorifics and Pronouns Policy: Keep name suffixes (e.g., -chan, -sama); MUST translate personal pronouns (e.g., watashi, boku) into natural Vietnamese.
3. Non-Dialogue Formatting: Use parentheses \`( )\` to enclose translations of on-screen text (signs, letters) and internal monologues (thoughts).
4. Dialogue Choice Formatting: For in-game dialogue choice boxes, format them as a list within a single subtitle block. Prefix each option with \`> \` (a greater-than sign followed by a space). Place each option on a new line. This specific format is an exception to the 2-line limit rule if there are more than two choices.
5. Line Limit: Each subtitle block must have a maximum of 2 lines, unless it is a dialogue choice box as specified in Rule 4.
6. Readability Pacing: For long or fast-paced sentences, split the dialogue intelligently across multiple, consecutive subtitle blocks to ensure it's easy to read.
7. Conciseness: Keep each line concise and easy to grasp.
8. Strict SRT Output: The final output must be ONLY the raw SRT content, perfectly formatted and synchronized. Do not add any commentary.`,
};

export const saveGeminiConfig = async (config: GeminiConfig): Promise<void> => {
  try {
    await AsyncStorage.setItem(GEMINI_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error("Error saving Gemini config:", error);
  }
};

export const getGeminiConfig = async (): Promise<GeminiConfig> => {
  try {
    const data = await AsyncStorage.getItem(GEMINI_CONFIG_KEY);
    if (data) {
      return { ...DEFAULT_GEMINI_CONFIG, ...JSON.parse(data) };
    }
    return DEFAULT_GEMINI_CONFIG;
  } catch (error) {
    console.error("Error getting Gemini config:", error);
    return DEFAULT_GEMINI_CONFIG;
  }
};
