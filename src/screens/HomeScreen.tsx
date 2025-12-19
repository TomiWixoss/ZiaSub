import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
} from "react-native";
import { alert, showAlert } from "@components/CustomAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import {
  WebView,
  WebViewMessageEvent,
  WebViewNavigation,
} from "react-native-webview";

import { parseSRT, fixSRT, SubtitleItem } from "@utils/srtParser";
import {
  saveSRT,
  getSRT,
  removeSRT,
  SubtitleSettings,
  BatchSettings,
  TTSSettings,
  DEFAULT_SUBTITLE_SETTINGS,
  DEFAULT_BATCH_SETTINGS,
  DEFAULT_TTS_SETTINGS,
  getSubtitleSettings,
  saveSubtitleSettings,
  getBatchSettings,
  saveBatchSettings,
  getTTSSettings,
  saveTTSSettings,
  getApiKeys,
  getAllTranslatedVideoUrls,
  getActiveTranslation,
  hasTranslation,
} from "@utils/storage";
import { ttsService } from "@services/ttsService";
import { keyManager } from "@services/keyManager";
import { queueManager, QueueItem } from "@services/queueManager";
import { translationManager } from "@services/translationManager";
import YouTubePlayer from "@components/YouTubePlayer";
import SubtitleInputModal from "@components/SubtitleInputModal";
import SettingsModal from "@components/SettingsModal";
import FloatingButton from "@components/FloatingButton";
import TranslationQueueModal from "@components/TranslationQueueModal";
import ChatModal from "@components/ChatModal";

import { COLORS } from "@constants/colors";

const HomeScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [srtContent, setSrtContent] = useState("");
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [canGoBack, setCanGoBack] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>(
    DEFAULT_SUBTITLE_SETTINGS
  );
  const [batchSettings, setBatchSettings] = useState<BatchSettings>(
    DEFAULT_BATCH_SETTINGS
  );
  const [ttsSettings, setTTSSettings] =
    useState<TTSSettings>(DEFAULT_TTS_SETTINGS);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | undefined>(
    undefined
  );
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [queueModalVisible, setQueueModalVisible] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [currentVideoInQueue, setCurrentVideoInQueue] = useState<
    QueueItem | undefined
  >();
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [chatModalVisible, setChatModalVisible] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const currentUrlRef = useRef<string>("");
  const lastSentSubtitleRef = useRef<string>("");
  const insets = useSafeAreaInsets();

  // Extract video ID from URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /youtu\.be\/([a-zA-Z0-9_-]+)/,
      /[?&]v=([a-zA-Z0-9_-]+)/,
      /\/shorts\/([a-zA-Z0-9_-]+)/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  };

  // Send translated video IDs to WebView
  const syncTranslatedVideosToWebView = async () => {
    const urls = await getAllTranslatedVideoUrls();
    const videoIds = urls
      .map((url) => extractVideoId(url))
      .filter((id): id is string => id !== null);

    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({ type: "setTranslatedVideos", payload: videoIds })
      );
    }
  };

  // Send queued video IDs to WebView
  const syncQueuedVideosToWebView = () => {
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
  };

  // Sync all data to WebView
  const syncAllToWebView = async () => {
    await syncTranslatedVideosToWebView();
    syncQueuedVideosToWebView();
  };

  useEffect(() => {
    const loadSettings = async () => {
      const [subtitleS, batchS, keys, ttsS] = await Promise.all([
        getSubtitleSettings(),
        getBatchSettings(),
        getApiKeys(),
        getTTSSettings(),
      ]);
      setSubtitleSettings(subtitleS);
      setBatchSettings(batchS);
      setApiKeys(keys);
      keyManager.initialize(keys);
      setTTSSettings(ttsS);
      ttsService.setSettings(ttsS);
    };
    loadSettings();

    // Set up TTS speaking callback for video ducking
    ttsService.setSpeakingCallback((isSpeaking) => {
      const settings = ttsService.getSettings();
      if (webViewRef.current && settings.duckVideo) {
        const volume = isSpeaking ? settings.duckLevel : 1.0;
        console.log("[HomeScreen] Setting video volume:", volume);
        webViewRef.current.postMessage(
          JSON.stringify({ type: "setVideoVolume", payload: volume })
        );
      }
    });

    // Initialize queue manager
    queueManager.initialize();
    const unsubscribe = queueManager.subscribe(() => {
      const counts = queueManager.getCounts();
      setQueueCount(counts.pending + counts.translating);
      // Update current video queue status when queue changes
      if (currentUrlRef.current) {
        setCurrentVideoInQueue(queueManager.isInQueue(currentUrlRef.current));
      }
      // Sync queued videos to WebView
      syncQueuedVideosToWebView();
    });
    return () => unsubscribe();
  }, []);

  // Send subtitle style to WebView whenever settings change or video starts playing
  useEffect(() => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: "setSubtitleStyle",
          payload: subtitleSettings,
        })
      );
    }
  }, [subtitleSettings]);

  // Also send subtitle style when entering video page (with delay to ensure WebView is ready)
  useEffect(() => {
    if (isVideoPlaying && webViewRef.current) {
      const timer = setTimeout(() => {
        webViewRef.current?.postMessage(
          JSON.stringify({
            type: "setSubtitleStyle",
            payload: subtitleSettings,
          })
        );
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVideoPlaying]);

  // Load saved SRT for current video (check both manual SRT and translations)
  const loadSavedSRT = async (url: string) => {
    if (!url) {
      setSrtContent("");
      setSubtitles([]);
      setCurrentSubtitle("");
      lastSentSubtitleRef.current = "";
      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({ type: "setSubtitle", payload: "" })
        );
      }
      return;
    }

    // First check manual SRT
    let srt = await getSRT(url);

    // If no manual SRT, check for active translation
    if (!srt) {
      const activeTranslation = await getActiveTranslation(url);
      if (activeTranslation) {
        srt = activeTranslation.srtContent;
      }
    }

    if (srt) {
      setSrtContent(srt);
      const { fixedData } = fixSRT(srt);
      const parsed = parseSRT(fixedData);
      setSubtitles(parsed);
      lastSentSubtitleRef.current = ""; // Reset to force resync
    } else {
      setSrtContent("");
      setSubtitles([]);
      setCurrentSubtitle("");
      lastSentSubtitleRef.current = "";
      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({ type: "setSubtitle", payload: "" })
        );
      }
    }
  };

  useEffect(() => {
    loadSavedSRT(currentUrl);
  }, [currentUrl]);

  // Subscribe to translation manager to auto-apply translations when completed
  // Also handle streaming mode - apply partial results as each batch completes
  useEffect(() => {
    const unsubscribe = translationManager.subscribe((job) => {
      // Compare by video ID to handle URL variations
      const jobVideoId = extractVideoId(job.videoUrl);
      const currentVideoId = extractVideoId(currentUrlRef.current);

      if (jobVideoId && currentVideoId && jobVideoId === currentVideoId) {
        // Streaming mode: Apply partial result as each batch completes
        if (job.status === "processing" && job.partialResult) {
          setSrtContent(job.partialResult);
          const { fixedData } = fixSRT(job.partialResult);
          const parsed = parseSRT(fixedData);
          setSubtitles(parsed);
          // Reset lastSentSubtitle to force resync
          lastSentSubtitleRef.current = "";
        }

        // Final result when completed
        if (job.status === "completed" && job.result) {
          setSrtContent(job.result);
          const { fixedData } = fixSRT(job.result);
          const parsed = parseSRT(fixedData);
          setSubtitles(parsed);
          // Reset lastSentSubtitle to force resync
          lastSentSubtitleRef.current = "";
          // Sync translated videos to WebView
          syncTranslatedVideosToWebView();
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "currentTime") {
        findSubtitle(data.payload);
      } else if (data.type === "videoDuration") {
        setVideoDuration(data.payload);
      } else if (data.type === "videoTitle") {
        setVideoTitle(data.payload);
      } else if (data.type === "fullscreen_open") {
        onFullScreenOpen();
      } else if (data.type === "fullscreen_close") {
        onFullScreenClose();
      } else if (data.type === "addToQueue") {
        // Handle add to queue from thumbnail button
        const { videoUrl, title } = data.payload;

        // Check if video already has translation in storage
        const alreadyTranslated = await hasTranslation(videoUrl);
        if (alreadyTranslated) {
          alert("Thông báo", "Video này đã có bản dịch rồi.");
          return;
        }

        const result = await queueManager.addToQueue(videoUrl, title);
        syncQueuedVideosToWebView();

        // Show notification based on video status
        if (result.isExisting) {
          const statusText =
            result.item.status === "translating"
              ? "Video này đang được dịch."
              : `Video này đã có trong danh sách chờ. Còn ${result.pendingCount} video đang chờ.`;
          alert("Thông báo", statusText);
        } else {
          const pendingText =
            result.pendingCount > 1
              ? `Còn ${result.pendingCount} video đang chờ dịch.`
              : "Video sẽ được dịch ngay.";
          showAlert("Đã thêm", `Đã thêm video vào danh sách. ${pendingText}`, [
            { text: "OK" },
            {
              text: "Xem danh sách",
              onPress: () => setQueueModalVisible(true),
            },
          ]);
        }
      }
    } catch (e) {}
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    const isWatchPage =
      navState.url.includes("/watch") || navState.url.includes("/shorts/");
    setIsVideoPlaying(isWatchPage);

    if (isWatchPage) {
      if (navState.url !== currentUrl) {
        setCurrentUrl(navState.url);
        currentUrlRef.current = navState.url;
        setVideoDuration(undefined); // Reset duration for new video
        setVideoTitle(""); // Reset title for new video
        // Check if video is in queue
        setCurrentVideoInQueue(queueManager.isInQueue(navState.url));
      }
    } else {
      if (currentUrl !== "") {
        setCurrentUrl("");
        currentUrlRef.current = "";
        setVideoDuration(undefined);
        setVideoTitle("");
        setCurrentVideoInQueue(undefined);
        // Stop TTS when leaving video
        ttsService.stop();
        ttsService.resetLastSpoken();
      }
      // Sync all data when on list/home page with retry to handle back navigation
      syncAllToWebView();
      // Retry after a short delay to ensure WebView is ready after back navigation
      setTimeout(() => syncAllToWebView(), 300);
      setTimeout(() => syncAllToWebView(), 800);
    }
  };

  // Sync all data when WebView finishes loading
  const handleWebViewLoad = () => {
    // Delay a bit to ensure DOM is ready
    setTimeout(() => {
      syncAllToWebView();
      // Also send subtitle style to ensure WebView has correct settings
      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: "setSubtitleStyle",
            payload: subtitleSettings,
          })
        );
      }
    }, 500);
  };

  const onFullScreenOpen = async () => {
    setIsFullscreen(true);
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    );
  };

  const onFullScreenClose = async () => {
    setIsFullscreen(false);
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP
    );
  };

  const handleGoBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  const applySubtitleStyle = (settings: SubtitleSettings) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({ type: "setSubtitleStyle", payload: settings })
      );
    }
  };

  const handleSubtitleSettingsChange = (newSettings: SubtitleSettings) => {
    setSubtitleSettings(newSettings);
    applySubtitleStyle(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const handleBatchSettingsChange = (newSettings: BatchSettings) => {
    setBatchSettings(newSettings);
    saveBatchSettings(newSettings);
  };

  const handleTTSSettingsChange = (newSettings: TTSSettings) => {
    setTTSSettings(newSettings);
    ttsService.setSettings(newSettings);
    saveTTSSettings(newSettings);
    // Stop TTS if disabled
    if (!newSettings.enabled) {
      ttsService.stop();
    }
  };

  const findSubtitle = (seconds: number) => {
    const sub = subtitles.find(
      (s) => seconds >= s.startTime && seconds <= s.endTime
    );
    const text = sub ? sub.text : "";

    // Create unique subtitle ID based on timing
    const subtitleId = sub ? `${sub.startTime}-${sub.endTime}` : "";

    // Always send subtitle if it changed OR if we have subtitles but haven't sent any yet
    // This handles the case when video quality changes and WebView resets
    const shouldSend =
      text !== currentSubtitle ||
      (subtitles.length > 0 && text && lastSentSubtitleRef.current !== text);

    if (shouldSend) {
      setCurrentSubtitle(text);
      lastSentSubtitleRef.current = text;

      // TTS: Speak the subtitle if enabled
      if (ttsSettings.enabled && text && sub) {
        // Calculate available duration (time until subtitle ends)
        const availableDuration = sub.endTime - seconds;
        ttsService.speakSubtitle(text, subtitleId, availableDuration);
      }

      // Send subtitle to WebView (hide text if TTS enabled)
      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: "setSubtitle",
            payload: ttsSettings.enabled ? "" : text,
          })
        );
      }
    }
  };

  const handleLoadSubtitles = async () => {
    const { fixedData, fixCount } = fixSRT(srtContent);

    if (fixCount > 0) {
      alert(
        "Đã sửa lỗi phụ đề",
        `Đã tự động sửa ${fixCount} lỗi trong phụ đề.`
      );
    }

    const parsed = parseSRT(fixedData);
    setSubtitles(parsed);
    setModalVisible(false);

    if (currentUrl) {
      if (fixedData) {
        await saveSRT(currentUrl, fixedData);
      } else {
        await removeSRT(currentUrl);
      }
    }
  };

  const handleAddToQueue = async () => {
    if (!currentUrl) return;

    // Check if video already has translation in storage
    const alreadyTranslated = await hasTranslation(currentUrl);
    if (alreadyTranslated) {
      alert("Thông báo", "Video này đã có bản dịch rồi.");
      return;
    }

    const title = videoTitle || "Video YouTube";
    const result = await queueManager.addToQueue(
      currentUrl,
      title,
      videoDuration
    );

    setCurrentVideoInQueue(result.item);

    // Show notification based on video status
    if (result.isExisting) {
      const statusText =
        result.item.status === "translating"
          ? "Video này đang được dịch."
          : `Video này đã có trong danh sách chờ. Còn ${result.pendingCount} video đang chờ.`;
      alert("Thông báo", statusText);
    } else {
      const pendingText =
        result.pendingCount > 1
          ? `Còn ${result.pendingCount} video đang chờ dịch.`
          : "Video sẽ được dịch ngay.";
      showAlert("Đã thêm", `Đã thêm video vào danh sách. ${pendingText}`, [
        { text: "OK" },
        { text: "Xem danh sách", onPress: () => setQueueModalVisible(true) },
      ]);
    }
  };

  const handleSelectVideoFromQueue = (videoUrl: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.location.href = "${videoUrl}"; true;`
      );
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />

      {!isFullscreen && (
        <LinearGradient
          colors={["#1E1E3A", "#141428"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.headerGradient, { paddingTop: insets.top }]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.headerBtn, !canGoBack && styles.headerBtnDisabled]}
              onPress={handleGoBack}
              disabled={!canGoBack}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={20}
                color={canGoBack ? COLORS.text : COLORS.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <View style={styles.logoContainer}>
                <MaterialCommunityIcons
                  name="subtitles"
                  size={16}
                  color={COLORS.text}
                />
              </View>
              <Text style={styles.titleMain}>Zia</Text>
              <Text style={styles.titleAccent}>Sub</Text>
            </View>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => webViewRef.current?.reload()}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="reload"
                size={20}
                color={COLORS.text}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}

      <YouTubePlayer
        ref={webViewRef}
        onMessage={handleWebViewMessage}
        onNavigationStateChange={handleNavigationStateChange}
        onLoad={handleWebViewLoad}
      />

      <FloatingButton
        isVideoPage={isVideoPlaying}
        onPress={() => setModalVisible(true)}
        onSettingsPress={() => setSettingsVisible(true)}
        onQueuePress={() => setQueueModalVisible(true)}
        onChatPress={() => setChatModalVisible(true)}
        onAddToQueuePress={currentUrl ? handleAddToQueue : undefined}
        hasSubtitles={subtitles.length > 0}
        isTranslating={isTranslating}
        translationProgress={translationProgress}
        queueCount={queueCount}
        isInQueue={!!currentVideoInQueue}
      />

      <SubtitleInputModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        srtContent={srtContent}
        setSrtContent={setSrtContent}
        onLoadSubtitles={handleLoadSubtitles}
        videoUrl={currentUrl}
        videoDuration={videoDuration}
        batchSettings={batchSettings}
        onBatchSettingsChange={handleBatchSettingsChange}
        onTranslationStateChange={(translating, progress) => {
          setIsTranslating(translating);
          setTranslationProgress(progress);
        }}
      />

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        subtitleSettings={subtitleSettings}
        onSubtitleSettingsChange={handleSubtitleSettingsChange}
        batchSettings={batchSettings}
        onBatchSettingsChange={handleBatchSettingsChange}
        apiKeys={apiKeys}
        onApiKeysChange={setApiKeys}
        ttsSettings={ttsSettings}
        onTTSSettingsChange={handleTTSSettingsChange}
      />

      <TranslationQueueModal
        visible={queueModalVisible}
        onClose={() => setQueueModalVisible(false)}
        onSelectVideo={handleSelectVideoFromQueue}
      />

      <ChatModal
        visible={chatModalVisible}
        onClose={() => setChatModalVisible(false)}
        videoUrl={currentUrl}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(155,126,217,0.3)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    height: 44,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  headerBtnDisabled: {
    opacity: 0.4,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  titleMain: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "600",
  },
  titleAccent: {
    color: COLORS.primary,
    fontSize: 17,
    fontWeight: "700",
  },
});

export default HomeScreen;
