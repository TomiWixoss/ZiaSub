/**
 * Hook for managing translation queue
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { queueManager, QueueItem } from "@services/queueManager";
import { translationManager } from "@services/translationManager";
import { extractVideoId } from "@utils/videoUtils";
import { getAllTranslatedVideoUrls } from "@utils/storage";
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
  const [translationProgress, setTranslationProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  // Track the video URL that is currently being translated for THIS video
  const currentTranslatingUrlRef = useRef<string | null>(null);

  // Sync translated video IDs to WebView
  const syncTranslatedVideosToWebView = useCallback(async () => {
    const urls = await getAllTranslatedVideoUrls();
    const videoIds = urls
      .map((url) => extractVideoId(url))
      .filter((id): id is string => id !== null);

    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({ type: "setTranslatedVideos", payload: videoIds })
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
    });
    return () => unsubscribe();
  }, [syncQueuedVideosToWebView]);

  // Subscribe to translation manager for auto-apply
  useEffect(() => {
    const unsubscribe = translationManager.subscribe((job) => {
      const jobVideoId = extractVideoId(job.videoUrl);
      const currentVideoId = extractVideoId(currentUrlRef.current);

      // Only show translating state if this job is for the current video
      const isCurrentVideo =
        jobVideoId && currentVideoId && jobVideoId === currentVideoId;

      if (isCurrentVideo) {
        const isJobProcessing = job.status === "processing";
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

        // Streaming mode: Apply partial result
        if (job.status === "processing" && job.partialResult) {
          onTranslationComplete?.(job.partialResult);
        }

        // Final result when completed
        if (job.status === "completed" && job.result) {
          onTranslationComplete?.(job.result);
          syncTranslatedVideosToWebView();
          setIsTranslating(false);
          setTranslationProgress(null);
          currentTranslatingUrlRef.current = null;
        }

        if (job.status === "error") {
          setIsTranslating(false);
          setTranslationProgress(null);
          currentTranslatingUrlRef.current = null;
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
      }
    });
    return () => unsubscribe();
  }, [currentUrlRef, onTranslationComplete, syncTranslatedVideosToWebView]);

  // Reset state when URL changes
  useEffect(() => {
    const currentVideoId = extractVideoId(currentUrlRef.current);
    const job = translationManager.getCurrentJob();

    if (job) {
      const jobVideoId = extractVideoId(job.videoUrl);
      if (jobVideoId === currentVideoId && job.status === "processing") {
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
  }, [currentUrlRef.current]);

  return {
    queueCount,
    isTranslating,
    translationProgress,
    syncAllToWebView,
    syncTranslatedVideosToWebView,
    syncQueuedVideosToWebView,
  };
};
