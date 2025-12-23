/**
 * Hook for managing translation queue
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { queueManager } from "@services/queueManager";
import { translationManager } from "@services/translationManager";
import { extractVideoId } from "@utils/videoUtils";
import {
  getFullyTranslatedVideoUrls,
  getPartialOnlyVideoUrls,
} from "@utils/storage";
import { WebView } from "react-native-webview";

interface UseTranslationQueueOptions {
  webViewRef: React.RefObject<WebView | null>;
  currentUrlRef: React.RefObject<string>;
  onTranslationComplete?: (srt: string) => void;
}

export const useTranslationQueue = ({
  webViewRef,
  currentUrlRef,
  onTranslationComplete,
}: UseTranslationQueueOptions) => {
  const [queueCount, setQueueCount] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isWaitingInQueue, setIsWaitingInQueue] = useState(false);
  const [isPausedInQueue, setIsPausedInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [pausedProgress, setPausedProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [translationProgress, setTranslationProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  // Track the video URL that is currently being translated for THIS video
  const currentTranslatingUrlRef = useRef<string | null>(null);

  // Check if current video is waiting in queue or paused
  const checkQueueStatus = useCallback(() => {
    if (!currentUrlRef.current) {
      setIsWaitingInQueue(false);
      setIsPausedInQueue(false);
      setQueuePosition(null);
      setPausedProgress(null);
      return;
    }

    const queueStatus = queueManager.getVideoQueueStatus(currentUrlRef.current);

    // Check if paused
    if (queueStatus.inQueue && queueStatus.status === "paused") {
      setIsPausedInQueue(true);
      setIsWaitingInQueue(false);
      setQueuePosition(null);
      // Get paused progress from queue item
      const queueItem = queueManager.isInQueue(currentUrlRef.current);
      if (queueItem && queueItem.completedBatches && queueItem.totalBatches) {
        setPausedProgress({
          completed: queueItem.completedBatches,
          total: queueItem.totalBatches,
        });
      } else {
        setPausedProgress(null);
      }
      return;
    }

    // Reset paused state
    setIsPausedInQueue(false);
    setPausedProgress(null);

    if (queueStatus.inQueue && queueStatus.status === "translating") {
      // Check if this is a batch retranslation - should NOT show as waiting
      const queueItem = queueManager.isInQueue(currentUrlRef.current);
      if (queueItem?.retranslateBatchIndex !== undefined) {
        // Batch retranslation - don't show waiting state, let user do other things
        setIsWaitingInQueue(false);
        setQueuePosition(null);
        return;
      }

      // Video is in translating queue - check if it's actually being translated
      const currentJob = translationManager.getCurrentJob();
      const currentVideoId = extractVideoId(currentUrlRef.current);
      const jobVideoId = currentJob
        ? extractVideoId(currentJob.videoUrl)
        : null;

      if (
        currentJob &&
        jobVideoId === currentVideoId &&
        currentJob.status === "processing"
      ) {
        // This video is actively being translated (full translation)
        // Check if it's batch retranslation - don't show waiting
        if (
          currentJob.rangeStart !== undefined &&
          currentJob.rangeEnd !== undefined
        ) {
          setIsWaitingInQueue(false);
          setQueuePosition(null);
        } else {
          setIsWaitingInQueue(false);
          setQueuePosition(null);
        }
      } else {
        // This video is waiting in queue
        setIsWaitingInQueue(true);
        setQueuePosition(queueStatus.position || null);
      }
    } else {
      setIsWaitingInQueue(false);
      setQueuePosition(null);
    }
  }, [currentUrlRef]);

  // Sync translated video IDs to WebView
  const syncTranslatedVideosToWebView = useCallback(async () => {
    // Get fully translated videos (have at least one complete translation)
    const fullyTranslatedUrls = await getFullyTranslatedVideoUrls();
    const fullyTranslatedIds = fullyTranslatedUrls
      .map((url) => extractVideoId(url))
      .filter((id): id is string => id !== null);

    // Get partial only videos (only have partial translations)
    const partialOnlyUrls = await getPartialOnlyVideoUrls();
    const partialOnlyIds = partialOnlyUrls
      .map((url) => extractVideoId(url))
      .filter((id): id is string => id !== null);

    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: "setTranslatedVideos",
          payload: {
            full: fullyTranslatedIds,
            partial: partialOnlyIds,
          },
        })
      );
    }
  }, [webViewRef]);

  // Sync queued video IDs to WebView
  const syncQueuedVideosToWebView = useCallback(() => {
    const { items: queueItems } = queueManager.getItemsByStatus("all");
    const videoIds = queueItems
      .filter(
        (item) => item.status === "pending" || item.status === "translating"
      )
      .map((item) => extractVideoId(item.videoUrl))
      .filter((id): id is string => id !== null);

    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({ type: "setQueuedVideos", payload: videoIds })
      );
    }
  }, [webViewRef]);

  // Sync all data to WebView
  const syncAllToWebView = useCallback(async () => {
    await syncTranslatedVideosToWebView();
    syncQueuedVideosToWebView();
  }, [syncTranslatedVideosToWebView, syncQueuedVideosToWebView]);

  // Initialize queue manager and subscribe to updates
  useEffect(() => {
    queueManager.initialize();
    const unsubscribe = queueManager.subscribe(() => {
      const counts = queueManager.getCounts();
      setQueueCount(counts.pending + counts.translating);
      syncQueuedVideosToWebView();
      checkQueueStatus();
    });
    return () => unsubscribe();
  }, [syncQueuedVideosToWebView, checkQueueStatus]);

  // Subscribe to translation manager for auto-apply
  useEffect(() => {
    const unsubscribe = translationManager.subscribe((job) => {
      const jobVideoId = extractVideoId(job.videoUrl);
      const currentVideoId = extractVideoId(currentUrlRef.current);

      // Only show translating state if this job is for the current video
      const isCurrentVideo =
        jobVideoId && currentVideoId && jobVideoId === currentVideoId;

      // Check if this is a batch retranslation (has rangeStart and rangeEnd)
      const isBatchRetranslation =
        job.rangeStart !== undefined && job.rangeEnd !== undefined;

      if (isCurrentVideo) {
        // Batch retranslation should NOT affect main isTranslating state
        const isJobProcessing =
          job.status === "processing" && !isBatchRetranslation;
        setIsTranslating(isJobProcessing);

        if (isJobProcessing) {
          currentTranslatingUrlRef.current = job.videoUrl;
          if (job.progress) {
            setTranslationProgress({
              completed: job.progress.completedBatches,
              total: job.progress.totalBatches,
            });
          }
        }

        // Streaming mode: Apply partial result (only for full translation, not batch retranslation)
        if (
          job.status === "processing" &&
          job.partialResult &&
          !isBatchRetranslation
        ) {
          onTranslationComplete?.(job.partialResult);
        }

        // Final result when completed (only for full translation)
        if (job.status === "completed" && job.result && !isBatchRetranslation) {
          onTranslationComplete?.(job.result);
          syncTranslatedVideosToWebView();
          setIsTranslating(false);
          setTranslationProgress(null);
          currentTranslatingUrlRef.current = null;
        }

        // Batch retranslation completed - just sync and check status
        if (job.status === "completed" && isBatchRetranslation) {
          syncTranslatedVideosToWebView();
          checkQueueStatus();
        }

        if (job.status === "error") {
          if (!isBatchRetranslation) {
            setIsTranslating(false);
            setTranslationProgress(null);
            currentTranslatingUrlRef.current = null;
          }
          // Check if video was removed from queue (isBeingRemoved)
          // If so, also reset waiting/paused states
          if (queueManager.isBeingRemoved(job.videoUrl)) {
            setIsWaitingInQueue(false);
            setIsPausedInQueue(false);
            setQueuePosition(null);
            setPausedProgress(null);
          } else {
            checkQueueStatus();
          }
        }
      } else {
        // Different video is being translated - ensure current video shows correct state
        // Check if current video has its own active job
        const currentJob = translationManager.getJobForUrl(
          currentUrlRef.current
        );
        if (!currentJob || currentJob.status !== "processing") {
          setIsTranslating(false);
          setTranslationProgress(null);
        }
        checkQueueStatus();
      }
    });
    return () => unsubscribe();
  }, [
    currentUrlRef,
    onTranslationComplete,
    syncTranslatedVideosToWebView,
    checkQueueStatus,
  ]);

  // Reset state when URL changes
  useEffect(() => {
    const currentVideoId = extractVideoId(currentUrlRef.current);
    const job = translationManager.getCurrentJob();

    if (job) {
      const jobVideoId = extractVideoId(job.videoUrl);
      // Check if this is a batch retranslation
      const isBatchRetranslation =
        job.rangeStart !== undefined && job.rangeEnd !== undefined;

      if (
        jobVideoId === currentVideoId &&
        job.status === "processing" &&
        !isBatchRetranslation
      ) {
        setIsTranslating(true);
        currentTranslatingUrlRef.current = job.videoUrl;
        if (job.progress) {
          setTranslationProgress({
            completed: job.progress.completedBatches,
            total: job.progress.totalBatches,
          });
        }
      } else {
        setIsTranslating(false);
        setTranslationProgress(null);
      }
    } else {
      setIsTranslating(false);
      setTranslationProgress(null);
    }
    checkQueueStatus();
  }, [currentUrlRef.current, checkQueueStatus]);

  return {
    queueCount,
    isTranslating,
    isWaitingInQueue,
    isPausedInQueue,
    queuePosition,
    pausedProgress,
    translationProgress,
    syncAllToWebView,
    syncTranslatedVideosToWebView,
    syncQueuedVideosToWebView,
  };
};
