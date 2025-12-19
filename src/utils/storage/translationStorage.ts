/**
 * Translation Storage - Gemini translations persistence
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavedTranslation, VideoTranslations } from "@src/types";
import { extractVideoId } from "@utils/videoUtils";

const TRANSLATION_STORAGE_KEY_PREFIX = "translation_";

// Helper to find the actual storage key for a video URL
const findTranslationKey = async (videoUrl: string): Promise<string | null> => {
  const exactKey = `${TRANSLATION_STORAGE_KEY_PREFIX}${videoUrl}`;
  const exactData = await AsyncStorage.getItem(exactKey);
  if (exactData) return exactKey;

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
    if (data) return JSON.parse(data);

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
