import { ThinkingLevel, MediaResolution } from "@google/genai";
import {
  GeminiConfig,
  BatchSettings,
  DEFAULT_BATCH_SETTINGS,
} from "@utils/storage";
import { mergeSrtContents } from "@utils/srtParser";
import { keyManager, isRateLimitError, isRetryableError } from "./keyManager";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Extract video ID and convert to standard YouTube URL
const normalizeYouTubeUrl = (url: string): string => {
  let videoId = "";

  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) videoId = shortMatch[1];

  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) videoId = watchMatch[1];

  const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) videoId = shortsMatch[1];

  if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
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
  startOffset?: string;
  endOffset?: string;
  videoDuration?: number;
  batchSettings?: BatchSettings;
  onBatchProgress?: (progress: BatchProgress) => void;
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

// Translate a single video batch with retry and key rotation
const translateVideoBatch = async (
  videoUrl: string,
  config: GeminiConfig,
  startOffset?: string,
  endOffset?: string
): Promise<string> => {
  let lastError: any = null;
  let skipDelay = false;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0 && !skipDelay) {
      const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(
        `[Gemini] Retry ${attempt}/${MAX_RETRIES} sau ${delayMs}ms...`
      );
      await sleep(delayMs);
    }
    skipDelay = false;

    const ai = keyManager.getCurrentAI();
    if (!ai) {
      throw new Error("Vui lòng thêm API Key trong cài đặt");
    }

    try {
      const videoPart: any = {
        fileData: { fileUri: videoUrl, mimeType: "video/*" },
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
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
        },
      });

      if (attempt > 0) {
        console.log(`[Gemini] ✅ Retry thành công sau ${attempt} lần thử`);
      }

      return response.text || "";
    } catch (error: any) {
      lastError = error;

      // Handle rate limit (429) - rotate key and retry immediately
      if (isRateLimitError(error)) {
        const rotated = keyManager.handleRateLimitError();
        if (rotated && attempt < MAX_RETRIES) {
          console.log(
            `[Gemini] ⚠️ Rate limit, chuyển sang key #${keyManager.getCurrentKeyIndex()}/${keyManager.getTotalKeys()}`
          );
          skipDelay = true;
          continue;
        }
      }

      // Handle retryable errors (503, etc.) - retry with delay
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        console.log(
          `[Gemini] ⚠️ Lỗi ${
            error.status || error.code
          }: Model overloaded, sẽ retry...`
        );
        continue;
      }

      break;
    }
  }

  throw lastError;
};

// Translate video directly from YouTube URL
export const translateVideoWithGemini = async (
  videoUrl: string,
  config: GeminiConfig,
  onChunk?: (text: string) => void,
  options?: VideoTranslateOptions
): Promise<string> => {
  if (!keyManager.hasAvailableKey()) {
    throw new Error("Vui lòng thêm API Key trong cài đặt");
  }

  const normalizedUrl = normalizeYouTubeUrl(videoUrl);
  const batchSettings = options?.batchSettings || DEFAULT_BATCH_SETTINGS;
  const maxDuration = batchSettings.maxVideoDuration;
  const maxConcurrent = batchSettings.maxConcurrentBatches;
  const videoDuration = options?.videoDuration;

  console.log("[Gemini] Starting video translation...");
  console.log("[Gemini] Normalized URL:", normalizedUrl);
  console.log("[Gemini] Using key:", keyManager.getCurrentKeyMasked());
  console.log("[Gemini] Max duration per batch:", maxDuration, "seconds");
  console.log("[Gemini] Video duration:", videoDuration || "unknown");

  try {
    // If video duration is known and exceeds max, split into batches
    if (videoDuration && videoDuration > maxDuration) {
      const numBatches = Math.ceil(videoDuration / maxDuration);
      console.log(`[Gemini] Splitting into ${numBatches} batches...`);

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
          ).then((content) => ({ content, offsetSeconds: startSeconds }))
        );
      }

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

      const mergedSrt = mergeSrtContents(results);
      onChunk?.(mergedSrt);
      return mergedSrt;
    }

    // Single batch translation
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
