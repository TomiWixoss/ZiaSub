import { ThinkingLevel, MediaResolution } from "@google/genai";
import type {
  GeminiConfig,
  BatchSettings,
  BatchProgress,
  VideoTranslateOptions,
} from "@src/types";
import { DEFAULT_BATCH_SETTINGS } from "@constants/defaults";
import { mergeSrtContents, adjustSrtTimestamps } from "@utils/srtParser";
import { normalizeYouTubeUrl, isShortsUrl } from "@utils/videoUtils";
import { keyManager } from "./keyManager";

// Run promises with concurrency limit - continues on error, collects partial results
const runWithConcurrency = async <T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number,
  onProgress?: (
    completed: number,
    total: number,
    statuses: Array<"pending" | "processing" | "completed" | "error">
  ) => void,
  abortSignal?: AbortSignal
): Promise<{
  results: (T | null)[];
  hasErrors: boolean;
  errorMessage?: string;
  aborted?: boolean;
}> => {
  const results: (T | null)[] = new Array(tasks.length).fill(null);
  const statuses: Array<"pending" | "processing" | "completed" | "error"> =
    new Array(tasks.length).fill("pending");
  let currentIndex = 0;
  let completedCount = 0;
  let hasErrors = false;
  let lastError: string | undefined;
  let aborted = false;

  const runNext = async (): Promise<void> => {
    // Check abort before starting next task
    if (abortSignal?.aborted) {
      aborted = true;
      return;
    }

    const index = currentIndex++;
    if (index >= tasks.length) return;

    statuses[index] = "processing";
    onProgress?.(completedCount, tasks.length, [...statuses]);

    try {
      // Check abort again before executing
      if (abortSignal?.aborted) {
        aborted = true;
        statuses[index] = "error";
        return;
      }

      // Each batch task uses keyManager.executeWithRetry internally
      // which handles retry + key rotation for that specific batch
      results[index] = await tasks[index]();
      statuses[index] = "completed";
      completedCount++;
    } catch (error: any) {
      // Check if aborted
      if (abortSignal?.aborted) {
        aborted = true;
        statuses[index] = "error";
        return;
      }

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

    // Don't continue if aborted
    if (!abortSignal?.aborted) {
      await runNext();
    }
  };

  const workers = Array(Math.min(maxConcurrent, tasks.length))
    .fill(null)
    .map(() => runNext());

  await Promise.all(workers);
  return { results, hasErrors, errorMessage: lastError, aborted };
};

// Map config string to ThinkingLevel enum
const getThinkingLevel = (level?: string): ThinkingLevel => {
  switch (level) {
    case "MINIMAL":
      return ThinkingLevel.MINIMAL;
    case "LOW":
      return ThinkingLevel.LOW;
    case "MEDIUM":
      return ThinkingLevel.MEDIUM;
    case "HIGH":
    default:
      return ThinkingLevel.HIGH;
  }
};

// Map config string to MediaResolution enum
const getMediaResolution = (resolution?: string): MediaResolution => {
  switch (resolution) {
    case "MEDIA_RESOLUTION_LOW":
      return MediaResolution.MEDIA_RESOLUTION_LOW;
    case "MEDIA_RESOLUTION_MEDIUM":
      return MediaResolution.MEDIA_RESOLUTION_MEDIUM;
    case "MEDIA_RESOLUTION_HIGH":
      return MediaResolution.MEDIA_RESOLUTION_HIGH;
    case "MEDIA_RESOLUTION_UNSPECIFIED":
    default:
      return MediaResolution.MEDIA_RESOLUTION_HIGH;
  }
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
        temperature: config.temperature,
        systemInstruction: config.systemPrompt,
        thinkingConfig: {
          thinkingLevel: getThinkingLevel(config.thinkingLevel),
        },
        mediaResolution: getMediaResolution(config.mediaResolution),
      },
    });

    return response.text || "";
  });
};

// Run batches sequentially for streaming mode - apply each result immediately
const runSequentialStreaming = async <T>(
  tasks: (() => Promise<T>)[],
  onBatchComplete: (
    result: T,
    index: number,
    total: number,
    completedIndices: number[]
  ) => void,
  onProgress?: (
    completed: number,
    total: number,
    statuses: Array<"pending" | "processing" | "completed" | "error">
  ) => void,
  abortSignal?: AbortSignal,
  skipIndices?: number[]
): Promise<{
  results: (T | null)[];
  hasErrors: boolean;
  errorMessage?: string;
  aborted?: boolean;
  completedIndices: number[];
}> => {
  const results: (T | null)[] = new Array(tasks.length).fill(null);
  const statuses: Array<"pending" | "processing" | "completed" | "error"> =
    new Array(tasks.length).fill("pending");
  let hasErrors = false;
  let lastError: string | undefined;
  const completedIndices: number[] = [...(skipIndices || [])];

  // Mark skipped batches as completed
  for (const idx of skipIndices || []) {
    statuses[idx] = "completed";
  }

  for (let i = 0; i < tasks.length; i++) {
    // Skip already completed batches
    if (skipIndices?.includes(i)) {
      continue;
    }

    // Check abort before each batch
    if (abortSignal?.aborted) {
      console.log(`[Gemini] Aborted at batch ${i + 1}`);
      return {
        results,
        hasErrors,
        errorMessage: lastError,
        aborted: true,
        completedIndices,
      };
    }

    statuses[i] = "processing";
    onProgress?.(completedIndices.length, tasks.length, [...statuses]);

    try {
      const result = await tasks[i]();

      // Check abort after batch completes
      if (abortSignal?.aborted) {
        console.log(`[Gemini] Aborted after batch ${i + 1}`);
        return {
          results,
          hasErrors,
          errorMessage: lastError,
          aborted: true,
          completedIndices,
        };
      }

      results[i] = result;
      statuses[i] = "completed";
      completedIndices.push(i);
      // Immediately notify about completed batch for streaming
      onBatchComplete(result, i, tasks.length, completedIndices);
    } catch (error: any) {
      statuses[i] = "error";
      hasErrors = true;
      lastError = error.message || "Có lỗi xảy ra";
      console.error(`[Gemini] Batch ${i + 1} failed:`, error.message);
    }

    onProgress?.(completedIndices.length, tasks.length, [...statuses]);
  }

  return { results, hasErrors, errorMessage: lastError, completedIndices };
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
  const isShorts = isShortsUrl(videoUrl);
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
  console.log("[Gemini] Is Shorts:", isShorts);
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
    // Shorts videos are typically under 60 seconds, so skip batching for them
    // Check if we need to split into batches
    // Only split if effective duration exceeds (maxDuration + batchOffset) AND not a Shorts video
    const effectiveMaxDuration = maxDuration + batchOffset;
    const shouldSplit =
      !isShorts &&
      effectiveDuration &&
      effectiveDuration > effectiveMaxDuration;

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

      // Calculate which batch indices to skip based on skipRanges
      const skipIndices: number[] = [];
      if (options?.skipRanges && options.skipRanges.length > 0) {
        for (let i = 0; i < batchRanges.length; i++) {
          const range = batchRanges[i];
          // Check if this range is already completed
          const isCompleted = options.skipRanges.some(
            (skip) => skip.start === range.start && skip.end === range.end
          );
          if (isCompleted) {
            skipIndices.push(i);
          }
        }
        console.log(
          `[Gemini] Resuming: skipping ${skipIndices.length} completed batches`
        );
      }

      let accumulatedResults: { content: string; offsetSeconds: number }[] = [];

      // If resuming with existing partial SRT, add it as the first "result"
      // Use offsetSeconds: -1 as a marker that this content already has correct absolute timestamps
      if (options?.existingPartialSrt) {
        accumulatedResults.push({
          content: options.existingPartialSrt,
          offsetSeconds: -1, // Special marker: already has absolute timestamps
        });
        console.log(`[Gemini] Resuming with existing partial SRT`);
      }

      // Use streaming mode (sequential) or concurrent mode based on settings
      if (streamingMode) {
        console.log("[Gemini] Using streaming mode (sequential batches)...");

        const { results, hasErrors, errorMessage, aborted, completedIndices } =
          await runSequentialStreaming(
            batchTasks,
            (result, index, total, allCompletedIndices) => {
              // Accumulate results and merge for streaming preview
              accumulatedResults.push(result);
              const partialSrt = mergeSrtContents([...accumulatedResults]);
              // Build completed ranges from indices
              const completedRanges = allCompletedIndices.map(
                (idx) => batchRanges[idx]
              );
              options?.onBatchComplete?.(
                partialSrt,
                index,
                total,
                completedRanges
              );
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
            },
            options?.abortSignal,
            skipIndices
          );

        // Check if aborted
        if (aborted) {
          throw new Error("Đã dừng dịch");
        }

        const successfulResults = results.filter(
          (r): r is { content: string; offsetSeconds: number } => r !== null
        );

        if (successfulResults.length === 0 && skipIndices.length === 0) {
          throw new Error(errorMessage || "Không dịch được phần nào");
        }

        const finalStatuses = results.map((r, idx) =>
          r !== null || skipIndices.includes(idx) ? "completed" : "error"
        ) as Array<"completed" | "error">;

        options?.onBatchProgress?.({
          totalBatches: numBatches,
          completedBatches: completedIndices.length,
          currentBatch: numBatches,
          status: "completed",
          batchStatuses: finalStatuses,
        });

        const mergedSrt = mergeSrtContents(successfulResults);
        onChunk?.(mergedSrt);
        return mergedSrt;
      }

      // Concurrent mode (original behavior)
      // For concurrent mode, we need to handle skip ranges differently
      // Filter out tasks that should be skipped
      const tasksToRun = batchTasks.filter(
        (_, idx) => !skipIndices.includes(idx)
      );
      const taskIndexMap = batchTasks
        .map((_, idx) => idx)
        .filter((idx) => !skipIndices.includes(idx));

      if (tasksToRun.length === 0) {
        // All batches already completed
        console.log("[Gemini] All batches already completed (resume)");
        return "";
      }

      const {
        results: runResults,
        hasErrors,
        errorMessage,
        aborted,
      } = await runWithConcurrency(
        tasksToRun,
        maxConcurrent,
        (completed, total, statuses) => {
          options?.onBatchProgress?.({
            totalBatches: numBatches,
            completedBatches: completed + skipIndices.length,
            currentBatch:
              statuses.filter((s) => s === "processing").length > 0
                ? taskIndexMap[statuses.findIndex((s) => s === "processing")] +
                  1
                : completed + skipIndices.length,
            status: "processing",
            batchStatuses: batchTasks.map((_, idx) => {
              if (skipIndices.includes(idx)) return "completed";
              const runIdx = taskIndexMap.indexOf(idx);
              return runIdx >= 0 ? statuses[runIdx] : "pending";
            }),
          });
        },
        options?.abortSignal
      );

      // Check if aborted
      if (aborted) {
        throw new Error("Đã dừng dịch");
      }

      // Map results back to original indices
      const results: (typeof runResults)[0][] = new Array(
        batchTasks.length
      ).fill(null);
      runResults.forEach((result, runIdx) => {
        results[taskIndexMap[runIdx]] = result;
      });

      // Filter out failed batches (null results)
      const successfulResults = results.filter(
        (r): r is { content: string; offsetSeconds: number } => r !== null
      );

      if (successfulResults.length === 0 && skipIndices.length === 0) {
        // All batches failed
        throw new Error(errorMessage || "Không dịch được phần nào");
      }

      const finalStatuses = results.map((r, idx) =>
        r !== null || skipIndices.includes(idx) ? "completed" : "error"
      ) as Array<"completed" | "error">;

      if (hasErrors) {
        console.log(
          `[Gemini] ${
            successfulResults.length + skipIndices.length
          }/${numBatches} batches completed, merging partial SRT...`
        );
        options?.onBatchProgress?.({
          totalBatches: numBatches,
          completedBatches: successfulResults.length + skipIndices.length,
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

    // Check abort before single batch
    if (options?.abortSignal?.aborted) {
      throw new Error("Đã dừng dịch");
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

    // Check abort after single batch
    if (options?.abortSignal?.aborted) {
      throw new Error("Đã dừng dịch");
    }

    // Adjust timestamps if translating a custom range starting after 0
    // AI might return timestamps starting from 0 instead of rangeStart
    const adjustedResult =
      rangeStart > 0 ? adjustSrtTimestamps(result, rangeStart) : result;

    options?.onBatchProgress?.({
      totalBatches: 1,
      completedBatches: 1,
      currentBatch: 1,
      status: "completed",
      batchStatuses: ["completed"],
    });

    // For single batch in streaming mode, also call onBatchComplete
    if (streamingMode) {
      const completedRanges =
        rangeStart !== undefined && rangeEnd !== undefined
          ? [{ start: rangeStart, end: rangeEnd }]
          : [{ start: 0, end: options?.videoDuration || 0 }];
      options?.onBatchComplete?.(adjustedResult, 0, 1, completedRanges);
    }

    onChunk?.(adjustedResult);
    return adjustedResult;
  } catch (error: any) {
    // Don't log error if user stopped translation
    const isUserStopped =
      error.message === "Đã dừng dịch" || options?.abortSignal?.aborted;
    if (!isUserStopped) {
      console.error("[Gemini] Error:", error);
    }
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
