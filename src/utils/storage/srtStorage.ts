/**
 * SRT Storage - Manual subtitle persistence using cache + file system
 * Uses write-through cache: immediate cache update, background file persistence
 */
import { cacheService } from "@services/cacheService";
import { fileStorage, STORAGE_FILES } from "@services/fileStorageService";
import { extractVideoId } from "@utils/videoUtils";

const SRT_DIR = STORAGE_FILES.srt;

// Helper to get video ID from URL
const getVideoIdFromUrl = (url: string): string => {
  const videoId = extractVideoId(url);
  if (videoId) return videoId;
  // Fallback: hash the URL
  const hash = url.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `srt_${Math.abs(hash)}`;
};

export const saveSRT = async (
  url: string,
  srtContent: string
): Promise<void> => {
  const videoId = getVideoIdFromUrl(url);
  cacheService.setSrt(videoId, srtContent);
};

export const getSRT = async (url: string): Promise<string | null> => {
  await cacheService.waitForInit();
  const videoId = getVideoIdFromUrl(url);

  // Check cache first
  let content = cacheService.getSrt(videoId);
  if (content) return content;

  // Load from file (legacy format with .json extension)
  try {
    const data = await fileStorage.loadSubData<{ content: string } | null>(
      SRT_DIR,
      `${videoId}.srt.json`,
      null
    );
    if (data?.content) {
      cacheService.setSrt(videoId, data.content);
      return data.content;
    }
  } catch {}

  return null;
};

export const removeSRT = async (url: string): Promise<void> => {
  const videoId = getVideoIdFromUrl(url);
  cacheService.deleteSrt(videoId);
};
