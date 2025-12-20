/**
 * Translation Storage - Gemini translations persistence using file system
 */
import { fileStorage, STORAGE_FILES } from "@services/fileStorageService";
import type { SavedTranslation, VideoTranslations } from "@src/types";
import { extractVideoId } from "@utils/videoUtils";

const TRANSLATIONS_DIR = STORAGE_FILES.translations;

// Helper to create safe filename from video URL
const createSafeFilename = (videoUrl: string): string => {
  const videoId = extractVideoId(videoUrl);
  if (videoId) return `${videoId}.json`;
  // Fallback: hash the URL
  const hash = videoUrl.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `video_${Math.abs(hash)}.json`;
};

// Helper to find translation file for a video URL
const findTranslationFile = async (
  videoUrl: string
): Promise<string | null> => {
  try {
    // Ensure storage is initialized
    if (!fileStorage.isConfigured()) {
      await fileStorage.initialize();
    }

    const exactFilename = createSafeFilename(videoUrl);
    const files = await fileStorage.listSubFiles(TRANSLATIONS_DIR);

    // Check exact match first
    if (files.includes(exactFilename)) return exactFilename;

    // Check by video ID
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return null;

    for (const file of files) {
      if (file.startsWith(videoId)) return file;
    }

    return null;
  } catch (error) {
    console.error("Error finding translation file:", error);
    return null;
  }
};

export const saveTranslation = async (
  videoUrl: string,
  srtContent: string,
  configName: string
): Promise<SavedTranslation> => {
  try {
    const filename = createSafeFilename(videoUrl);
    const existing = await fileStorage.loadSubData<VideoTranslations | null>(
      TRANSLATIONS_DIR,
      filename,
      null
    );
    const data: VideoTranslations = existing || {
      videoUrl,
      translations: [],
      activeTranslationId: null,
    };

    const newTranslation: SavedTranslation = {
      id: Date.now().toString(),
      srtContent,
      createdAt: Date.now(),
      configName,
    };

    data.translations.push(newTranslation);
    data.activeTranslationId = newTranslation.id;

    await fileStorage.saveSubData(TRANSLATIONS_DIR, filename, data);
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
    // Ensure storage is initialized
    if (!fileStorage.isConfigured()) {
      await fileStorage.initialize();
    }

    const filename = await findTranslationFile(videoUrl);
    if (!filename) return null;
    return await fileStorage.loadSubData<VideoTranslations | null>(
      TRANSLATIONS_DIR,
      filename,
      null
    );
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
    const filename = await findTranslationFile(videoUrl);
    if (!filename) return;

    const data = await fileStorage.loadSubData<VideoTranslations | null>(
      TRANSLATIONS_DIR,
      filename,
      null
    );
    if (data) {
      data.activeTranslationId = translationId;
      await fileStorage.saveSubData(TRANSLATIONS_DIR, filename, data);
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
    const filename = await findTranslationFile(videoUrl);
    if (!filename) return;

    const data = await fileStorage.loadSubData<VideoTranslations | null>(
      TRANSLATIONS_DIR,
      filename,
      null
    );
    if (data) {
      data.translations = data.translations.filter(
        (t) => t.id !== translationId
      );
      if (data.activeTranslationId === translationId) {
        data.activeTranslationId = data.translations[0]?.id || null;
      }

      // If no translations left, remove the entire file
      if (data.translations.length === 0) {
        await fileStorage.deleteSubData(TRANSLATIONS_DIR, filename);
      } else {
        await fileStorage.saveSubData(TRANSLATIONS_DIR, filename, data);
      }
    }
  } catch (error) {
    console.error("Error deleting translation:", error);
  }
};

export const getAllTranslatedVideoUrls = async (): Promise<string[]> => {
  try {
    const files = await fileStorage.listSubFiles(TRANSLATIONS_DIR);
    const urls: string[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const data = await fileStorage.loadSubData<VideoTranslations | null>(
          TRANSLATIONS_DIR,
          file,
          null
        );
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
  try {
    // Ensure storage is initialized
    if (!fileStorage.isConfigured()) {
      await fileStorage.initialize();
    }

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
