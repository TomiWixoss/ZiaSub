import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
} from "react-native";
import { alert, showAlert } from "@components/common/CustomAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { WebViewMessageEvent, WebViewNavigation } from "react-native-webview";
import { useTranslation } from "react-i18next";

import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import { hasTranslation } from "@utils/storage";
import { ttsService } from "@services/ttsService";
import { queueManager } from "@services/queueManager";

import { useAppSettings } from "@hooks/useAppSettings";
import { useVideoPlayer } from "@hooks/useVideoPlayer";
import { useSubtitles } from "@hooks/useSubtitles";
import { useTranslationQueue } from "@hooks/useTranslationQueue";

import { YouTubePlayer } from "@components/video";
import { SubtitleInputModal } from "@components/subtitle";
import { SettingsModal } from "@components/settings";
import { FloatingButton } from "@components/common";
import { TranslationQueueModal } from "@components/queue";
import { ChatModal } from "@components/chat";

const HomeScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

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
      alert(t("common.notice"), t("queue.alreadyTranslated"));
      return;
    }

    const result = await queueManager.addToQueue(videoUrl, title);

    if (result.isExisting) {
      const statusText =
        result.item.status === "translating"
          ? t("queue.currentlyTranslating")
          : t("queue.alreadyInQueue", { count: result.pendingCount });
      alert(t("common.notice"), statusText);
    } else {
      const pendingText =
        result.pendingCount > 1
          ? t("queue.pendingCount", { count: result.pendingCount })
          : t("queue.willTranslateNow");
      showAlert(
        t("queue.addedToQueue"),
        t("queue.addedMessage", { pendingText }),
        [
          { text: t("common.ok") },
          {
            text: t("queue.viewQueue"),
            onPress: () => setQueueModalVisible(true),
          },
        ]
      );
    }
  };

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
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
        t("subtitleModal.srt.fixedErrors"),
        t("subtitleModal.srt.fixedErrorsMessage", { count: fixCount })
      );
    }

    setModalVisible(false);
  }, [srtContent, currentUrl, applySrtContent, t]);

  const handleAddToQueue = useCallback(async () => {
    if (!currentUrl) return;

    const alreadyTranslated = await hasTranslation(currentUrl);
    if (alreadyTranslated) {
      alert(t("common.notice"), t("queue.alreadyTranslated"));
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
          ? t("queue.currentlyTranslating")
          : t("queue.alreadyInQueue", { count: result.pendingCount });
      alert(t("common.notice"), statusText);
    } else {
      const pendingText =
        result.pendingCount > 1
          ? t("queue.pendingCount", { count: result.pendingCount })
          : t("queue.willTranslateNow");
      showAlert(
        t("queue.addedToQueue"),
        t("queue.addedMessage", { pendingText }),
        [
          { text: t("common.ok") },
          {
            text: t("queue.viewQueue"),
            onPress: () => setQueueModalVisible(true),
          },
        ]
      );
    }
  }, [currentUrl, videoTitle, videoDuration, setCurrentVideoInQueue, t]);

  const handleSelectVideoFromQueue = useCallback(
    (videoUrl: string) => {
      navigateToVideo(videoUrl);
    },
    [navigateToVideo]
  );

  const themedStyles = useThemedStyles(homeThemedStyles);

  return (
    <View
      style={[
        styles.container,
        themedStyles.container,
        { paddingBottom: insets.bottom },
      ]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.surface}
      />

      {!isFullscreen && (
        <LinearGradient
          colors={
            isDark
              ? ["#1E1E3A", "#141428"]
              : [colors.surfaceLight, colors.surface]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.headerGradient,
            themedStyles.headerGradient,
            { paddingTop: insets.top },
          ]}
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
                color={canGoBack ? colors.text : colors.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <View style={[styles.logoContainer, themedStyles.logoContainer]}>
                <MaterialCommunityIcons
                  name="subtitles"
                  size={16}
                  color="#FFFFFF"
                />
              </View>
              <Text style={[styles.titleMain, themedStyles.titleMain]}>
                Zia
              </Text>
              <Text style={[styles.titleAccent, themedStyles.titleAccent]}>
                Sub
              </Text>
            </View>

            <TouchableOpacity
              style={styles.headerBtn}
              onPress={reloadWebView}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="reload"
                size={20}
                color={colors.text}
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
  },
  headerGradient: {
    borderBottomWidth: 1,
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
    justifyContent: "center",
    alignItems: "center",
  },
  titleMain: {
    fontSize: 17,
    fontWeight: "600",
  },
  titleAccent: {
    fontSize: 17,
    fontWeight: "700",
  },
});

const homeThemedStyles = createThemedStyles((colors, isDark) => ({
  container: { backgroundColor: colors.background },
  headerGradient: {
    borderBottomColor: isDark ? "rgba(155,126,217,0.3)" : colors.border,
  },
  logoContainer: { backgroundColor: colors.primary },
  titleMain: { color: colors.text },
  titleAccent: { color: colors.primary },
}));

export default HomeScreen;
