/**
 * Translation Storage - Gemini translations persistence using cache + file system
 * Uses write-through cache: immediate cache update, background file persistence
 */
import { cacheService } from "@services/cacheService";
import { fileStorage, STORAGE_FILES } from "@services/fileStorageService";
import type {
  SavedTranslation,
  VideoTranslations,
  BatchSettings,
} from "@src/types";
import { extractVideoId } from "@utils/videoUtils";

const TRANSLATIONS_DIR = STORAGE_FILES.translations;

// Helper to get video ID from URL
const getVideoIdFromUrl = (videoUrl: string): string => {
  if (!videoUrl) {
    throw new Error("Video URL is required");
  }
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
  configName: string,
  existingTranslationId?: string,
  presetId?: string
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

  // Remove any partial translation with same config (it's now complete)
  data.translations = data.translations.filter(
    (t) => !(t.isPartial && t.configName === configName)
  );

  // If existingTranslationId provided, update that translation instead of creating new
  if (existingTranslationId) {
    const existingIndex = data.translations.findIndex(
      (t) => t.id === existingTranslationId
    );
    if (existingIndex >= 0) {
      // Update existing translation
      data.translations[existingIndex] = {
        ...data.translations[existingIndex],
        srtContent,
        configName,
        presetId,
        isPartial: false,
        updatedAt: Date.now(),
      };
      data.activeTranslationId = existingTranslationId;
      cacheService.setTranslation(videoId, data);
      return data.translations[existingIndex];
    }
  }

  // Create new translation
  const newTranslation: SavedTranslation = {
    id: Date.now().toString(),
    srtContent,
    createdAt: Date.now(),
    configName,
    presetId,
    isPartial: false,
  };

  data.translations.push(newTranslation);
  data.activeTranslationId = newTranslation.id;

  // Update cache (will persist in background)
  cacheService.setTranslation(videoId, data);

  return newTranslation;
};

// Save partial translation for resume support
export const savePartialTranslation = async (
  videoUrl: string,
  srtContent: string,
  configName: string,
  metadata: {
    completedBatches: number;
    totalBatches: number;
    rangeStart?: number;
    rangeEnd?: number;
    videoDuration?: number;
    batchSettings?: BatchSettings;
    batchStatuses?: Array<"pending" | "completed" | "error">;
    presetId?: string;
  }
): Promise<SavedTranslation> => {
  const videoId = getVideoIdFromUrl(videoUrl);

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

  // Find existing partial translation with same config to update
  const existingPartialIndex = data.translations.findIndex(
    (t) => t.isPartial && t.configName === configName
  );

  // Generate batchStatuses if not provided
  const batchStatuses =
    metadata.batchStatuses ||
    Array.from({ length: metadata.totalBatches }, (_, i) =>
      i < metadata.completedBatches
        ? ("completed" as const)
        : ("pending" as const)
    );

  const partialTranslation: SavedTranslation = {
    id:
      existingPartialIndex >= 0
        ? data.translations[existingPartialIndex].id
        : `partial_${Date.now()}`,
    srtContent,
    createdAt: Date.now(),
    configName,
    presetId: metadata.presetId,
    isPartial: true,
    completedBatches: metadata.completedBatches,
    totalBatches: metadata.totalBatches,
    rangeStart: metadata.rangeStart,
    rangeEnd: metadata.rangeEnd,
    videoDuration: metadata.videoDuration,
    batchSettings: metadata.batchSettings,
    batchStatuses,
  };

  if (existingPartialIndex >= 0) {
    data.translations[existingPartialIndex] = partialTranslation;
  } else {
    data.translations.push(partialTranslation);
  }

  // Set as active so user can see partial result
  data.activeTranslationId = partialTranslation.id;

  cacheService.setTranslation(videoId, data);

  return partialTranslation;
};

// Get partial translation for resume
export const getPartialTranslation = async (
  videoUrl: string,
  configName?: string
): Promise<SavedTranslation | null> => {
  const data = await getVideoTranslations(videoUrl);
  if (!data) return null;

  const partial = data.translations.find(
    (t) => t.isPartial && (!configName || t.configName === configName)
  );
  return partial || null;
};

export const getVideoTranslations = async (
  videoUrl: string
): Promise<VideoTranslations | null> => {
  await cacheService.waitForInit();
  const videoId = getVideoIdFromUrl(videoUrl);

  // Check cache first
  let data = cacheService.getTranslation(videoId);
  if (data) {
    // Return null if translations array is empty (deleted state)
    if (data.translations.length === 0) return null;
    return data;
  }

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

// Get video URLs that have at least one full (non-partial) translation
export const getFullyTranslatedVideoUrls = async (): Promise<string[]> => {
  await cacheService.waitForInit();

  try {
    const files = await fileStorage.listSubFiles(TRANSLATIONS_DIR);
    const urls: string[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const videoId = file.replace(".json", "");

        let data = cacheService.getTranslation(videoId);
        if (!data) {
          data = await cacheService.loadTranslation(videoId, fileStorage);
        }

        // Only include if has at least one full translation
        if (data?.videoUrl && data.translations.some((t) => !t.isPartial)) {
          urls.push(data.videoUrl);
        }
      }
    }

    return urls;
  } catch (error) {
    console.error("Error getting fully translated videos:", error);
    return [];
  }
};

// Get video URLs that only have partial translations (no full translation)
export const getPartialOnlyVideoUrls = async (): Promise<string[]> => {
  await cacheService.waitForInit();

  try {
    const files = await fileStorage.listSubFiles(TRANSLATIONS_DIR);
    const urls: string[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const videoId = file.replace(".json", "");

        let data = cacheService.getTranslation(videoId);
        if (!data) {
          data = await cacheService.loadTranslation(videoId, fileStorage);
        }

        // Only include if has translations but ALL are partial
        if (
          data?.videoUrl &&
          data.translations.length > 0 &&
          data.translations.every((t) => t.isPartial)
        ) {
          urls.push(data.videoUrl);
        }
      }
    }

    return urls;
  } catch (error) {
    console.error("Error getting partial only videos:", error);
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
