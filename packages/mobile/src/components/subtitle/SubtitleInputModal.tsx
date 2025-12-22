import React, { useEffect, useCallback, useRef, useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { alert, confirm } from "../common/CustomAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { BatchSettings, BatchProgress, TranslationJob } from "@src/types";
import { translationManager } from "@services/translationManager";
import { queueManager } from "@services/queueManager";
import { extractVideoId } from "@utils/videoUtils";
import { SrtTab } from "./SrtTab";
import { TranslateTab } from "./TranslateTab";

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
  onApplySubtitles?: (content: string) => void;
  onClearSubtitles?: () => void;
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
  onApplySubtitles,
  onClearSubtitles,
  videoUrl,
  videoDuration,
  batchSettings,
  onBatchSettingsChange,
  onTranslationStateChange,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const styles = useThemedStyles(themedStyles);

  const [activeTab, setActiveTab] = useState<TabType>("translate");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateStatus, setTranslateStatus] = useState("");
  const [keyStatus, setKeyStatus] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(
    null
  );
  const [isWaitingInQueue, setIsWaitingInQueue] = useState(false);
  const [isPausedInQueue, setIsPausedInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [pausedProgress, setPausedProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  // Keyboard handling
  const keyboardHeight = useSharedValue(0);

  useKeyboardHandler(
    {
      onMove: (event) => {
        "worklet";
        keyboardHeight.value = event.height;
      },
    },
    []
  );

  const animatedBottomStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardHeight.value }],
  }));

  const onTranslationStateChangeRef = useRef(onTranslationStateChange);
  useEffect(() => {
    onTranslationStateChangeRef.current = onTranslationStateChange;
  }, [onTranslationStateChange]);

  const onApplySubtitlesRef = useRef(onApplySubtitles);
  useEffect(() => {
    onApplySubtitlesRef.current = onApplySubtitles;
  }, [onApplySubtitles]);

  // Check queue status for current video
  const checkQueueStatus = useCallback(() => {
    if (!videoUrl) {
      setIsWaitingInQueue(false);
      setIsPausedInQueue(false);
      setQueuePosition(null);
      setPausedProgress(null);
      return;
    }

    const queueStatus = queueManager.getVideoQueueStatus(videoUrl);

    // Check if paused
    if (queueStatus.inQueue && queueStatus.status === "paused") {
      setIsPausedInQueue(true);
      setIsWaitingInQueue(false);
      setQueuePosition(null);
      // Get paused progress from queue item
      const queueItem = queueManager.isInQueue(videoUrl);
      if (queueItem && queueItem.completedBatches && queueItem.totalBatches) {
        setPausedProgress({
          completed: queueItem.completedBatches,
          total: queueItem.totalBatches,
        });
      } else {
        setPausedProgress(null);
      }
      return;
    }

    // Reset paused state
    setIsPausedInQueue(false);
    setPausedProgress(null);

    if (queueStatus.inQueue && queueStatus.status === "translating") {
      // Video is in translating queue - check if it's actually being translated
      const currentJob = translationManager.getCurrentJob();
      const currentVideoId = extractVideoId(videoUrl);
      const jobVideoId = currentJob
        ? extractVideoId(currentJob.videoUrl)
        : null;

      if (
        currentJob &&
        jobVideoId === currentVideoId &&
        currentJob.status === "processing"
      ) {
        // This video is actively being translated
        setIsWaitingInQueue(false);
        setQueuePosition(null);
      } else {
        // This video is waiting in queue
        setIsWaitingInQueue(true);
        setQueuePosition(queueStatus.position || null);
      }
    } else {
      setIsWaitingInQueue(false);
      setQueuePosition(null);
    }
  }, [videoUrl]);

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = queueManager.subscribe(() => {
      checkQueueStatus();
    });
    checkQueueStatus();
    return () => unsubscribe();
  }, [checkQueueStatus]);

  // Handle cancel waiting in queue - move to pending instead of removing
  const handleCancelQueue = useCallback(async () => {
    if (videoUrl) {
      const queueItem = queueManager.isInQueue(videoUrl);
      if (queueItem) {
        // Use moveToPendingByUser to prevent auto-resume
        await queueManager.moveToPendingByUser(queueItem.id);
      }
      setIsWaitingInQueue(false);
      setQueuePosition(null);
    }
  }, [videoUrl]);

  const reloadTranslationsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = translationManager.subscribe((job: TranslationJob) => {
      const jobVideoId = extractVideoId(job.videoUrl);
      const currentVideoId = videoUrl ? extractVideoId(videoUrl) : null;

      if (jobVideoId && currentVideoId && jobVideoId === currentVideoId) {
        setIsTranslating(job.status === "processing");
        setBatchProgress(job.progress);
        setKeyStatus(job.keyStatus);
        if (job.progress) {
          const currentBatch = job.progress.completedBatches + 1;
          setTranslateStatus(
            job.progress.totalBatches > 1
              ? `Đang dịch phần ${currentBatch}/${job.progress.totalBatches}...`
              : "Đang dịch video..."
          );
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
          setSrtContent(job.result);
          onApplySubtitlesRef.current?.(job.result);
          queueManager.markVideoCompleted(job.videoUrl, job.configName);
          translationManager.clearCompletedJob(job.videoUrl);
          reloadTranslationsRef.current?.();
          if (visible)
            alert("Thành công", "Dịch xong rồi! Phụ đề đã sẵn sàng.");
        }
        if (job.status === "error") {
          setTranslateStatus("");
          setKeyStatus(null);
          const isUserStopped = job.error?.startsWith("Đã dừng");
          if (!isUserStopped) {
            queueManager.markVideoError(
              job.videoUrl,
              job.error || "Có lỗi xảy ra"
            );
          } else {
            const queueItem = queueManager.isInQueue(job.videoUrl);
            if (queueItem && queueItem.status === "translating") {
              const hasPartial =
                job.partialResult &&
                job.completedBatchRanges &&
                job.completedBatchRanges.length > 0;
              queueManager.markVideoStopped(
                job.videoUrl,
                hasPartial
                  ? {
                      partialSrt: job.partialResult!,
                      completedBatchRanges: job.completedBatchRanges!,
                      completedBatches: job.completedBatchRanges!.length,
                      totalBatches: job.progress?.totalBatches || 0,
                    }
                  : undefined
              );
            }
          }
          translationManager.clearCompletedJob(job.videoUrl);
          reloadTranslationsRef.current?.();
          if (!isUserStopped) {
            alert("Không dịch được", job.error || "Không thể dịch video này.");
          }
        }
      }
    });
    return () => unsubscribe();
  }, [videoUrl, visible, setSrtContent]);

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
        setIsTranslating(false);
        setBatchProgress(null);
        setKeyStatus(null);
        setTranslateStatus("");
        onTranslationStateChangeRef.current?.(false, null);
      }
    } else {
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
          t("subtitleModal.srt.detected"),
          t("subtitleModal.srt.detectedConfirm"),
          () => setSrtContent(clipboardContent),
          t("common.paste"),
          t("common.no")
        );
      }
    } catch {}
  }, [srtContent, setSrtContent, t]);

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
        <Reanimated.View
          style={[styles.keyboardAvoidingContainer, animatedBottomStyle]}
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
              <Text style={styles.title}>{t("subtitleModal.title")}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={colors.textSecondary}
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
                      ? colors.primary
                      : colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "translate" && styles.tabTextActive,
                  ]}
                >
                  {t("subtitleModal.tabs.translate")}
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
                    activeTab === "srt" ? colors.primary : colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "srt" && styles.tabTextActive,
                  ]}
                >
                  {t("subtitleModal.tabs.srt")}
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
                isWaitingInQueue={isWaitingInQueue}
                isPausedInQueue={isPausedInQueue}
                queuePosition={queuePosition}
                pausedProgress={pausedProgress}
                translateStatus={translateStatus}
                keyStatus={keyStatus}
                batchProgress={batchProgress}
                onClose={handleClose}
                onSelectTranslation={(srt) => {
                  setSrtContent(srt);
                  onApplySubtitles?.(srt);
                }}
                onBatchSettingsChange={onBatchSettingsChange}
                onTranslationDeleted={() => {
                  setSrtContent("");
                  onClearSubtitles?.();
                }}
                onReloadRef={reloadTranslationsRef}
                visible={visible}
                onCancelQueue={handleCancelQueue}
              />
            )}
          </Animated.View>
        </Reanimated.View>
      </View>
    </Modal>
  );
};

const themedStyles = createThemedStyles((colors) => ({
  modalOverlay: { flex: 1, justifyContent: "flex-end" as const },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  keyboardAvoidingContainer: {
    width: "100%" as const,
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: "100%" as const,
    height: SHEET_HEIGHT,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHeader: {
    alignItems: "center" as const,
    marginBottom: 16,
    position: "relative" as const,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    backgroundColor: colors.borderLight,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "600" as const },
  closeButton: { position: "absolute" as const, right: 0, top: 12, padding: 8 },
  tabBar: {
    flexDirection: "row" as const,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: { backgroundColor: colors.surfaceElevated },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500" as const,
  },
  tabTextActive: { color: colors.text },
}));

export default SubtitleInputModal;
