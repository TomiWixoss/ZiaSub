/**
 * SRT Storage - Manual subtitle persistence using file system
 */
import { fileStorage, STORAGE_FILES } from "@services/fileStorageService";
import { extractVideoId } from "@utils/videoUtils";

const SRT_DIR = STORAGE_FILES.srt;

// Helper to create safe filename from URL
const createSrtFilename = (url: string): string => {
  const videoId = extractVideoId(url);
  if (videoId) return `${videoId}.srt`;
  // Fallback: hash the URL
  const hash = url.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `srt_${Math.abs(hash)}.srt`;
};

export const saveSRT = async (
  url: string,
  srtContent: string
): Promise<void> => {
  try {
    const filename = createSrtFilename(url);
    // Save as JSON with metadata
    await fileStorage.saveSubData(SRT_DIR, `${filename}.json`, {
      url,
      content: srtContent,
      savedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error saving SRT:", error);
  }
};

export const getSRT = async (url: string): Promise<string | null> => {
  try {
    const filename = createSrtFilename(url);
    const data = await fileStorage.loadSubData<{ content: string } | null>(
      SRT_DIR,
      `${filename}.json`,
      null
    );
    return data?.content || null;
  } catch (error) {
    console.error("Error getting SRT:", error);
    return null;
  }
};

export const removeSRT = async (url: string): Promise<void> => {
  try {
    const filename = createSrtFilename(url);
    await fileStorage.deleteSubData(SRT_DIR, `${filename}.json`);
  } catch (error) {
    console.error("Error removing SRT:", error);
  }
};
