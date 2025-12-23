import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { alert, confirm, confirmDestructive } from "../common/CustomAlert";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type {
  GeminiConfig,
  BatchSettings,
  SavedTranslation,
  BatchProgress,
  TranslationJob,
} from "@src/types";
import {
  getGeminiConfigs,
  getActiveTranslationConfig,
  saveActiveTranslationConfigId,
  getVideoTranslations,
  setActiveTranslation,
  deleteTranslation,
  getApiKeys,
} from "@utils/storage";
import { translationManager } from "@services/translationManager";
import { parseTime, extractVideoId } from "@utils/videoUtils";
import { parseSRT } from "@utils/srtParser";
import { PRESET_PROMPTS, type PresetPromptType } from "@constants/defaults";
import Button3D from "../common/Button3D";
import {
  SavedTranslationsList,
  TranslationProgress,
  AdvancedOptions,
  TranslateConfigPicker,
  PresetPromptPicker,
} from "./translate";

interface TranslateTabProps {
  videoUrl?: string;
  videoTitle?: string;
  videoDuration?: number;
  batchSettings?: BatchSettings;
  isTranslating: boolean;
  isWaitingInQueue?: boolean;
  isPausedInQueue?: boolean;
  queuePosition?: number | null;
  pausedProgress?: { completed: number; total: number } | null;
  translateStatus: string;
  keyStatus: string | null;
  batchProgress: BatchProgress | null;
  onClose: () => void;
  onSelectTranslation: (srtContent: string) => void;
  onBatchSettingsChange?: (settings: BatchSettings) => void;
  onTranslationDeleted?: () => void;
  onReloadRef?: React.MutableRefObject<(() => void) | null>;
  visible?: boolean;
  onCancelQueue?: () => void;
}

export const TranslateTab: React.FC<TranslateTabProps> = ({
  videoUrl,
  videoTitle,
  videoDuration,
  batchSettings,
  isTranslating,
  isWaitingInQueue = false,
  isPausedInQueue = false,
  queuePosition = null,
  pausedProgress = null,
  translateStatus,
  keyStatus,
  batchProgress,
  onClose,
  onSelectTranslation,
  onBatchSettingsChange,
  onTranslationDeleted,
  onReloadRef,
  visible,
  onCancelQueue,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(translateTabThemedStyles);
  const [geminiConfigs, setGeminiConfigs] = useState<GeminiConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [showConfigPicker, setShowConfigPicker] = useState(false);
  const [savedTranslations, setSavedTranslations] = useState<
    SavedTranslation[]
  >([]);
  const [activeTranslationId, setActiveTranslationId] = useState<string | null>(
    null
  );
  const [hasApiKey, setHasApiKey] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [streamingMode, setStreamingMode] = useState(
    batchSettings?.streamingMode ?? false
  );
  const [presubMode, setPresubMode] = useState(
    batchSettings?.presubMode ?? false
  );
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [rangeStartStr, setRangeStartStr] = useState("");
  const [rangeEndStr, setRangeEndStr] = useState("");
  const [currentPresetId, setCurrentPresetId] = useState<
    PresetPromptType | undefined
  >();
  // Track batch retranslation job (for single batch or fromHere mode)
  const [batchRetranslateJob, setBatchRetranslateJob] =
    useState<TranslationJob | null>(null);
  // Track paused batch retranslation (from queue)
  const [pausedBatchRetranslation, setPausedBatchRetranslation] = useState<{
    batchIndex: number;
    mode: "single" | "fromHere";
  } | null>(null);

  // Detect current preset from selected config
  useEffect(() => {
    const selectedConfig = geminiConfigs.find((c) => c.id === selectedConfigId);
    if (selectedConfig) {
      // Use presetId if set, otherwise check if systemPrompt matches any preset
      if (selectedConfig.presetId) {
        setCurrentPresetId(selectedConfig.presetId as PresetPromptType);
      } else {
        const matchingPreset = PRESET_PROMPTS.find(
          (p) => p.prompt === selectedConfig.systemPrompt
        );
        setCurrentPresetId(matchingPreset?.id || "custom");
      }
    }
  }, [selectedConfigId, geminiConfigs]);

  const loadConfigs = async () => {
    const configs = await getGeminiConfigs();
    // Filter out chat config for translation picker
    const translationConfigs = configs.filter(
      (c) => c.id !== "default-chat-config"
    );
    setGeminiConfigs(translationConfigs);
    const activeConfig = await getActiveTranslationConfig();
    if (activeConfig) {
      setSelectedConfigId(activeConfig.id);
    } else if (translationConfigs.length > 0) {
      setSelectedConfigId(translationConfigs[0].id);
    }
  };
  const checkApiKeys = async () => {
    const keys = await getApiKeys();
    setHasApiKey(keys.length > 0);
  };
  const loadTranslations = useCallback(async () => {
    if (!videoUrl) return;
    try {
      const data = await getVideoTranslations(videoUrl);
      if (data) {
        setSavedTranslations(data.translations);
        setActiveTranslationId(data.activeTranslationId);
      } else {
        setSavedTranslations([]);
        setActiveTranslationId(null);
      }
    } catch (error) {
      console.error("Error loading translations:", error);
      setSavedTranslations([]);
      setActiveTranslationId(null);
    }
  }, [videoUrl]);

  useEffect(() => {
    loadConfigs();
    checkApiKeys();
  }, []);
  useEffect(() => {
    if (videoUrl) loadTranslations();
  }, [videoUrl, loadTranslations]);
  // Reload translations when modal becomes visible
  useEffect(() => {
    if (visible && videoUrl) {
      loadTranslations();
    }
  }, [visible, videoUrl, loadTranslations]);

  // Check for paused/waiting batch retranslation from queue
  useEffect(() => {
    if (!videoUrl) {
      setPausedBatchRetranslation(null);
      return;
    }

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const setupAndSubscribe = async () => {
      const { queueManager } = await import("@services/queueManager");

      const checkBatchRetranslation = () => {
        if (!isMounted) return;
        // Use getBatchRetranslationInfo to get both paused and waiting-to-resume items
        const batchItem = queueManager.getBatchRetranslationInfo(videoUrl);
        if (
          batchItem &&
          batchItem.retranslateBatchIndex !== undefined &&
          batchItem.retranslateMode
        ) {
          setPausedBatchRetranslation({
            batchIndex: batchItem.retranslateBatchIndex,
            mode: batchItem.retranslateMode,
          });
        } else {
          setPausedBatchRetranslation(null);
        }
      };

      // Check immediately
      checkBatchRetranslation();

      // Subscribe to queue changes
      unsubscribe = queueManager.subscribe(() => {
        checkBatchRetranslation();
      });
    };

    setupAndSubscribe();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [videoUrl]);

  // Subscribe to translationManager to track batch retranslation
  useEffect(() => {
    if (!videoUrl) return;

    const currentVideoId = extractVideoId(videoUrl);

    // Check current job state immediately when component mounts
    const currentJob = translationManager.getCurrentJob();
    if (currentJob) {
      const jobVideoId = extractVideoId(currentJob.videoUrl);
      if (
        jobVideoId === currentVideoId &&
        currentJob.status === "processing" &&
        currentJob.rangeStart !== undefined &&
        currentJob.rangeEnd !== undefined
      ) {
        setBatchRetranslateJob(currentJob);
      }
    }

    const unsubscribe = translationManager.subscribe((job) => {
      const jobVideoId = extractVideoId(job.videoUrl);
      // Check if this is a batch retranslation for current video
      if (
        jobVideoId === currentVideoId &&
        job.rangeStart !== undefined &&
        job.rangeEnd !== undefined
      ) {
        if (job.status === "processing") {
          setBatchRetranslateJob(job);
          // Clear paused state when job starts
          setPausedBatchRetranslation(null);
        } else if (job.status === "completed" || job.status === "error") {
          setBatchRetranslateJob(null);
          // Reload translations when batch retranslation completes
          if (job.status === "completed") {
            loadTranslations();
          }
        }
      }
    });
    return () => unsubscribe();
  }, [videoUrl, loadTranslations]);
  useEffect(() => {
    if (batchSettings) {
      setStreamingMode(batchSettings.streamingMode ?? false);
      setPresubMode(batchSettings.presubMode ?? false);
    }
  }, [batchSettings]);

  // Expose loadTranslations to parent via ref
  useEffect(() => {
    if (onReloadRef) {
      onReloadRef.current = loadTranslations;
    }
    return () => {
      if (onReloadRef) {
        onReloadRef.current = null;
      }
    };
  }, [onReloadRef, loadTranslations]);

  const handleStreamingModeChange = (value: boolean) => {
    setStreamingMode(value);
    if (batchSettings && onBatchSettingsChange)
      onBatchSettingsChange({ ...batchSettings, streamingMode: value });
  };
  const handlePresubModeChange = (value: boolean) => {
    setPresubMode(value);
    if (value && !streamingMode) {
      setStreamingMode(true);
      if (batchSettings && onBatchSettingsChange)
        onBatchSettingsChange({
          ...batchSettings,
          presubMode: value,
          streamingMode: true,
        });
    } else if (batchSettings && onBatchSettingsChange)
      onBatchSettingsChange({ ...batchSettings, presubMode: value });
  };

  const handleTranslate = async (
    resumeTranslation?: SavedTranslation,
    retranslateBatchIndex?: number,
    retranslateMode?: "single" | "fromHere"
  ) => {
    // IMPORTANT: When resuming/retranslating, use saved config from translation
    // Otherwise use currently selected config
    let config: GeminiConfig | undefined;
    let effectivePresetId: string | undefined;

    if (resumeTranslation?.configName) {
      // Find config by name (saved in translation)
      config = geminiConfigs.find(
        (c) => c.name === resumeTranslation.configName
      );
      effectivePresetId = resumeTranslation.presetId;
    }

    // Fallback to selected config if saved config not found
    if (!config) {
      config = geminiConfigs.find((c) => c.id === selectedConfigId);
    }

    if (!config)
      return alert(
        t("subtitleModal.translate.notSelected"),
        t("subtitleModal.translate.notSelectedMessage")
      );
    if (!videoUrl)
      return alert(
        t("subtitleModal.translate.noVideo"),
        t("subtitleModal.translate.noVideoMessage")
      );
    if (translationManager.isTranslatingUrl(videoUrl))
      return alert(
        t("common.notice"),
        t("subtitleModal.translate.alreadyTranslating")
      );

    // Check if videoDuration is available (required for correct batching)
    // Skip check for resume translations (they have their own duration)
    if (!videoDuration && !resumeTranslation?.videoDuration) {
      return alert(
        t("common.notice"),
        t("subtitleModal.translate.waitForDuration")
      );
    }

    // Check if another video is being translated
    // Instead of blocking, add to queue and show waiting state
    if (translationManager.isTranslating()) {
      const { queueManager } = await import("@services/queueManager");
      // Always sync to queue when another video is translating
      // forceRetranslate = true to allow re-translating completed videos
      // Pass all config info to preserve translation settings
      await queueManager.syncDirectTranslation(
        videoUrl,
        videoTitle,
        videoDuration,
        config.name,
        true, // forceRetranslate
        config.id,
        config.presetId,
        batchSettings
      );
      alert(t("common.notice"), t("queue.addedToWaitingQueue"));
      return;
    }

    let rangeStart: number | undefined;
    let rangeEnd: number | undefined;
    let resumeData:
      | {
          partialSrt: string;
          completedBatchRanges: Array<{ start: number; end: number }>;
          existingTranslationId?: string;
        }
      | undefined;

    // Check if resuming from partial translation
    if (resumeTranslation?.isPartial && resumeTranslation.srtContent) {
      // Parse SRT to get completed ranges
      const parsed = parseSRT(resumeTranslation.srtContent);
      if (parsed.length > 0) {
        // Build completed ranges from parsed subtitles
        // Group consecutive subtitles into ranges based on batch settings
        const batchDuration =
          resumeTranslation.batchSettings?.maxVideoDuration ||
          batchSettings?.maxVideoDuration ||
          600;
        const completedRanges: Array<{ start: number; end: number }> = [];

        // Simple approach: calculate ranges based on completed batches count
        const completedBatches = resumeTranslation.completedBatches || 0;
        for (let i = 0; i < completedBatches; i++) {
          const start = i * batchDuration;
          const end = Math.min(
            (i + 1) * batchDuration,
            resumeTranslation.videoDuration || videoDuration || Infinity
          );
          completedRanges.push({ start, end });
        }

        resumeData = {
          partialSrt: resumeTranslation.srtContent,
          completedBatchRanges: completedRanges,
          existingTranslationId: resumeTranslation.id, // Pass existing ID to update instead of creating new
        };

        // Use original range if set
        rangeStart = resumeTranslation.rangeStart;
        rangeEnd = resumeTranslation.rangeEnd;
      }

      // Auto-enable streaming mode when resuming (required for resume to work properly)
      if (!streamingMode) {
        setStreamingMode(true);
        if (batchSettings && onBatchSettingsChange) {
          onBatchSettingsChange({ ...batchSettings, streamingMode: true });
        }
      }
    } else if (useCustomRange) {
      const start = rangeStartStr.trim() ? parseTime(rangeStartStr) : 0;
      const end = rangeEndStr.trim() ? parseTime(rangeEndStr) : videoDuration;
      if (start === null)
        return alert(
          t("common.error"),
          t("subtitleModal.translate.invalidStartTime")
        );
      if (end === null || end === undefined)
        return alert(
          t("common.error"),
          t("subtitleModal.translate.invalidEndTime")
        );
      const clampedStart = Math.max(0, start);
      const clampedEnd = videoDuration ? Math.min(end, videoDuration) : end;
      if (clampedStart >= clampedEnd)
        return alert(
          t("common.error"),
          t("subtitleModal.translate.invalidRange")
        );
      rangeStart = clampedStart;
      rangeEnd = clampedEnd;
    }

    try {
      await saveActiveTranslationConfigId(selectedConfigId);

      // When resuming, ensure streaming mode is enabled in batch settings
      let effectiveBatchSettings =
        (resumeTranslation?.batchSettings as BatchSettings) || batchSettings;
      if (resumeData && effectiveBatchSettings) {
        effectiveBatchSettings = {
          ...effectiveBatchSettings,
          streamingMode: true,
        };
      }

      // Get presub config if presubMode is enabled and presubConfigId is set
      let presubConfig: GeminiConfig | undefined;
      if (
        effectiveBatchSettings?.presubMode &&
        effectiveBatchSettings?.presubConfigId
      ) {
        presubConfig = geminiConfigs.find(
          (c) => c.id === effectiveBatchSettings?.presubConfigId
        );
      }

      // Create effective config with saved presetId (for resume/retranslate)
      const effectiveConfig = effectivePresetId
        ? { ...config, presetId: effectivePresetId }
        : config;

      // Sync to queue before starting translation (so it shows in queue UI)
      // Pass all config info to preserve translation settings
      const { queueManager } = await import("@services/queueManager");
      await queueManager.syncDirectTranslation(
        videoUrl,
        videoTitle,
        videoDuration,
        effectiveConfig.name,
        true, // forceRetranslate
        effectiveConfig.id,
        effectiveConfig.presetId,
        effectiveBatchSettings,
        retranslateBatchIndex,
        retranslateMode
      );

      translationManager.startTranslation(
        videoUrl,
        effectiveConfig,
        videoDuration,
        effectiveBatchSettings,
        rangeStart,
        rangeEnd,
        resumeData,
        presubConfig
      );
    } catch (error: any) {
      alert(
        t("subtitleModal.translate.error"),
        error.message || t("errors.generic")
      );
    }
  };

  const handleResumeTranslation = (translation: SavedTranslation) => {
    if (!translation.isPartial) return;

    confirm(
      t("subtitleModal.translate.resumeTitle"),
      t("subtitleModal.translate.resumeConfirm", {
        completed: translation.completedBatches || 0,
        total: translation.totalBatches || "?",
      }),
      () => handleTranslate(translation),
      t("subtitleModal.translate.resume")
    );
  };

  // Handle resume from queue (when video is paused in queue)
  const handleResumeFromQueue = async () => {
    if (!videoUrl) return;

    const { queueManager } = await import("@services/queueManager");
    const queueItem = queueManager.isInQueue(videoUrl);

    if (queueItem) {
      const result = await queueManager.resumeTranslation(queueItem.id);
      if (result.queued) {
        alert(t("common.notice"), t("queue.addedToWaitingQueue"));
      }
    } else {
      // Video was removed from queue - start fresh translation
      handleTranslate();
    }
  };

  // Helper to format SRT time
  const formatSrtTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms
      .toString()
      .padStart(3, "0")}`;
  };

  // Helper to rebuild SRT from subtitles
  const rebuildSrt = (
    subtitles: Array<{ startTime: number; endTime: number; text: string }>
  ) => {
    let srt = "";
    subtitles.forEach((sub, idx) => {
      srt += `${idx + 1}\n${formatSrtTime(sub.startTime)} --> ${formatSrtTime(
        sub.endTime
      )}\n${sub.text}\n\n`;
    });
    return srt;
  };

  const handleRetranslateBatch = (
    translation: SavedTranslation,
    batchIndex: number,
    mode: "single" | "fromHere",
    skipConfirm: boolean = false
  ) => {
    // IMPORTANT: Use original batch settings from the translation
    const originalBatchDuration =
      translation.batchSettings?.maxVideoDuration || 600;
    const totalBatches =
      translation.totalBatches ||
      Math.ceil(
        (translation.videoDuration || videoDuration || 0) /
          originalBatchDuration
      );

    const batchStart = batchIndex * originalBatchDuration;
    const batchEnd = Math.min(
      (batchIndex + 1) * originalBatchDuration,
      translation.videoDuration || videoDuration || Infinity
    );

    // Helper function to execute the actual retranslation
    const executeRetranslate = async () => {
      // IMPORTANT: Use saved config from translation, not current selected config
      const savedConfigId = translation.configName
        ? geminiConfigs.find((c) => c.name === translation.configName)?.id
        : null;
      const config = geminiConfigs.find(
        (c) => c.id === (savedConfigId || selectedConfigId)
      );
      if (!config) {
        alert(
          t("subtitleModal.translate.notSelected"),
          t("subtitleModal.translate.notSelectedMessage")
        );
        return;
      }
      if (!videoUrl) return;

      const { queueManager } = await import("@services/queueManager");

      if (translationManager.isTranslating()) {
        // Add to queue instead of blocking (with batch retranslation info)
        await queueManager.syncDirectTranslation(
          videoUrl,
          videoTitle,
          videoDuration,
          config.name,
          true, // forceRetranslate
          config.id,
          translation.presetId ?? config.presetId, // Use saved presetId
          translation.batchSettings,
          batchIndex, // retranslateBatchIndex
          mode // retranslateMode
        );
        alert(t("common.notice"), t("queue.addedToWaitingQueue"));
        return;
      }

      try {
        // Create effective config with saved presetId
        const effectiveConfig = translation.presetId
          ? { ...config, presetId: translation.presetId }
          : config;

        // Sync to queue BEFORE starting translation (so it shows in queue UI)
        await queueManager.syncDirectTranslation(
          videoUrl,
          videoTitle,
          videoDuration,
          effectiveConfig.name,
          true, // forceRetranslate
          effectiveConfig.id,
          effectiveConfig.presetId,
          translation.batchSettings,
          batchIndex, // retranslateBatchIndex
          mode // retranslateMode
        );

        // Use translationManager to handle single batch translation
        const updatedSrt = await translationManager.translateSingleBatch(
          videoUrl,
          effectiveConfig,
          translation.srtContent,
          batchStart,
          batchEnd,
          translation.videoDuration || videoDuration,
          translation.id // Pass existing translation ID to update instead of creating new
        );

        // Clear batch retranslation mode from queue (mark as completed)
        await queueManager.clearBatchRetranslateMode(videoUrl);

        await loadTranslations();
        onSelectTranslation(updatedSrt);

        alert(
          t("common.success"),
          t("subtitleModal.translate.batchRetranslated", {
            batch: batchIndex + 1,
          })
        );
      } catch (error: any) {
        // Clear batch retranslation mode on error too
        await queueManager.clearBatchRetranslateMode(videoUrl);

        if (error.message !== "Đã dừng dịch") {
          alert(
            t("subtitleModal.translate.error"),
            error.message || t("errors.generic")
          );
        }
      }
    };

    if (mode === "single") {
      // Mode 1: Retranslate ONLY this batch, keep before and after
      if (skipConfirm) {
        executeRetranslate();
      } else {
        confirm(
          t("subtitleModal.translate.retranslateSingleTitle"),
          t("subtitleModal.translate.retranslateSingleConfirm", {
            batch: batchIndex + 1,
            total: totalBatches,
          }),
          executeRetranslate,
          t("subtitleModal.translate.retranslate")
        );
      }
    } else {
      // Mode 2: Retranslate FROM this batch onwards
      const executeFromHere = () => {
        // Keep batches before batchIndex
        const parsed = parseSRT(translation.srtContent);
        const keptSubtitles = parsed.filter((sub) => sub.endTime <= batchStart);
        const partialSrt = rebuildSrt(keptSubtitles);

        // Build completed ranges
        const completedRanges: Array<{ start: number; end: number }> = [];
        for (let i = 0; i < batchIndex; i++) {
          completedRanges.push({
            start: i * originalBatchDuration,
            end: Math.min(
              (i + 1) * originalBatchDuration,
              translation.videoDuration || videoDuration || Infinity
            ),
          });
        }

        // Create modified translation for resume
        const modifiedTranslation: SavedTranslation = {
          ...translation,
          srtContent: partialSrt,
          isPartial: true,
          completedBatches: batchIndex,
          totalBatches: totalBatches,
          batchSettings: translation.batchSettings || {
            maxVideoDuration: originalBatchDuration,
            maxConcurrentBatches: batchSettings?.maxConcurrentBatches || 1,
            batchOffset: batchSettings?.batchOffset || 60,
            streamingMode: true,
            presubMode: false,
            presubDuration: 120,
          },
        };

        // Pass batch retranslation info to show in queue
        handleTranslate(modifiedTranslation, batchIndex, "fromHere");
      };

      if (skipConfirm) {
        executeFromHere();
      } else {
        confirm(
          t("subtitleModal.translate.retranslateFromTitle"),
          t("subtitleModal.translate.retranslateFromConfirm", {
            from: batchIndex + 1,
            total: totalBatches,
          }),
          executeFromHere,
          t("subtitleModal.translate.retranslate")
        );
      }
    }
  };

  const handleSelectTranslation = async (translation: SavedTranslation) => {
    if (!videoUrl) return;
    await setActiveTranslation(videoUrl, translation.id);
    setActiveTranslationId(translation.id);
    onSelectTranslation(translation.srtContent);
    onClose();
  };
  const handleDeleteTranslation = (translation: SavedTranslation) => {
    confirmDestructive(
      t("subtitleModal.translate.deleteTitle"),
      t("subtitleModal.translate.deleteConfirm"),
      async () => {
        if (!videoUrl) return;

        // Calculate new state BEFORE deleting (to avoid race condition with cache)
        const remainingTranslations = savedTranslations.filter(
          (t) => t.id !== translation.id
        );

        // Determine new active translation
        let newActiveId: string | null = activeTranslationId;
        if (translation.id === activeTranslationId) {
          newActiveId = remainingTranslations[0]?.id || null;
        }

        // Update UI immediately
        setSavedTranslations(remainingTranslations);
        setActiveTranslationId(newActiveId);

        // Then persist to storage
        await deleteTranslation(videoUrl, translation.id);

        // Handle side effects
        if (remainingTranslations.length > 0) {
          // If deleted translation was active, apply new active one
          if (translation.id === activeTranslationId && newActiveId) {
            const newActive = remainingTranslations.find(
              (t) => t.id === newActiveId
            );
            if (newActive) {
              onSelectTranslation(newActive.srtContent);
            }
          }
        } else {
          // No translations left - clear everything
          onSelectTranslation(""); // Clear SRT content
          onTranslationDeleted?.(); // Notify parent to update state
        }
      }
    );
  };
  const handleSelectConfig = (configId: string) => {
    setSelectedConfigId(configId);
    setShowConfigPicker(false);
  };

  return (
    <View style={styles.tabContent}>
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <SavedTranslationsList
          translations={savedTranslations}
          activeTranslationId={activeTranslationId}
          onSelect={handleSelectTranslation}
          onDelete={handleDeleteTranslation}
          onResume={handleResumeTranslation}
          onRetranslateBatch={handleRetranslateBatch}
          onStopBatchRetranslate={async () => {
            if (videoUrl) {
              // Abort translation and pause in queue
              await translationManager.abortTranslation(videoUrl);
              const { queueManager } = await import("@services/queueManager");
              await queueManager.pauseBatchRetranslation(videoUrl);
            }
          }}
          onResumeBatchRetranslate={async () => {
            if (videoUrl && pausedBatchRetranslation) {
              // Find the translation to retranslate
              const translation = savedTranslations[0]; // Use first translation
              if (translation) {
                // Skip confirm since user already confirmed in queue modal
                handleRetranslateBatch(
                  translation,
                  pausedBatchRetranslation.batchIndex,
                  pausedBatchRetranslation.mode,
                  true // skipConfirm
                );
              }
            }
          }}
          videoDuration={videoDuration}
          isPausedInQueue={isPausedInQueue}
          isTranslating={isTranslating}
          batchRetranslateJob={batchRetranslateJob}
          pausedBatchRetranslation={pausedBatchRetranslation}
        />
        {!hasApiKey && (
          <View style={themedStyles.warningContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color={colors.warning}
            />
            <Text style={themedStyles.warningText}>
              {t("subtitleModal.translate.noApiKey")}
            </Text>
          </View>
        )}
        {videoDuration && videoDuration > 3600 && !streamingMode && (
          <View style={themedStyles.longVideoWarningContainer}>
            <View style={themedStyles.longVideoWarningContent}>
              <MaterialCommunityIcons
                name="clock-alert-outline"
                size={20}
                color={colors.warning}
              />
              <Text style={themedStyles.warningText}>
                {t("subtitleModal.translate.longVideoWarning")}
              </Text>
            </View>
            <Button3D
              onPress={() => handleStreamingModeChange(true)}
              title={t("subtitleModal.translate.enableStreaming")}
              variant="warning"
              size="small"
            />
          </View>
        )}
        <TranslateConfigPicker
          configs={geminiConfigs}
          selectedConfigId={selectedConfigId}
          showPicker={showConfigPicker}
          onTogglePicker={() => setShowConfigPicker(!showConfigPicker)}
          onSelectConfig={handleSelectConfig}
        />
        <PresetPromptPicker
          currentPresetId={currentPresetId}
          onSelectPreset={async (
            _prompt: string,
            presetId: PresetPromptType
          ) => {
            // Save presetId to config instead of overwriting systemPrompt
            const configIndex = geminiConfigs.findIndex(
              (c) => c.id === selectedConfigId
            );
            if (configIndex >= 0) {
              const updatedConfigs = [...geminiConfigs];
              updatedConfigs[configIndex] = {
                ...updatedConfigs[configIndex],
                presetId: presetId === "custom" ? undefined : presetId,
              };
              setGeminiConfigs(updatedConfigs);
              setCurrentPresetId(presetId);
              // Save to storage
              const { saveGeminiConfigs } = await import("@utils/storage");
              await saveGeminiConfigs(updatedConfigs);
            }
          }}
          style={{ marginBottom: 12 }}
        />
        <AdvancedOptions
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
          streamingMode={streamingMode}
          onStreamingModeChange={handleStreamingModeChange}
          presubMode={presubMode}
          onPresubModeChange={handlePresubModeChange}
          useCustomRange={useCustomRange}
          onUseCustomRangeChange={setUseCustomRange}
          rangeStartStr={rangeStartStr}
          onRangeStartChange={setRangeStartStr}
          rangeEndStr={rangeEndStr}
          onRangeEndChange={setRangeEndStr}
          videoDuration={videoDuration}
        />
        {/* Only show TranslationProgress for full video translation, not batch retranslation */}
        <TranslationProgress
          isTranslating={isTranslating && !batchRetranslateJob}
          translateStatus={translateStatus}
          keyStatus={keyStatus}
          batchProgress={batchProgress}
        />
      </ScrollView>
      <View style={styles.translateButtonContainer}>
        {isPausedInQueue ? (
          <View style={themedStyles.pausedContainer}>
            <View style={themedStyles.pausedContent}>
              <MaterialCommunityIcons
                name="pause-circle-outline"
                size={20}
                color={colors.textMuted}
              />
              <Text style={themedStyles.pausedText}>
                {pausedProgress
                  ? t("queue.pausedWithProgress", {
                      completed: pausedProgress.completed,
                      total: pausedProgress.total,
                    })
                  : t("queue.paused")}
              </Text>
            </View>
            <Button3D
              onPress={handleResumeFromQueue}
              title={t("queue.resumeTranslation")}
              variant="primary"
              size="small"
            />
          </View>
        ) : isWaitingInQueue ? (
          <View style={themedStyles.waitingContainer}>
            <View style={themedStyles.waitingContent}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={20}
                color={colors.warning}
              />
              <Text style={themedStyles.waitingText}>
                {queuePosition
                  ? t("queue.waitingPosition", { position: queuePosition })
                  : t("queue.waitingInQueue")}
              </Text>
            </View>
            {onCancelQueue && (
              <Button3D
                onPress={onCancelQueue}
                title={t("queue.cancelWaiting")}
                variant="destructive"
                size="small"
              />
            )}
          </View>
        ) : isTranslating && !batchRetranslateJob ? (
          // Only show stop button for full video translation, not batch retranslation
          <Button3D
            onPress={() => {
              if (videoUrl) {
                translationManager.abortTranslation(videoUrl);
              }
            }}
            icon="stop"
            title={t("subtitleModal.translate.stopTranslation")}
            variant="destructive"
          />
        ) : (
          <Button3D
            onPress={() => handleTranslate()}
            icon="translate"
            title={t("subtitleModal.translate.newTranslation")}
            variant="primary"
            disabled={!videoUrl || !hasApiKey}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: { flex: 1 },
  scrollContent: { flex: 1 },
  scrollContentContainer: { paddingBottom: 8 },
  translateButtonContainer: { marginTop: 8, marginBottom: 8 },
});

const translateTabThemedStyles = createThemedStyles((colors) => ({
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,183,77,0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningText: { color: colors.warning, fontSize: 13, flex: 1 },
  longVideoWarningContainer: {
    backgroundColor: "rgba(255,183,77,0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  longVideoWarningContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  waitingContainer: {
    backgroundColor: "rgba(255,183,77,0.15)",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  waitingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  waitingText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  pausedContainer: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pausedContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pausedText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
}));
