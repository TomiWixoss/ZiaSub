/**
 * Translation Storage - Gemini translations persistence using AsyncStorage
 */
import { storageService } from "@services/storageService";
import type {
  SavedTranslation,
  VideoTranslations,
  BatchSettings,
} from "@src/types";
import { extractVideoId } from "@utils/videoUtils";

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
  presetId?: string,
  metadata?: {
    videoDuration?: number;
    batchSettings?: BatchSettings;
  }
): Promise<SavedTranslation> => {
  const videoId = getVideoIdFromUrl(videoUrl);

  // Get existing data
  let data = await storageService.getTranslation(videoId);

  // If no data, create fresh
  if (!data || !data.translations) {
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

  // If existingTranslationId provided, update that translation
  if (existingTranslationId) {
    const existingIndex = data.translations.findIndex(
      (t) => t.id === existingTranslationId
    );
    if (existingIndex >= 0) {
      data.translations[existingIndex] = {
        ...data.translations[existingIndex],
        srtContent,
        configName,
        presetId,
        isPartial: false,
        updatedAt: Date.now(),
        videoDuration:
          metadata?.videoDuration ??
          data.translations[existingIndex].videoDuration,
        batchSettings:
          metadata?.batchSettings ??
          data.translations[existingIndex].batchSettings,
      };
      data.activeTranslationId = existingTranslationId;
      await storageService.setTranslation(videoId, data);
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
    videoDuration: metadata?.videoDuration,
    batchSettings: metadata?.batchSettings,
  };

  data.translations.push(newTranslation);
  data.activeTranslationId = newTranslation.id;

  await storageService.setTranslation(videoId, data);
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

  let data = await storageService.getTranslation(videoId);

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

  data.activeTranslationId = partialTranslation.id;
  await storageService.setTranslation(videoId, data);

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
  const videoId = getVideoIdFromUrl(videoUrl);
  return await storageService.getTranslation(videoId);
};

export const setActiveTranslation = async (
  videoUrl: string,
  translationId: string
): Promise<void> => {
  const videoId = getVideoIdFromUrl(videoUrl);
  const data = await storageService.getTranslation(videoId);

  if (data) {
    data.activeTranslationId = translationId;
    await storageService.setTranslation(videoId, data);
  }
};

export const deleteTranslation = async (
  videoUrl: string,
  translationId: string
): Promise<void> => {
  const videoId = getVideoIdFromUrl(videoUrl);
  const data = await storageService.getTranslation(videoId);

  if (data) {
    data.translations = data.translations.filter((t) => t.id !== translationId);

    if (data.activeTranslationId === translationId) {
      data.activeTranslationId = data.translations[0]?.id || null;
    }

    if (data.translations.length === 0) {
      await storageService.deleteTranslation(videoId);
    } else {
      await storageService.setTranslation(videoId, data);
    }
  }
};

export const getAllTranslatedVideoUrls = async (): Promise<string[]> => {
  const videoIds = storageService.getTranslationVideoIds();
  const urls: string[] = [];

  for (const videoId of videoIds) {
    const data = await storageService.getTranslation(videoId);
    if (data?.videoUrl) {
      urls.push(data.videoUrl);
    }
  }

  return urls;
};

// Get video URLs that have at least one full (non-partial) translation
export const getFullyTranslatedVideoUrls = async (): Promise<string[]> => {
  const videoIds = storageService.getTranslationVideoIds();
  const urls: string[] = [];

  for (const videoId of videoIds) {
    const data = await storageService.getTranslation(videoId);
    if (data?.videoUrl && data.translations.some((t) => !t.isPartial)) {
      urls.push(data.videoUrl);
    }
  }

  return urls;
};

// Get video URLs that only have partial translations
export const getPartialOnlyVideoUrls = async (): Promise<string[]> => {
  const videoIds = storageService.getTranslationVideoIds();
  const urls: string[] = [];

  for (const videoId of videoIds) {
    const data = await storageService.getTranslation(videoId);
    if (
      data?.videoUrl &&
      data.translations.length > 0 &&
      data.translations.every((t) => t.isPartial)
    ) {
      urls.push(data.videoUrl);
    }
  }

  return urls;
};

export const hasTranslation = async (videoUrl: string): Promise<boolean> => {
  const videoId = getVideoIdFromUrl(videoUrl);

  // Fast check using index
  if (!storageService.hasTranslationIndex(videoId)) {
    return false;
  }

  // Verify with actual data
  const data = await storageService.getTranslation(videoId);
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
