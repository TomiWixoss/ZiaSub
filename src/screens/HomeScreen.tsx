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
  DEFAULT_SUBTITLE_SETTINGS,
  getSubtitleSettings,
  saveSubtitleSettings,
} from "@utils/storage";
import YouTubePlayer from "@components/YouTubePlayer";
import SubtitleInputModal from "@components/SubtitleInputModal";
import SubtitleSettingsModal from "@components/SubtitleSettingsModal";
import FloatingButton from "@components/FloatingButton";

import { COLORS } from "@constants/colors";

const HomeScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
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

  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();

  // Load subtitle settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getSubtitleSettings();
      setSubtitleSettings(settings);
    };
    loadSettings();
  }, []);

  // Apply subtitle style when video starts playing
  useEffect(() => {
    if (isVideoPlaying && webViewRef.current) {
      // Small delay to ensure WebView is ready
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
      // Reset subtitles when URL changes
      setSrtContent("");
      setSubtitles([]);
      setCurrentSubtitle("");

      // Clear subtitle on WebView
      if (webViewRef.current) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: "setSubtitle",
            payload: "",
          })
        );
      }

      if (!currentUrl) return;

      const savedSRT = await getSRT(currentUrl);
      if (savedSRT) {
        setSrtContent(savedSRT);
        // Auto parse saved SRT
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
      }
    } else {
      // If we are not watching a video, clear the current URL
      if (currentUrl !== "") {
        setCurrentUrl("");
      }
    }
  };

  // Handle Fullscreen
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

  // Apply subtitle style to WebView
  const applySubtitleStyle = (settings: SubtitleSettings) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: "setSubtitleStyle",
          payload: settings,
        })
      );
    }
  };

  // Handle settings change
  const handleSettingsChange = async (newSettings: SubtitleSettings) => {
    setSubtitleSettings(newSettings);
    applySubtitleStyle(newSettings);
    await saveSubtitleSettings(newSettings);
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
          JSON.stringify({
            type: "setSubtitle",
            payload: text,
          })
        );
      }
    }
  };

  const handleLoadSubtitles = async () => {
    // 1. Auto-fix format and get stats
    const { fixedData, fixCount } = fixSRT(srtContent);

    if (fixCount > 0) {
      Alert.alert(
        "Đã sửa lỗi SRT",
        `Đã tự động khắc phục ${fixCount} lỗi định dạng thời gian để hiển thị đúng.`
      );
    }

    // 2. Parse the fixed content
    const parsed = parseSRT(fixedData);
    setSubtitles(parsed);
    setModalVisible(false);

    // 3. Save or remove from storage
    if (currentUrl) {
      if (fixedData) {
        await saveSRT(currentUrl, fixedData);
      } else {
        await removeSRT(currentUrl);
      }
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
        onSettingsPress={() => setSettingsModalVisible(true)}
        hasSubtitles={subtitles.length > 0}
      />

      <SubtitleInputModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        srtContent={srtContent}
        setSrtContent={setSrtContent}
        onLoadSubtitles={handleLoadSubtitles}
      />

      <SubtitleSettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        settings={subtitleSettings}
        onSettingsChange={handleSettingsChange}
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
