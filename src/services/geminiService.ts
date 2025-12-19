import { GoogleGenAI, ThinkingLevel, MediaResolution } from "@google/genai";
import {
  GeminiConfig,
  BatchSettings,
  DEFAULT_BATCH_SETTINGS,
} from "@utils/storage";
import { mergeSrtContents } from "@utils/srtParser";

// Translate SRT content
export const translateWithGemini = async (
  srtContent: string,
  config: GeminiConfig,
  onChunk?: (text: string) => void
): Promise<string> => {
  if (!config.apiKey) {
    throw new Error("Vui lòng cấu hình API Key trong cài đặt");
  }

  const ai = new GoogleGenAI({
    apiKey: config.apiKey,
  });

  const response = await ai.models.generateContentStream({
    model: config.model,
    contents: srtContent,
    config: {
      temperature: config.temperature,
      systemInstruction: config.systemPrompt,
    },
  });

  let fullText = "";

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) {
      fullText += text;
      onChunk?.(fullText);
    }
  }

  return fullText;
};

// Extract video ID and convert to standard YouTube URL
const normalizeYouTubeUrl = (url: string): string => {
  let videoId = "";

  // Handle youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }

  // Handle youtube.com/watch?v=VIDEO_ID or m.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }

  // Handle youtube.com/shorts/VIDEO_ID
  const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) {
    videoId = shortsMatch[1];
  }

  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  // Return original if can't parse
  return url;
};

// Batch progress info
export interface BatchProgress {
  totalBatches: number;
  completedBatches: number;
  currentBatch: number;
  status: "pending" | "processing" | "completed" | "error";
  batchStatuses: Array<"pending" | "processing" | "completed" | "error">;
}

// Options for video translation
export interface VideoTranslateOptions {
  startOffset?: string; // e.g., "60s" or "1250s"
  endOffset?: string; // e.g., "120s" or "1570s"
  videoDuration?: number; // Total video duration in seconds (for batch splitting)
  batchSettings?: BatchSettings; // Batch translation settings
  onBatchProgress?: (progress: BatchProgress) => void; // Callback for batch progress
}

// Run promises with concurrency limit
const runWithConcurrency = async <T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number,
  onProgress?: (
    completed: number,
    total: number,
    statuses: Array<"pending" | "processing" | "completed" | "error">
  ) => void
): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  const statuses: Array<"pending" | "processing" | "completed" | "error"> =
    new Array(tasks.length).fill("pending");
  let currentIndex = 0;
  let completedCount = 0;

  const runNext = async (): Promise<void> => {
    const index = currentIndex++;
    if (index >= tasks.length) return;

    statuses[index] = "processing";
    onProgress?.(completedCount, tasks.length, [...statuses]);

    try {
      results[index] = await tasks[index]();
      statuses[index] = "completed";
      completedCount++;
    } catch (error) {
      statuses[index] = "error";
      throw error;
    }

    onProgress?.(completedCount, tasks.length, [...statuses]);
    await runNext();
  };

  const workers = Array(Math.min(maxConcurrent, tasks.length))
    .fill(null)
    .map(() => runNext());

  await Promise.all(workers);
  return results;
};

// Translate a single video batch
const translateVideoBatch = async (
  videoUrl: string,
  config: GeminiConfig,
  startOffset?: string,
  endOffset?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });

  const videoPart: any = {
    fileData: {
      fileUri: videoUrl,
      mimeType: "video/*",
    },
  };

  if (startOffset || endOffset) {
    videoPart.videoMetadata = {};
    if (startOffset) videoPart.videoMetadata.startOffset = startOffset;
    if (endOffset) videoPart.videoMetadata.endOffset = endOffset;
  }

  const contents = [
    {
      role: "user" as const,
      parts: [
        videoPart,
        { text: "Hãy tạo phụ đề SRT tiếng Việt cho video này." },
      ],
    },
  ];

  const response = await ai.models.generateContent({
    model: config.model,
    contents,
    config: {
      temperature: 0.7,
      systemInstruction: config.systemPrompt,
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.HIGH,
      },
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
    },
  });

  return response.text || "";
};

// Translate video directly from YouTube URL (with auto batch splitting for long videos)
export const translateVideoWithGemini = async (
  videoUrl: string,
  config: GeminiConfig,
  onChunk?: (text: string) => void,
  options?: VideoTranslateOptions
): Promise<string> => {
  if (!config.apiKey) {
    throw new Error("Vui lòng cấu hình API Key trong cài đặt");
  }

  const normalizedUrl = normalizeYouTubeUrl(videoUrl);
  const batchSettings = options?.batchSettings || DEFAULT_BATCH_SETTINGS;
  const maxDuration = batchSettings.maxVideoDuration;
  const maxConcurrent = batchSettings.maxConcurrentBatches;
  const videoDuration = options?.videoDuration;

  console.log("[Gemini] Starting video translation...");
  console.log("[Gemini] Normalized URL:", normalizedUrl);
  console.log("[Gemini] Max duration per batch:", maxDuration, "seconds");
  console.log("[Gemini] Max concurrent batches:", maxConcurrent);
  console.log("[Gemini] Video duration:", videoDuration || "unknown");

  try {
    // If video duration is known and exceeds max, split into batches
    if (videoDuration && videoDuration > maxDuration) {
      const numBatches = Math.ceil(videoDuration / maxDuration);
      console.log(`[Gemini] Splitting into ${numBatches} batches...`);

      // Initialize batch progress
      const initialStatuses: Array<
        "pending" | "processing" | "completed" | "error"
      > = new Array(numBatches).fill("pending");

      options?.onBatchProgress?.({
        totalBatches: numBatches,
        completedBatches: 0,
        currentBatch: 0,
        status: "processing",
        batchStatuses: initialStatuses,
      });

      // Create batch tasks (functions that return promises)
      const batchTasks: (() => Promise<{
        content: string;
        offsetSeconds: number;
      }>)[] = [];

      for (let i = 0; i < numBatches; i++) {
        const startSeconds = i * maxDuration;
        const endSeconds = Math.min((i + 1) * maxDuration, videoDuration);

        console.log(
          `[Gemini] Batch ${i + 1}: ${startSeconds}s - ${endSeconds}s`
        );

        batchTasks.push(() =>
          translateVideoBatch(
            normalizedUrl,
            config,
            `${startSeconds}s`,
            `${endSeconds}s`
          ).then((content) => ({
            content,
            offsetSeconds: startSeconds,
          }))
        );
      }

      // Execute batches with concurrency limit
      const results = await runWithConcurrency(
        batchTasks,
        maxConcurrent,
        (completed, total, statuses) => {
          options?.onBatchProgress?.({
            totalBatches: total,
            completedBatches: completed,
            currentBatch:
              statuses.filter((s) => s === "processing").length > 0
                ? statuses.findIndex((s) => s === "processing") + 1
                : completed,
            status: "processing",
            batchStatuses: statuses,
          });
        }
      );

      console.log("[Gemini] All batches completed, merging SRT...");
      options?.onBatchProgress?.({
        totalBatches: numBatches,
        completedBatches: numBatches,
        currentBatch: numBatches,
        status: "completed",
        batchStatuses: new Array(numBatches).fill("completed"),
      });

      // Merge all SRT parts
      const mergedSrt = mergeSrtContents(results);
      onChunk?.(mergedSrt);
      return mergedSrt;
    }

    // Single batch translation (video is short enough or duration unknown)
    console.log("[Gemini] Single batch translation...");
    options?.onBatchProgress?.({
      totalBatches: 1,
      completedBatches: 0,
      currentBatch: 1,
      status: "processing",
      batchStatuses: ["processing"],
    });

    const result = await translateVideoBatch(
      normalizedUrl,
      config,
      options?.startOffset,
      options?.endOffset
    );

    options?.onBatchProgress?.({
      totalBatches: 1,
      completedBatches: 1,
      currentBatch: 1,
      status: "completed",
      batchStatuses: ["completed"],
    });

    onChunk?.(result);
    return result;
  } catch (error: any) {
    console.error("[Gemini] Error:", error);
    options?.onBatchProgress?.({
      totalBatches: 1,
      completedBatches: 0,
      currentBatch: 0,
      status: "error",
      batchStatuses: ["error"],
    });
    throw error;
  }
};
