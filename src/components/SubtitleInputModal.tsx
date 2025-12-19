import React, { useEffect, useCallback, useRef, useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableOpacity,
  Animated,
} from "react-native";
import { alert, confirm } from "./CustomAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { COLORS } from "@constants/colors";
import { BatchSettings } from "@utils/storage";
import { BatchProgress } from "@services/geminiService";
import {
  translationManager,
  TranslationJob,
} from "@services/translationManager";
import { queueManager } from "@services/queueManager";
import { SrtTab, TranslateTab } from "./subtitle";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

type TabType = "srt" | "translate";

const isSRTFormat = (text: string): boolean => {
  if (!text || text.length < 10) return false;
  const srtPattern =
    /^\d+\s*\n\d{2}:\d{2}:\d{2}[,.:]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.:]\d{3}/m;
  return srtPattern.test(text.trim());
};

interface SubtitleInputModalProps {
  visible: boolean;
  onClose: () => void;
  srtContent: string;
  setSrtContent: (text: string) => void;
  onLoadSubtitles: () => void;
  videoUrl?: string;
  videoDuration?: number;
  batchSettings?: BatchSettings;
  onBatchSettingsChange?: (settings: BatchSettings) => void;
  onTranslationStateChange?: (
    isTranslating: boolean,
    progress: { completed: number; total: number } | null
  ) => void;
}

const SubtitleInputModal: React.FC<SubtitleInputModalProps> = ({
  visible,
  onClose,
  srtContent,
  setSrtContent,
  onLoadSubtitles,
  videoUrl,
  videoDuration,
  batchSettings,
  onBatchSettingsChange,
  onTranslationStateChange,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<TabType>("translate");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateStatus, setTranslateStatus] = useState("");
  const [keyStatus, setKeyStatus] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(
    null
  );

  const onTranslationStateChangeRef = useRef(onTranslationStateChange);

  useEffect(() => {
    onTranslationStateChangeRef.current = onTranslationStateChange;
  }, [onTranslationStateChange]);

  // Subscribe to translation manager
  useEffect(() => {
    const unsubscribe = translationManager.subscribe((job: TranslationJob) => {
      if (job.videoUrl === videoUrl) {
        setIsTranslating(job.status === "processing");
        setBatchProgress(job.progress);
        setKeyStatus(job.keyStatus);

        if (job.progress) {
          setTranslateStatus(
            job.progress.totalBatches > 1
              ? `Đang dịch phần ${job.progress.completedBatches}/${job.progress.totalBatches}...`
              : "Đang dịch video..."
          );
          // Sync progress to queue if video is in queue
          queueManager.updateVideoProgress(
            job.videoUrl,
            {
              completed: job.progress.completedBatches,
              total: job.progress.totalBatches,
            },
            job.configName
          );
        }

        onTranslationStateChangeRef.current?.(
          job.status === "processing",
          job.progress
            ? {
                completed: job.progress.completedBatches,
                total: job.progress.totalBatches,
              }
            : null
        );

        if (job.status === "completed" && job.result) {
          setTranslateStatus("Xong rồi!");
          setKeyStatus(null);
          // Update SRT content and load subtitles
          setSrtContent(job.result);
          onLoadSubtitles();
          // Sync to queue - mark as completed (only if in queue)
          queueManager.markVideoCompleted(job.videoUrl, job.configName);
          translationManager.clearCompletedJob(videoUrl);
          // Only show alert if modal is visible (user is watching the translation)
          if (visible) {
            alert("Thành công", "Dịch xong rồi! Phụ đề đã sẵn sàng.");
          }
        }

        if (job.status === "error") {
          setTranslateStatus("");
          setKeyStatus(null);
          // Sync to queue - mark as error
          queueManager.markVideoError(
            job.videoUrl,
            job.error || "Có lỗi xảy ra"
          );
          translationManager.clearCompletedJob(videoUrl);
          alert("Không dịch được", job.error || "Không thể dịch video này.");
        }
      }
    });
    return () => unsubscribe();
  }, [videoUrl]);

  // Reset state and check for existing job when videoUrl changes
  useEffect(() => {
    if (videoUrl) {
      const existingJob = translationManager.getJobForUrl(videoUrl);
      if (existingJob && existingJob.status === "processing") {
        setIsTranslating(true);
        setBatchProgress(existingJob.progress);
        setKeyStatus(existingJob.keyStatus);
        setTranslateStatus(
          existingJob.progress && existingJob.progress.totalBatches > 1
            ? `Đang dịch phần ${existingJob.progress.completedBatches}/${existingJob.progress.totalBatches}...`
            : "Đang dịch video..."
        );
        setActiveTab("translate");
        // Notify parent about translation state
        onTranslationStateChangeRef.current?.(
          true,
          existingJob.progress
            ? {
                completed: existingJob.progress.completedBatches,
                total: existingJob.progress.totalBatches,
              }
            : null
        );
      } else {
        // Reset state for new video that's not being translated
        setIsTranslating(false);
        setBatchProgress(null);
        setKeyStatus(null);
        setTranslateStatus("");
        // Notify parent
        onTranslationStateChangeRef.current?.(false, null);
      }
    } else {
      // No video URL - reset all state
      setIsTranslating(false);
      setBatchProgress(null);
      setKeyStatus(null);
      setTranslateStatus("");
      onTranslationStateChangeRef.current?.(false, null);
    }
  }, [videoUrl]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
      fadeAnim.setValue(0);
      if (!isTranslating) {
        setTranslateStatus("");
        setBatchProgress(null);
      }
    }
  }, [visible, isTranslating]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const checkClipboard = useCallback(async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent && isSRTFormat(clipboardContent) && !srtContent) {
        confirm(
          "Phát hiện phụ đề",
          "Bạn vừa sao chép nội dung phụ đề. Muốn dán vào không?",
          () => setSrtContent(clipboardContent),
          "Dán",
          "Không"
        );
      }
    } catch {}
  }, [srtContent, setSrtContent]);

  useEffect(() => {
    if (visible && activeTab === "srt") checkClipboard();
  }, [visible, activeTab, checkClipboard]);

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                paddingBottom: Math.max(insets.bottom, 20),
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.dragHandle} />
              <Text style={styles.title}>Phụ đề</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "translate" && styles.tabActive,
                ]}
                onPress={() => setActiveTab("translate")}
              >
                <MaterialCommunityIcons
                  name="translate"
                  size={18}
                  color={
                    activeTab === "translate"
                      ? COLORS.primary
                      : COLORS.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "translate" && styles.tabTextActive,
                  ]}
                >
                  Dịch tự động
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "srt" && styles.tabActive]}
                onPress={() => setActiveTab("srt")}
              >
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={18}
                  color={
                    activeTab === "srt" ? COLORS.primary : COLORS.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "srt" && styles.tabTextActive,
                  ]}
                >
                  Dán phụ đề
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === "srt" ? (
              <SrtTab
                srtContent={srtContent}
                setSrtContent={setSrtContent}
                onLoadSubtitles={onLoadSubtitles}
              />
            ) : (
              <TranslateTab
                videoUrl={videoUrl}
                videoDuration={videoDuration}
                batchSettings={batchSettings}
                isTranslating={isTranslating}
                translateStatus={translateStatus}
                keyStatus={keyStatus}
                batchProgress={batchProgress}
                onClose={handleClose}
                onSelectTranslation={(srt) => {
                  setSrtContent(srt);
                  onLoadSubtitles();
                }}
                onBatchSettingsChange={onBatchSettingsChange}
              />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  keyboardView: { width: "100%" },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: "100%",
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  sheetHeader: { alignItems: "center", marginBottom: 16, position: "relative" },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    backgroundColor: COLORS.borderLight,
  },
  title: { color: COLORS.text, fontSize: 16, fontWeight: "600" },
  closeButton: { position: "absolute", right: 0, top: 12, padding: 8 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: { backgroundColor: COLORS.surfaceElevated },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "500" },
  tabTextActive: { color: COLORS.text },
});

export default SubtitleInputModal;
