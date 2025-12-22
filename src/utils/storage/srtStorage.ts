/**
 * SRT Storage - Manual subtitle persistence using AsyncStorage
 */
import { storageService } from "@services/storageService";
import { extractVideoId } from "@utils/videoUtils";

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
  await storageService.setSrt(videoId, srtContent);
};

export const getSRT = async (url: string): Promise<string | null> => {
  const videoId = getVideoIdFromUrl(url);
  return await storageService.getSrt(videoId);
};

export const removeSRT = async (url: string): Promise<void> => {
  const videoId = getVideoIdFromUrl(url);
  await storageService.deleteSrt(videoId);
};
