/**
 * Hook for managing video player state
 */
import { useState, useRef, useCallback } from "react";
import { WebView, WebViewNavigation } from "react-native-webview";
import * as ScreenOrientation from "expo-screen-orientation";
import { isVideoPage, extractVideoId } from "@utils/videoUtils";
import { ttsService } from "@services/ttsService";
import { queueManager, QueueItem } from "@services/queueManager";

export const useVideoPlayer = () => {
  const webViewRef = useRef<WebView>(null);
  const currentUrlRef = useRef<string>("");

  const [currentUrl, setCurrentUrl] = useState("");
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | undefined>(
    undefined
  );
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [currentVideoInQueue, setCurrentVideoInQueue] = useState<
    QueueItem | undefined
  >();
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleNavigationStateChange = useCallback(
    (
      navState: WebViewNavigation,
      onVideoEnter?: (url: string) => void,
      onVideoExit?: () => void,
      syncAllToWebView?: () => void
    ) => {
      setCanGoBack(navState.canGoBack);
      setCanGoForward(navState.canGoForward);
      const isWatchPage = isVideoPage(navState.url);
      setIsVideoPlaying(isWatchPage);

      if (isWatchPage) {
        if (navState.url !== currentUrl) {
          setCurrentUrl(navState.url);
          currentUrlRef.current = navState.url;
          setVideoDuration(undefined);
          setVideoTitle("");
          setCurrentVideoInQueue(queueManager.isInQueue(navState.url));
          onVideoEnter?.(navState.url);
        }
      } else {
        if (currentUrl !== "") {
          setCurrentUrl("");
          currentUrlRef.current = "";
          setVideoDuration(undefined);
          setVideoTitle("");
          setCurrentVideoInQueue(undefined);
          ttsService.stop();
          ttsService.resetLastSpoken();
          onVideoExit?.();
        }
        syncAllToWebView?.();
        setTimeout(() => syncAllToWebView?.(), 300);
        setTimeout(() => syncAllToWebView?.(), 800);
      }
    },
    [currentUrl]
  );

  const onFullScreenOpen = useCallback(async () => {
    setIsFullscreen(true);
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    );
  }, []);

  const onFullScreenClose = useCallback(async () => {
    setIsFullscreen(false);
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP
    );
  }, []);

  const handleGoBack = useCallback(() => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  }, [canGoBack]);

  const handleGoForward = useCallback(() => {
    if (webViewRef.current && canGoForward) {
      webViewRef.current.goForward();
    }
  }, [canGoForward]);

  const navigateToVideo = useCallback((videoUrl: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.location.href = "${videoUrl}"; true;`
      );
    }
  }, []);

  const navigateToUrl = useCallback((url: string) => {
    if (webViewRef.current) {
      let targetUrl = url.trim();
      // Add https if no protocol
      if (
        !targetUrl.startsWith("http://") &&
        !targetUrl.startsWith("https://")
      ) {
        // Check if it's a YouTube video ID or search
        if (targetUrl.match(/^[a-zA-Z0-9_-]{11}$/)) {
          targetUrl = `https://m.youtube.com/watch?v=${targetUrl}`;
        } else if (
          targetUrl.includes("youtube.com") ||
          targetUrl.includes("youtu.be")
        ) {
          targetUrl = `https://${targetUrl}`;
        } else {
          targetUrl = `https://m.youtube.com/results?search_query=${encodeURIComponent(
            targetUrl
          )}`;
        }
      }
      webViewRef.current.injectJavaScript(
        `window.location.href = "${targetUrl}"; true;`
      );
    }
  }, []);

  const reloadWebView = useCallback(() => {
    webViewRef.current?.reload();
  }, []);

  const postMessageToWebView = useCallback((message: object) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(message));
    }
  }, []);

  return {
    webViewRef,
    currentUrlRef,
    currentUrl,
    canGoBack,
    canGoForward,
    isVideoPlaying,
    isFullscreen,
    videoDuration,
    videoTitle,
    currentVideoInQueue,
    urlInput,
    showUrlInput,
    setUrlInput,
    setShowUrlInput,
    setVideoDuration,
    setVideoTitle,
    setCurrentVideoInQueue,
    handleNavigationStateChange,
    onFullScreenOpen,
    onFullScreenClose,
    handleGoBack,
    handleGoForward,
    navigateToVideo,
    navigateToUrl,
    reloadWebView,
    postMessageToWebView,
  };
};
