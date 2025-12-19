import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  StatusBar,
  Text,
  TouchableOpacity,
} from "react-native";
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
  DEFAULT_SUBTITLE_SETTINGS,
  DEFAULT_BATCH_SETTINGS,
  getSubtitleSettings,
  saveSubtitleSettings,
  getBatchSettings,
  saveBatchSettings,
  getApiKeys,
} from "@utils/storage";
import { keyManager } from "@services/keyManager";
import { queueManager, QueueItem } from "@services/queueManager";
import YouTubePlayer from "@components/YouTubePlayer";
import SubtitleInputModal from "@components/SubtitleInputModal";
import SettingsModal from "@components/SettingsModal";
import FloatingButton from "@components/FloatingButton";
import TranslationQueueModal from "@components/TranslationQueueModal";

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

  const webViewRef = useRef<WebView>(null);
  const currentUrlRef = useRef<string>("");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadSettings = async () => {
      const [subtitleS, batchS, keys] = await Promise.all([
        getSubtitleSettings(),
        getBatchSettings(),
        getApiKeys(),
      ]);
      setSubtitleSettings(subtitleS);
      setBatchSettings(batchS);
      setApiKeys(keys);
      keyManager.initialize(keys);
    };
    loadSettings();

    // Initialize queue manager
    queueManager.initialize();
    const unsubscribe = queueManager.subscribe(() => {
      const counts = queueManager.getCounts();
      setQueueCount(counts.pending + counts.translating);
      // Update current video queue status when queue changes
      if (currentUrlRef.current) {
        setCurrentVideoInQueue(queueManager.isInQueue(currentUrlRef.current));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isVideoPlaying && webViewRef.current) {
      const timer = setTimeout(() => {
        webViewRef.current?.postMessage(
          JSON.stringify({
            type: "setSubtitleStyle",
            payload: subtitleSettings,
          })
        );
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isVideoPlaying, subtitleSettings]);

  useEffect(() => {
    const loadSavedSRT = async () => {
      setSrtContent("");
      setSubtitles([]);
      setCurrentSubtitle("");

      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({ type: "setSubtitle", payload: "" })
        );
      }

      if (!currentUrl) return;

      const savedSRT = await getSRT(currentUrl);
      if (savedSRT) {
        setSrtContent(savedSRT);
        const { fixedData } = fixSRT(savedSRT);
        const parsed = parseSRT(fixedData);
        setSubtitles(parsed);
      }
    };

    loadSavedSRT();
  }, [currentUrl]);

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
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
      }
    }
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

  const findSubtitle = (seconds: number) => {
    const sub = subtitles.find(
      (s) => seconds >= s.startTime && seconds <= s.endTime
    );
    const text = sub ? sub.text : "";

    if (text !== currentSubtitle) {
      setCurrentSubtitle(text);
      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({ type: "setSubtitle", payload: text })
        );
      }
    }
  };

  const handleLoadSubtitles = async () => {
    const { fixedData, fixCount } = fixSRT(srtContent);

    if (fixCount > 0) {
      Alert.alert(
        "Đã sửa lỗi SRT",
        `Đã tự động khắc phục ${fixCount} lỗi định dạng.`
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

    const existing = queueManager.isInQueue(currentUrl);
    if (existing) {
      Alert.alert("Thông báo", "Video này đã có trong danh sách dịch.");
      return;
    }

    const title = videoTitle || "Video YouTube";
    const item = await queueManager.addToQueue(
      currentUrl,
      title,
      videoDuration
    );

    if (item) {
      setCurrentVideoInQueue(item);
      Alert.alert("Đã thêm", "Video đã được thêm vào danh sách dịch.", [
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

            <View style={styles.headerBtn} />
          </View>
        </LinearGradient>
      )}

      <YouTubePlayer
        ref={webViewRef}
        onMessage={handleWebViewMessage}
        onNavigationStateChange={handleNavigationStateChange}
      />

      <FloatingButton
        visible={isVideoPlaying}
        onPress={() => setModalVisible(true)}
        onSettingsPress={() => setSettingsVisible(true)}
        onQueuePress={() => setQueueModalVisible(true)}
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
        videoTitle={videoTitle}
        videoDuration={videoDuration}
        batchSettings={batchSettings}
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
      />

      <TranslationQueueModal
        visible={queueModalVisible}
        onClose={() => setQueueModalVisible(false)}
        onSelectVideo={handleSelectVideoFromQueue}
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
