import AsyncStorage from "@react-native-async-storage/async-storage";

const SRT_STORAGE_KEY_PREFIX = "srt_";
const SUBTITLE_SETTINGS_KEY = "subtitle_settings";

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
