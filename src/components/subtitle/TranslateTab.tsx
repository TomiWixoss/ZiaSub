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
import { parseTime } from "@utils/videoUtils";
import { parseSRT } from "@utils/srtParser";
import Button3D from "../common/Button3D";
import {
  SavedTranslationsList,
  TranslationProgress,
  AdvancedOptions,
  TranslateConfigPicker,
} from "./translate";

interface TranslateTabProps {
  videoUrl?: string;
  videoDuration?: number;
  batchSettings?: BatchSettings;
  isTranslating: boolean;
  translateStatus: string;
  keyStatus: string | null;
  batchProgress: BatchProgress | null;
  onClose: () => void;
  onSelectTranslation: (srtContent: string) => void;
  onBatchSettingsChange?: (settings: BatchSettings) => void;
  onTranslationDeleted?: () => void;
  onReloadRef?: React.MutableRefObject<(() => void) | null>;
  visible?: boolean;
}

export const TranslateTab: React.FC<TranslateTabProps> = ({
  videoUrl,
  videoDuration,
  batchSettings,
  isTranslating,
  translateStatus,
  keyStatus,
  batchProgress,
  onClose,
  onSelectTranslation,
  onBatchSettingsChange,
  onTranslationDeleted,
  onReloadRef,
  visible,
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

  const handleTranslate = async (resumeTranslation?: SavedTranslation) => {
    const config = geminiConfigs.find((c) => c.id === selectedConfigId);
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
    // Check if another video is being translated
    if (translationManager.isTranslating())
      return alert(
        t("common.notice"),
        t("subtitleModal.translate.anotherTranslating")
      );

    let rangeStart: number | undefined;
    let rangeEnd: number | undefined;
    let resumeData:
      | {
          partialSrt: string;
          completedBatchRanges: Array<{ start: number; end: number }>;
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

      translationManager.startTranslation(
        videoUrl,
        config,
        videoDuration,
        effectiveBatchSettings,
        rangeStart,
        rangeEnd,
        resumeData
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
    mode: "single" | "fromHere"
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

    if (mode === "single") {
      // Mode 1: Retranslate ONLY this batch, keep before and after
      confirm(
        t("subtitleModal.translate.retranslateSingleTitle"),
        t("subtitleModal.translate.retranslateSingleConfirm", {
          batch: batchIndex + 1,
          total: totalBatches,
        }),
        async () => {
          const config = geminiConfigs.find((c) => c.id === selectedConfigId);
          if (!config) {
            alert(
              t("subtitleModal.translate.notSelected"),
              t("subtitleModal.translate.notSelectedMessage")
            );
            return;
          }
          if (!videoUrl) return;
          if (translationManager.isTranslating()) {
            alert(
              t("common.notice"),
              t("subtitleModal.translate.anotherTranslating")
            );
            return;
          }

          try {
            // Import needed functions
            const { translateVideoWithGemini } = await import(
              "@services/geminiService"
            );
            const { replaceBatchInSrt } = await import("@utils/srtParser");
            const { saveTranslation } = await import("@utils/storage");

            // Translate only this batch
            const newBatchSrt = await translateVideoWithGemini(
              videoUrl,
              config,
              undefined,
              {
                videoDuration: translation.videoDuration || videoDuration,
                rangeStart: batchStart,
                rangeEnd: batchEnd,
              }
            );

            // Replace this batch in existing SRT
            const updatedSrt = replaceBatchInSrt(
              translation.srtContent,
              newBatchSrt,
              batchStart,
              batchEnd
            );

            // Save as new translation
            await saveTranslation(videoUrl, updatedSrt, config.name);
            await loadTranslations();
            onSelectTranslation(updatedSrt);

            alert(
              t("common.success"),
              t("subtitleModal.translate.batchRetranslated", {
                batch: batchIndex + 1,
              })
            );
          } catch (error: any) {
            alert(
              t("subtitleModal.translate.error"),
              error.message || t("errors.generic")
            );
          }
        },
        t("subtitleModal.translate.retranslate")
      );
    } else {
      // Mode 2: Retranslate FROM this batch onwards
      confirm(
        t("subtitleModal.translate.retranslateFromTitle"),
        t("subtitleModal.translate.retranslateFromConfirm", {
          from: batchIndex + 1,
          total: totalBatches,
        }),
        () => {
          // Keep batches before batchIndex
          const parsed = parseSRT(translation.srtContent);
          const keptSubtitles = parsed.filter(
            (sub) => sub.endTime <= batchStart
          );
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

          handleTranslate(modifiedTranslation);
        },
        t("subtitleModal.translate.retranslate")
      );
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
        keyboardShouldPersistTaps="handled"
      >
        <SavedTranslationsList
          translations={savedTranslations}
          activeTranslationId={activeTranslationId}
          onSelect={handleSelectTranslation}
          onDelete={handleDeleteTranslation}
          onResume={handleResumeTranslation}
          onRetranslateBatch={handleRetranslateBatch}
          videoDuration={videoDuration}
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
        <TranslationProgress
          isTranslating={isTranslating}
          translateStatus={translateStatus}
          keyStatus={keyStatus}
          batchProgress={batchProgress}
        />
      </ScrollView>
      <View style={styles.translateButtonContainer}>
        {isTranslating ? (
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
}));
