import { ThinkingLevel, MediaResolution } from "@google/genai";
import {
  GeminiConfig,
  BatchSettings,
  DEFAULT_BATCH_SETTINGS,
} from "@utils/storage";
import { mergeSrtContents } from "@utils/srtParser";
import { keyManager, KeyStatusCallback } from "./keyManager";

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
  onKeyStatus?: KeyStatusCallback;
  // Custom range translation (in seconds)
  rangeStart?: number;
  rangeEnd?: number;
  // Streaming mode callback - called when each batch completes with partial SRT
  onBatchComplete?: (
    partialSrt: string,
    batchIndex: number,
    totalBatches: number
  ) => void;
}

// Run promises with concurrency limit - continues on error, collects partial results
const runWithConcurrency = async <T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number,
  onProgress?: (
    completed: number,
    total: number,
    statuses: Array<"pending" | "processing" | "completed" | "error">
  ) => void
): Promise<{
  results: (T | null)[];
  hasErrors: boolean;
  errorMessage?: string;
}> => {
  const results: (T | null)[] = new Array(tasks.length).fill(null);
  const statuses: Array<"pending" | "processing" | "completed" | "error"> =
    new Array(tasks.length).fill("pending");
  let currentIndex = 0;
  let completedCount = 0;
  let hasErrors = false;
  let lastError: string | undefined;

  const runNext = async (): Promise<void> => {
    const index = currentIndex++;
    if (index >= tasks.length) return;

    statuses[index] = "processing";
    onProgress?.(completedCount, tasks.length, [...statuses]);

    try {
      // Each batch task uses keyManager.executeWithRetry internally
      // which handles retry + key rotation for that specific batch
      results[index] = await tasks[index]();
      statuses[index] = "completed";
      completedCount++;
    } catch (error: any) {
      // Only reaches here after all retries exhausted (executeWithRetry handles retries)
      statuses[index] = "error";
      hasErrors = true;
      lastError = error.message || "Có lỗi xảy ra";
      console.error(
        `[Gemini] Batch ${index + 1} failed after all retries:`,
        error.message
      );
    }

    onProgress?.(completedCount, tasks.length, [...statuses]);
    await runNext();
  };

  const workers = Array(Math.min(maxConcurrent, tasks.length))
    .fill(null)
    .map(() => runNext());

  await Promise.all(workers);
  return { results, hasErrors, errorMessage: lastError };
};

// Translate a single video batch with automatic key rotation
const translateVideoBatch = async (
  videoUrl: string,
  config: GeminiConfig,
  startOffset?: string,
  endOffset?: string
): Promise<string> => {
  return keyManager.executeWithRetry(async (ai) => {
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

    return response.text || "";
  });
};

// Run batches sequentially for streaming mode - apply each result immediately
const runSequentialStreaming = async <T>(
  tasks: (() => Promise<T>)[],
  onBatchComplete: (result: T, index: number, total: number) => void,
  onProgress?: (
    completed: number,
    total: number,
    statuses: Array<"pending" | "processing" | "completed" | "error">
  ) => void
): Promise<{
  results: (T | null)[];
  hasErrors: boolean;
  errorMessage?: string;
}> => {
  const results: (T | null)[] = new Array(tasks.length).fill(null);
  const statuses: Array<"pending" | "processing" | "completed" | "error"> =
    new Array(tasks.length).fill("pending");
  let hasErrors = false;
  let lastError: string | undefined;

  for (let i = 0; i < tasks.length; i++) {
    statuses[i] = "processing";
    onProgress?.(i, tasks.length, [...statuses]);

    try {
      const result = await tasks[i]();
      results[i] = result;
      statuses[i] = "completed";
      // Immediately notify about completed batch for streaming
      onBatchComplete(result, i, tasks.length);
    } catch (error: any) {
      statuses[i] = "error";
      hasErrors = true;
      lastError = error.message || "Có lỗi xảy ra";
      console.error(`[Gemini] Batch ${i + 1} failed:`, error.message);
    }

    onProgress?.(i + 1, tasks.length, [...statuses]);
  }

  return { results, hasErrors, errorMessage: lastError };
};

// Translate video directly from YouTube URL
export const translateVideoWithGemini = async (
  videoUrl: string,
  config: GeminiConfig,
  onChunk?: (text: string) => void,
  options?: VideoTranslateOptions
): Promise<string> => {
  if (!keyManager.hasAvailableKey()) {
    throw new Error("Thêm key trong Cài đặt trước nhé");
  }

  // Set key status callback
  if (options?.onKeyStatus) {
    keyManager.setStatusCallback(options.onKeyStatus);
  }

  const normalizedUrl = normalizeYouTubeUrl(videoUrl);
  const batchSettings = options?.batchSettings || DEFAULT_BATCH_SETTINGS;
  const maxDuration = batchSettings.maxVideoDuration;
  const maxConcurrent = batchSettings.maxConcurrentBatches;
  const batchOffset = batchSettings.batchOffset ?? 60; // Default 60s tolerance
  const streamingMode = batchSettings.streamingMode ?? false;
  const presubMode = batchSettings.presubMode ?? false;
  const presubDuration = batchSettings.presubDuration ?? 120; // 2 minutes default

  // Use custom range if provided, otherwise use full video duration
  // rangeStart defaults to 0, rangeEnd defaults to videoDuration
  const rangeStart = options?.rangeStart ?? 0;
  const rangeEnd = options?.rangeEnd ?? options?.videoDuration;
  const effectiveDuration = rangeEnd
    ? rangeEnd - rangeStart
    : options?.videoDuration;

  console.log("[Gemini] Starting video translation...");
  console.log("[Gemini] Normalized URL:", normalizedUrl);
  console.log("[Gemini] Using key:", keyManager.getCurrentKeyMasked());
  console.log("[Gemini] Max duration per batch:", maxDuration, "seconds");
  console.log("[Gemini] Batch offset tolerance:", batchOffset, "seconds");
  console.log("[Gemini] Video duration:", options?.videoDuration || "unknown");
  console.log("[Gemini] Range:", rangeStart, "-", rangeEnd || "end");
  console.log("[Gemini] Streaming mode:", streamingMode);
  console.log(
    "[Gemini] Presub mode:",
    presubMode,
    presubMode ? `(${presubDuration}s)` : ""
  );

  try {
    // Check if we need to split into batches
    // Only split if effective duration exceeds (maxDuration + batchOffset)
    const effectiveMaxDuration = maxDuration + batchOffset;
    const shouldSplit =
      effectiveDuration && effectiveDuration > effectiveMaxDuration;

    if (shouldSplit) {
      // Calculate batches with presub mode support
      // In presub mode, first batch uses presubDuration, rest use maxDuration
      const batchRanges: { start: number; end: number }[] = [];
      let currentPos = rangeStart;
      const finalEnd = rangeEnd || (options?.videoDuration ?? Infinity);

      while (currentPos < finalEnd) {
        const isFirstBatch = batchRanges.length === 0;
        const batchDuration =
          presubMode && isFirstBatch ? presubDuration : maxDuration;
        const batchEnd = Math.min(currentPos + batchDuration, finalEnd);
        batchRanges.push({ start: currentPos, end: batchEnd });
        currentPos = batchEnd;
      }

      const numBatches = batchRanges.length;
      console.log(`[Gemini] Splitting into ${numBatches} batches...`);
      if (presubMode) {
        console.log(
          `[Gemini] Presub mode: first batch ${presubDuration}s, rest ${maxDuration}s`
        );
      }

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
        const { start: startSeconds, end: endSeconds } = batchRanges[i];

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

      let accumulatedResults: { content: string; offsetSeconds: number }[] = [];

      // Use streaming mode (sequential) or concurrent mode based on settings
      if (streamingMode) {
        console.log("[Gemini] Using streaming mode (sequential batches)...");

        const { results, hasErrors, errorMessage } =
          await runSequentialStreaming(
            batchTasks,
            (result, index, total) => {
              // Accumulate results and merge for streaming preview
              accumulatedResults.push(result);
              const partialSrt = mergeSrtContents([...accumulatedResults]);
              options?.onBatchComplete?.(partialSrt, index, total);
            },
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

        const successfulResults = results.filter(
          (r): r is { content: string; offsetSeconds: number } => r !== null
        );

        if (successfulResults.length === 0) {
          throw new Error(errorMessage || "Không dịch được phần nào");
        }

        const finalStatuses = results.map((r) =>
          r !== null ? "completed" : "error"
        ) as Array<"completed" | "error">;

        options?.onBatchProgress?.({
          totalBatches: numBatches,
          completedBatches: successfulResults.length,
          currentBatch: numBatches,
          status: "completed",
          batchStatuses: finalStatuses,
        });

        const mergedSrt = mergeSrtContents(successfulResults);
        onChunk?.(mergedSrt);
        return mergedSrt;
      }

      // Concurrent mode (original behavior)
      const { results, hasErrors, errorMessage } = await runWithConcurrency(
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

      // Filter out failed batches (null results)
      const successfulResults = results.filter(
        (r): r is { content: string; offsetSeconds: number } => r !== null
      );

      if (successfulResults.length === 0) {
        // All batches failed
        throw new Error(errorMessage || "Không dịch được phần nào");
      }

      const finalStatuses = results.map((r) =>
        r !== null ? "completed" : "error"
      ) as Array<"completed" | "error">;

      if (hasErrors) {
        console.log(
          `[Gemini] ${successfulResults.length}/${numBatches} batches completed, merging partial SRT...`
        );
        options?.onBatchProgress?.({
          totalBatches: numBatches,
          completedBatches: successfulResults.length,
          currentBatch: numBatches,
          status: "completed",
          batchStatuses: finalStatuses,
        });
      } else {
        console.log("[Gemini] All batches completed, merging SRT...");
        options?.onBatchProgress?.({
          totalBatches: numBatches,
          completedBatches: numBatches,
          currentBatch: numBatches,
          status: "completed",
          batchStatuses: new Array(numBatches).fill("completed"),
        });
      }

      const mergedSrt = mergeSrtContents(successfulResults);
      onChunk?.(mergedSrt);
      return mergedSrt;
    }

    // Single batch translation (with custom range support)
    console.log("[Gemini] Single batch translation...");
    options?.onBatchProgress?.({
      totalBatches: 1,
      completedBatches: 0,
      currentBatch: 1,
      status: "processing",
      batchStatuses: ["processing"],
    });

    const startOffset =
      rangeStart > 0 ? `${rangeStart}s` : options?.startOffset;
    const endOffset = rangeEnd ? `${rangeEnd}s` : options?.endOffset;

    const result = await translateVideoBatch(
      normalizedUrl,
      config,
      startOffset,
      endOffset
    );

    options?.onBatchProgress?.({
      totalBatches: 1,
      completedBatches: 1,
      currentBatch: 1,
      status: "completed",
      batchStatuses: ["completed"],
    });

    // For single batch in streaming mode, also call onBatchComplete
    if (streamingMode) {
      options?.onBatchComplete?.(result, 0, 1);
    }

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
  } finally {
    // Clear callback when done
    keyManager.setStatusCallback(undefined);
  }
};
