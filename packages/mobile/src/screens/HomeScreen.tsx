import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { alert, showAlert } from "@components/common/CustomAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { WebViewMessageEvent, WebViewNavigation } from "react-native-webview";
import { useTranslation } from "react-i18next";

import { useTheme, useUpdate } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import { ttsService } from "@services/ttsService";
import { queueManager } from "@services/queueManager";

import { useAppSettings } from "@hooks/useAppSettings";
import { useVideoPlayer } from "@hooks/useVideoPlayer";
import { useSubtitles } from "@hooks/useSubtitles";
import { useTranslationQueue } from "@hooks/useTranslationQueue";

import { YouTubePlayer } from "@components/video";
import { SubtitleInputModal } from "@components/subtitle";
import { SettingsModal } from "@components/settings";
import { FloatingButton, FAQModal } from "@components/common";
import { TranslationQueueModal } from "@components/queue";
import { ChatModal } from "@components/chat";

const HomeScreen = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { hasUpdate } = useUpdate();

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [queueModalVisible, setQueueModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Desktop mode state
  const [isDesktopMode, setIsDesktopMode] = useState(false);

  // Helper to convert URL between mobile and desktop YouTube
  const convertYouTubeUrl = (
    url: string | undefined,
    toDesktop: boolean
  ): string => {
    if (!url) {
      return toDesktop ? "https://www.youtube.com" : "https://m.youtube.com";
    }
    if (toDesktop) {
      return url.replace(
        /^https?:\/\/m\.youtube\.com/,
        "https://www.youtube.com"
      );
    } else {
      return url.replace(
        /^https?:\/\/(www\.)?youtube\.com/,
        "https://m.youtube.com"
      );
    }
  };

  // Toggle between mobile and desktop mode
  const handleToggleDesktopMode = () => {
    const newMode = !isDesktopMode;
    const convertedUrl = convertYouTubeUrl(currentUrl, newMode);
    setIsDesktopMode(newMode);
    // Navigate to converted URL after mode change
    setTimeout(() => {
      navigateToUrl(convertedUrl);
    }, 100);
  };

  // App settings hook
  const {
    subtitleSettings,
    batchSettings,
    ttsSettings,
    floatingUISettings,
    notificationSettings,
    apiKeys,
    updateSubtitleSettings,
    updateBatchSettings,
    updateTTSSettings,
    updateFloatingUISettings,
    updateNotificationSettings,
    updateApiKeys,
  } = useAppSettings();

  // Video player hook
  const {
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
    handleNavigationStateChange: handleVideoNavigation,
    onFullScreenOpen,
    onFullScreenClose,
    handleGoBack,
    handleGoForward,
    navigateToVideo,
    navigateToUrl,
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
    clearSubtitles,
    hasSubtitles,
  } = useSubtitles({ webViewRef, ttsSettings });

  // Translation queue hook
  const {
    queueCount,
    isTranslating,
    isWaitingInQueue,
    isPausedInQueue,
    queuePosition,
    pausedProgress,
    translationProgress,
    syncAllToWebView,
    syncTranslatedVideosToWebView,
  } = useTranslationQueue({
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

  // Subscribe to queue changes to update isInQueue status
  useEffect(() => {
    const unsubscribe = queueManager.subscribe(() => {
      if (currentUrl) {
        setCurrentVideoInQueue(queueManager.isInQueue(currentUrl));
      }
    });
    return () => unsubscribe();
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
    duration?: number;
  }) => {
    const { videoUrl, title, duration } = payload;

    const result = await queueManager.addToQueue(videoUrl, title, duration);

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
      handleVideoNavigation(navState, undefined, undefined, syncAllToWebView);
    },
    [handleVideoNavigation, syncAllToWebView]
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

    // Check if we have required data (title and duration)
    if (!videoTitle || !videoDuration) {
      alert(
        t("common.notice"),
        t("queue.waitingForVideoData") ||
          "Đang tải thông tin video, vui lòng thử lại sau giây lát"
      );
      return;
    }

    const result = await queueManager.addToQueue(
      currentUrl,
      videoTitle,
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
        <View
          style={[
            styles.headerContainer,
            themedStyles.headerContainer,
            { paddingTop: insets.top },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.navButtons}>
              <TouchableOpacity
                style={[styles.navBtn, !canGoBack && styles.navBtnDisabled]}
                onPress={handleGoBack}
                disabled={!canGoBack}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={18}
                  color={canGoBack ? colors.text : colors.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navBtn, !canGoForward && styles.navBtnDisabled]}
                onPress={handleGoForward}
                disabled={!canGoForward}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={18}
                  color={canGoForward ? colors.text : colors.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={reloadWebView}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="reload"
                  size={18}
                  color={colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.navBtn,
                  styles.modeToggleBtn,
                  isDesktopMode && themedStyles.modeToggleBtnActive,
                ]}
                onPress={handleToggleDesktopMode}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={isDesktopMode ? "monitor" : "cellphone"}
                  size={16}
                  color={isDesktopMode ? colors.primary : colors.text}
                />
              </TouchableOpacity>
            </View>

            {showUrlInput ? (
              <View
                style={[
                  styles.urlInputContainer,
                  themedStyles.urlInputContainer,
                ]}
              >
                <MaterialCommunityIcons
                  name="magnify"
                  size={16}
                  color={colors.textMuted}
                  style={styles.urlInputIcon}
                />
                <TextInput
                  style={[styles.urlInput, themedStyles.urlInput]}
                  value={urlInput}
                  onChangeText={setUrlInput}
                  placeholder="URL hoặc tìm kiếm..."
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  selectTextOnFocus
                  onSubmitEditing={() => {
                    if (urlInput.trim()) {
                      navigateToUrl(urlInput);
                      setShowUrlInput(false);
                      setUrlInput("");
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowUrlInput(false);
                      setUrlInput("");
                    }, 100);
                  }}
                />
                <TouchableOpacity
                  style={styles.urlInputClose}
                  onPress={() => {
                    setShowUrlInput(false);
                    setUrlInput("");
                  }}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.urlBar, themedStyles.urlBar]}
                onPress={() => setShowUrlInput(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="magnify"
                  size={16}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.urlText, themedStyles.urlText]}
                  numberOfLines={1}
                >
                  {currentUrl || "m.youtube.com"}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.brandContainer}>
              <View style={[styles.logoContainer, themedStyles.logoContainer]}>
                <MaterialCommunityIcons
                  name="subtitles"
                  size={12}
                  color="#FFFFFF"
                />
              </View>
              <Text style={[styles.brandText, themedStyles.brandText]}>
                Zia
              </Text>
            </View>
          </View>
        </View>
      )}

      <YouTubePlayer
        ref={webViewRef}
        onMessage={handleWebViewMessage}
        onNavigationStateChange={handleNavigationStateChange}
        onLoad={handleWebViewLoad}
        isDesktopMode={isDesktopMode}
      />

      <FloatingButton
        isVideoPage={isVideoPlaying}
        isDesktopMode={isDesktopMode}
        onPress={() => setModalVisible(true)}
        onSettingsPress={() => setSettingsVisible(true)}
        onQueuePress={() => setQueueModalVisible(true)}
        onChatPress={() => setChatModalVisible(true)}
        onFAQPress={() => setFaqModalVisible(true)}
        onAddToQueuePress={currentUrl ? handleAddToQueue : undefined}
        hasSubtitles={hasSubtitles}
        isTranslating={isTranslating}
        isWaitingInQueue={isWaitingInQueue}
        isPausedInQueue={isPausedInQueue}
        queuePosition={queuePosition}
        pausedProgress={pausedProgress}
        translationProgress={translationProgress}
        queueCount={queueCount}
        isInQueue={!!currentVideoInQueue}
        isChatLoading={isChatLoading}
        hasUpdate={hasUpdate}
        floatingUISettings={floatingUISettings}
      />

      <SubtitleInputModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        srtContent={srtContent}
        setSrtContent={setSrtContent}
        onLoadSubtitles={handleLoadSubtitles}
        onApplySubtitles={(content) => applySrtContent(content, currentUrl)}
        onClearSubtitles={() => {
          clearSubtitles(currentUrl);
          syncTranslatedVideosToWebView();
          // Remove from completed queue if exists
          if (currentUrl) {
            queueManager.removeCompletedVideo(currentUrl);
          }
        }}
        videoUrl={currentUrl}
        videoTitle={videoTitle}
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
        floatingUISettings={floatingUISettings}
        onFloatingUISettingsChange={updateFloatingUISettings}
        notificationSettings={notificationSettings}
        onNotificationSettingsChange={updateNotificationSettings}
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
        videoDuration={videoDuration}
        onLoadingChange={setIsChatLoading}
      />

      <FAQModal
        visible={faqModalVisible}
        onClose={() => setFaqModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    height: 44,
    gap: 8,
  },
  navButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  modeToggleBtn: {
    marginLeft: 2,
  },
  urlBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 34,
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 6,
  },
  urlInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 34,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  urlInputIcon: {
    marginRight: 6,
  },
  urlInput: {
    flex: 1,
    height: 34,
    fontSize: 14,
    paddingVertical: 0,
  },
  urlInputClose: {
    padding: 4,
    marginLeft: 4,
  },
  urlText: {
    flex: 1,
    fontSize: 13,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logoContainer: {
    width: 20,
    height: 20,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  brandText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

const homeThemedStyles = createThemedStyles((colors, isDark) => ({
  container: { backgroundColor: colors.background },
  headerContainer: {
    backgroundColor: colors.surface,
    borderBottomColor: isDark ? "rgba(155,126,217,0.3)" : colors.border,
  },
  logoContainer: { backgroundColor: colors.primary },
  urlBar: {
    backgroundColor: isDark ? colors.surfaceLight : colors.surfaceElevated,
  },
  urlInputContainer: {
    backgroundColor: isDark ? colors.surfaceLight : colors.surfaceElevated,
  },
  urlInput: { color: colors.text },
  urlText: { color: colors.textSecondary },
  brandText: { color: colors.primary },
  modeToggleBtnActive: {
    backgroundColor: isDark
      ? "rgba(155,126,217,0.2)"
      : "rgba(155,126,217,0.15)",
    borderRadius: 8,
  },
}));

export default HomeScreen;
