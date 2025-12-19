/**
 * Hook for managing translation queue
 */
import { useState, useEffect, useCallback } from "react";
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

      if (jobVideoId && currentVideoId && jobVideoId === currentVideoId) {
        setIsTranslating(job.status === "processing");

        if (job.progress) {
          setTranslationProgress({
            completed: job.progress.completedBatches,
            total: job.progress.totalBatches,
          });
        }

        // Streaming mode: Apply partial result
        if (job.status === "processing" && job.partialResult) {
          onTranslationComplete?.(job.partialResult);
        }

        // Final result when completed
        if (job.status === "completed" && job.result) {
          onTranslationComplete?.(job.result);
          syncTranslatedVideosToWebView();
          setTranslationProgress(null);
        }

        if (job.status === "error") {
          setTranslationProgress(null);
        }
      }
    });
    return () => unsubscribe();
  }, [currentUrlRef, onTranslationComplete, syncTranslatedVideosToWebView]);

  return {
    queueCount,
    isTranslating,
    translationProgress,
    syncAllToWebView,
    syncTranslatedVideosToWebView,
    syncQueuedVideosToWebView,
  };
};
