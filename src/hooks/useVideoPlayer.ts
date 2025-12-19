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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | undefined>(
    undefined
  );
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [currentVideoInQueue, setCurrentVideoInQueue] = useState<
    QueueItem | undefined
  >();

  const handleNavigationStateChange = useCallback(
    (
      navState: WebViewNavigation,
      onVideoEnter?: (url: string) => void,
      onVideoExit?: () => void,
      syncAllToWebView?: () => void
    ) => {
      setCanGoBack(navState.canGoBack);
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

  const navigateToVideo = useCallback((videoUrl: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.location.href = "${videoUrl}"; true;`
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
    isVideoPlaying,
    isFullscreen,
    videoDuration,
    videoTitle,
    currentVideoInQueue,
    setVideoDuration,
    setVideoTitle,
    setCurrentVideoInQueue,
    handleNavigationStateChange,
    onFullScreenOpen,
    onFullScreenClose,
    handleGoBack,
    navigateToVideo,
    reloadWebView,
    postMessageToWebView,
  };
};
