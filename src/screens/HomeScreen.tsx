import React, { useState, useEffect, useCallback } from "react";
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
import { WebViewMessageEvent, WebViewNavigation } from "react-native-webview";

import { COLORS } from "@constants/colors";
import { hasTranslation } from "@utils/storage";
import { ttsService } from "@services/ttsService";
import { queueManager } from "@services/queueManager";

import { useAppSettings } from "@hooks/useAppSettings";
import { useVideoPlayer } from "@hooks/useVideoPlayer";
import { useSubtitles } from "@hooks/useSubtitles";
import { useTranslationQueue } from "@hooks/useTranslationQueue";

import YouTubePlayer from "@components/YouTubePlayer";
import SubtitleInputModal from "@components/SubtitleInputModal";
import SettingsModal from "@components/SettingsModal";
import FloatingButton from "@components/FloatingButton";
import TranslationQueueModal from "@components/TranslationQueueModal";
import ChatModal from "@components/ChatModal";

const HomeScreen = () => {
  const insets = useSafeAreaInsets();

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [queueModalVisible, setQueueModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // App settings hook
  const {
    subtitleSettings,
    batchSettings,
    ttsSettings,
    apiKeys,
    updateSubtitleSettings,
    updateBatchSettings,
    updateTTSSettings,
    updateApiKeys,
  } = useAppSettings();

  // Video player hook
  const {
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
    onFullScreenOpen,
    onFullScreenClose,
    handleGoBack,
    navigateToVideo,
    reloadWebView,
    postMessageToWebView,
  } = useVideoPlayer();

  // Subtitles hook
  const {
    srtContent,
    setSrtContent,
    subtitles,
    loadSavedSRT,
    applySrtContent,
    findSubtitle,
    updateFromTranslation,
    hasSubtitles,
  } = useSubtitles({ webViewRef, ttsSettings });

  // Translation queue hook
  const { queueCount, isTranslating, translationProgress, syncAllToWebView } =
    useTranslationQueue({
      webViewRef,
      currentUrlRef,
      onTranslationComplete: updateFromTranslation,
    });

  // Set up TTS speaking callback for video ducking
  useEffect(() => {
    ttsService.setSpeakingCallback((isSpeaking) => {
      const settings = ttsService.getSettings();
      if (webViewRef.current && settings.duckVideo) {
        const volume = isSpeaking ? settings.duckLevel : 1.0;
        postMessageToWebView({ type: "setVideoVolume", payload: volume });
      }
    });
  }, [postMessageToWebView]);

  // Send subtitle style to WebView whenever settings change
  useEffect(() => {
    postMessageToWebView({
      type: "setSubtitleStyle",
      payload: subtitleSettings,
    });
  }, [subtitleSettings, postMessageToWebView]);

  // Send subtitle style when entering video page
  useEffect(() => {
    if (isVideoPlaying) {
      const timer = setTimeout(() => {
        postMessageToWebView({
          type: "setSubtitleStyle",
          payload: subtitleSettings,
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVideoPlaying, subtitleSettings, postMessageToWebView]);

  // Load saved SRT when URL changes
  useEffect(() => {
    loadSavedSRT(currentUrl);
  }, [currentUrl, loadSavedSRT]);

  // Update queue status when URL changes
  useEffect(() => {
    if (currentUrl) {
      setCurrentVideoInQueue(queueManager.isInQueue(currentUrl));
    }
  }, [currentUrl, setCurrentVideoInQueue]);

  const handleWebViewMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        switch (data.type) {
          case "currentTime":
            findSubtitle(data.payload);
            break;
          case "videoDuration":
            setVideoDuration(data.payload);
            break;
          case "videoTitle":
            setVideoTitle(data.payload);
            break;
          case "fullscreen_open":
            onFullScreenOpen();
            break;
          case "fullscreen_close":
            onFullScreenClose();
            break;
          case "addToQueue":
            await handleAddToQueueFromThumbnail(data.payload);
            break;
        }
      } catch (e) {}
    },
    [
      findSubtitle,
      setVideoDuration,
      setVideoTitle,
      onFullScreenOpen,
      onFullScreenClose,
    ]
  );

  const handleAddToQueueFromThumbnail = async (payload: {
    videoUrl: string;
    title: string;
  }) => {
    const { videoUrl, title } = payload;

    const alreadyTranslated = await hasTranslation(videoUrl);
    if (alreadyTranslated) {
      alert("Thông báo", "Video này đã có bản dịch rồi.");
      return;
    }

    const result = await queueManager.addToQueue(videoUrl, title);

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

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      const { handleNavigationStateChange: handleNav } = useVideoPlayer();
      // Simple navigation handling
      const isWatchPage =
        navState.url.includes("/watch") || navState.url.includes("/shorts/");

      if (!isWatchPage && currentUrl !== "") {
        ttsService.stop();
        ttsService.resetLastSpoken();
      }
    },
    [currentUrl]
  );

  const handleWebViewLoad = useCallback(() => {
    setTimeout(() => {
      syncAllToWebView();
      postMessageToWebView({
        type: "setSubtitleStyle",
        payload: subtitleSettings,
      });
    }, 500);
  }, [syncAllToWebView, postMessageToWebView, subtitleSettings]);

  const handleLoadSubtitles = useCallback(async () => {
    const { fixCount } = await applySrtContent(srtContent, currentUrl);

    if (fixCount > 0) {
      alert(
        "Đã sửa lỗi phụ đề",
        `Đã tự động sửa ${fixCount} lỗi trong phụ đề.`
      );
    }

    setModalVisible(false);
  }, [srtContent, currentUrl, applySrtContent]);

  const handleAddToQueue = useCallback(async () => {
    if (!currentUrl) return;

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
  }, [currentUrl, videoTitle, videoDuration, setCurrentVideoInQueue]);

  const handleSelectVideoFromQueue = useCallback(
    (videoUrl: string) => {
      navigateToVideo(videoUrl);
    },
    [navigateToVideo]
  );

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
              onPress={reloadWebView}
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
        hasSubtitles={hasSubtitles}
        isTranslating={isTranslating}
        translationProgress={translationProgress}
        queueCount={queueCount}
        isInQueue={!!currentVideoInQueue}
        isChatLoading={isChatLoading}
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
        onBatchSettingsChange={updateBatchSettings}
        onTranslationStateChange={(translating, progress) => {
          // Handled by useTranslationQueue hook
        }}
      />

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        subtitleSettings={subtitleSettings}
        onSubtitleSettingsChange={updateSubtitleSettings}
        batchSettings={batchSettings}
        onBatchSettingsChange={updateBatchSettings}
        apiKeys={apiKeys}
        onApiKeysChange={updateApiKeys}
        ttsSettings={ttsSettings}
        onTTSSettingsChange={updateTTSSettings}
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
        videoTitle={videoTitle}
        onLoadingChange={setIsChatLoading}
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
