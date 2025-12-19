/**
 * SRT Storage - Manual subtitle persistence
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const SRT_STORAGE_KEY_PREFIX = "srt_";

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
