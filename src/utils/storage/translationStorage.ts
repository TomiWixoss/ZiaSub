/**
 * Translation Storage - Gemini translations persistence using cache + file system
 * Uses write-through cache: immediate cache update, background file persistence
 */
import { cacheService } from "@services/cacheService";
import { fileStorage, STORAGE_FILES } from "@services/fileStorageService";
import type { SavedTranslation, VideoTranslations } from "@src/types";
import { extractVideoId } from "@utils/videoUtils";

const TRANSLATIONS_DIR = STORAGE_FILES.translations;

// Helper to get video ID from URL
const getVideoIdFromUrl = (videoUrl: string): string => {
  const videoId = extractVideoId(videoUrl);
  if (videoId) return videoId;
  // Fallback: hash the URL
  const hash = videoUrl.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `video_${Math.abs(hash)}`;
};

export const saveTranslation = async (
  videoUrl: string,
  srtContent: string,
  configName: string
): Promise<SavedTranslation> => {
  const videoId = getVideoIdFromUrl(videoUrl);

  // Get existing data from cache or load from file
  let data = cacheService.getTranslation(videoId);
  if (!data) {
    data = await cacheService.loadTranslation(videoId, fileStorage);
  }

  if (!data) {
    data = {
      videoUrl,
      translations: [],
      activeTranslationId: null,
    };
  }

  const newTranslation: SavedTranslation = {
    id: Date.now().toString(),
    srtContent,
    createdAt: Date.now(),
    configName,
  };

  data.translations.push(newTranslation);
  data.activeTranslationId = newTranslation.id;

  // Update cache (will persist in background)
  cacheService.setTranslation(videoId, data);

  return newTranslation;
};

export const getVideoTranslations = async (
  videoUrl: string
): Promise<VideoTranslations | null> => {
  await cacheService.waitForInit();
  const videoId = getVideoIdFromUrl(videoUrl);

  // Check cache first
  let data = cacheService.getTranslation(videoId);
  if (data) return data;

  // Load from file
  data = await cacheService.loadTranslation(videoId, fileStorage);
  return data;
};

export const setActiveTranslation = async (
  videoUrl: string,
  translationId: string
): Promise<void> => {
  const videoId = getVideoIdFromUrl(videoUrl);

  let data = cacheService.getTranslation(videoId);
  if (!data) {
    data = await cacheService.loadTranslation(videoId, fileStorage);
  }

  if (data) {
    data.activeTranslationId = translationId;
    cacheService.setTranslation(videoId, data);
  }
};

export const deleteTranslation = async (
  videoUrl: string,
  translationId: string
): Promise<void> => {
  const videoId = getVideoIdFromUrl(videoUrl);

  let data = cacheService.getTranslation(videoId);
  if (!data) {
    data = await cacheService.loadTranslation(videoId, fileStorage);
  }

  if (data) {
    data.translations = data.translations.filter((t) => t.id !== translationId);

    if (data.activeTranslationId === translationId) {
      data.activeTranslationId = data.translations[0]?.id || null;
    }

    if (data.translations.length === 0) {
      // Delete the entire translation file
      cacheService.deleteTranslation(videoId);
    } else {
      cacheService.setTranslation(videoId, data);
    }
  }
};

export const getAllTranslatedVideoUrls = async (): Promise<string[]> => {
  await cacheService.waitForInit();

  try {
    const files = await fileStorage.listSubFiles(TRANSLATIONS_DIR);
    const urls: string[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const videoId = file.replace(".json", "");

        // Check cache first
        let data = cacheService.getTranslation(videoId);
        if (!data) {
          data = await cacheService.loadTranslation(videoId, fileStorage);
        }

        if (data?.videoUrl) {
          urls.push(data.videoUrl);
        }
      }
    }

    return urls;
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
  const data = await getVideoTranslations(videoUrl);
  if (!data || !data.activeTranslationId) return null;
  return (
    data.translations.find((t) => t.id === data.activeTranslationId) || null
  );
};
