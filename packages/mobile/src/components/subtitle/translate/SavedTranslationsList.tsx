import React, { useState, useMemo } from "react";
import { View, TouchableOpacity, LayoutAnimation } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles } from "@hooks/useThemedStyles";
import type { SavedTranslation, TranslationJob } from "@src/types";
import { createTranslateStyles } from "./translateStyles";
import { parseSRT } from "@utils/srtParser";
import { PRESET_PROMPTS } from "@constants/defaults";

interface SavedTranslationsListProps {
  translations: SavedTranslation[];
  activeTranslationId: string | null;
  onSelect: (translation: SavedTranslation) => void;
  onDelete: (translation: SavedTranslation) => void;
  onResume?: (translation: SavedTranslation) => void;
  onRetranslateBatch?: (
    translation: SavedTranslation,
    batchIndex: number,
    mode: "single" | "fromHere"
  ) => void;
  onStopBatchRetranslate?: () => void;
  onResumeBatchRetranslate?: () => void;
  videoDuration?: number;
  isPausedInQueue?: boolean;
  isTranslating?: boolean;
  // Batch retranslation state
  batchRetranslateJob?: TranslationJob | null;
  // Paused batch retranslation info
  pausedBatchRetranslation?: {
    batchIndex: number;
    mode: "single" | "fromHere";
  } | null;
}

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

interface BatchInfo {
  index: number;
  startTime: number;
  endTime: number;
  subtitleCount: number;
  hasContent: boolean;
  status: "pending" | "completed" | "error";
}

const SavedTranslationsList: React.FC<SavedTranslationsListProps> = ({
  translations,
  activeTranslationId,
  onSelect,
  onDelete,
  onResume,
  onRetranslateBatch,
  onStopBatchRetranslate,
  onResumeBatchRetranslate,
  videoDuration,
  isPausedInQueue = false,
  isTranslating = false,
  batchRetranslateJob,
  pausedBatchRetranslation,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(() => createTranslateStyles(colors));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Calculate batches for a translation
  const getBatchesInfo = useMemo(() => {
    return (item: SavedTranslation): BatchInfo[] => {
      const duration = item.videoDuration || videoDuration || 0;
      // IMPORTANT: Use original batch settings from the translation
      // This ensures batch display matches how it was originally translated
      const batchDuration = item.batchSettings?.maxVideoDuration || 600;
      const batchOffset = item.batchSettings?.batchOffset ?? 60; // Default 60s tolerance

      // If we have saved totalBatches and batchStatuses, use them directly
      // This handles cases where videoDuration might not be available
      if (item.totalBatches && item.totalBatches > 0 && item.batchStatuses) {
        const parsed = parseSRT(item.srtContent);
        const batches: BatchInfo[] = [];

        for (let i = 0; i < item.totalBatches; i++) {
          const startTime = i * batchDuration;
          const endTime =
            duration > 0
              ? Math.min((i + 1) * batchDuration, duration)
              : (i + 1) * batchDuration;

          // Count subtitles in this batch
          const subtitlesInBatch = parsed.filter(
            (sub) => sub.startTime >= startTime && sub.startTime < endTime
          );

          batches.push({
            index: i,
            startTime,
            endTime,
            subtitleCount: subtitlesInBatch.length,
            hasContent: subtitlesInBatch.length > 0,
            status: item.batchStatuses[i] || "completed",
          });
        }

        return batches;
      }

      if (duration <= 0) return [];

      // Apply tolerance: if duration <= batchDuration + batchOffset, it's a single batch
      // This matches the logic in geminiService.ts
      const effectiveMaxDuration = batchDuration + batchOffset;
      if (duration <= effectiveMaxDuration) {
        // Single batch - video fits within tolerance
        const parsed = parseSRT(item.srtContent);
        const savedStatus = item.batchStatuses?.[0];
        const hasContent = parsed.length > 0;

        return [
          {
            index: 0,
            startTime: 0,
            endTime: duration,
            subtitleCount: parsed.length,
            hasContent,
            status: savedStatus || (hasContent ? "completed" : "pending"),
          },
        ];
      }

      const totalBatches = Math.ceil(duration / batchDuration);
      const parsed = parseSRT(item.srtContent);
      const batches: BatchInfo[] = [];

      for (let i = 0; i < totalBatches; i++) {
        const startTime = i * batchDuration;
        const endTime = Math.min((i + 1) * batchDuration, duration);

        // Count subtitles in this batch
        const subtitlesInBatch = parsed.filter(
          (sub) => sub.startTime >= startTime && sub.startTime < endTime
        );

        // Use saved batchStatuses if available, otherwise fallback to hasContent check
        const savedStatus = item.batchStatuses?.[i];
        const hasContent = subtitlesInBatch.length > 0;

        // Determine status: use saved status if available, otherwise infer from content
        let status: "pending" | "completed" | "error" = "pending";
        if (savedStatus) {
          status = savedStatus;
        } else if (hasContent) {
          // Fallback for old translations without batchStatuses
          status = "completed";
        }

        batches.push({
          index: i,
          startTime,
          endTime,
          subtitleCount: subtitlesInBatch.length,
          hasContent,
          status,
        });
      }

      return batches;
    };
  }, [videoDuration]);

  // Get preset name from presetId
  const getPresetName = (presetId?: string): string | null => {
    if (!presetId) return null;
    const preset = PRESET_PROMPTS.find((p) => p.id === presetId);
    return preset?.nameVi || preset?.name || null;
  };

  // Format batch settings info
  const getBatchSettingsInfo = (item: SavedTranslation): string | null => {
    const bs = item.batchSettings;
    if (!bs) return null;

    const parts: string[] = [];
    if (bs.maxVideoDuration) {
      const mins = Math.floor(bs.maxVideoDuration / 60);
      parts.push(`${mins}p`);
    }
    if (bs.batchOffset !== undefined) {
      parts.push(`±${bs.batchOffset}s`);
    }
    if (
      !bs.streamingMode &&
      bs.maxConcurrentBatches &&
      bs.maxConcurrentBatches > 1
    ) {
      parts.push(`x${bs.maxConcurrentBatches}`);
    }
    if (bs.streamingMode) {
      parts.push("stream");
    }

    return parts.length > 0 ? parts.join(" • ") : null;
  };

  if (translations.length === 0) return null;

  const getProgressPercent = (item: SavedTranslation) => {
    if (!item.isPartial || !item.totalBatches) return 100;
    return Math.round(((item.completedBatches || 0) / item.totalBatches) * 100);
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const handleRetranslateBatch = (
    item: SavedTranslation,
    batchIndex: number,
    mode: "single" | "fromHere"
  ) => {
    if (onRetranslateBatch) {
      onRetranslateBatch(item, batchIndex, mode);
    }
  };

  return (
    <View style={styles.translationsSection}>
      <Text style={styles.sectionTitle}>
        {t("subtitleModal.translate.savedTranslations")}
      </Text>
      <View style={styles.translationsList}>
        {translations.map((item) => {
          const progressPercent = getProgressPercent(item);
          const isExpanded = expandedId === item.id;
          const batches = isExpanded ? getBatchesInfo(item) : [];

          return (
            <View
              key={item.id}
              style={[
                styles.translationItem,
                item.id === activeTranslationId && styles.translationItemActive,
                item.isPartial && styles.translationItemPartial,
                isExpanded && styles.translationItemExpanded,
              ]}
            >
              {/* Header - always visible */}
              <TouchableOpacity
                style={styles.translationHeader}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.translationHeaderLeft}>
                  <MaterialCommunityIcons
                    name={isExpanded ? "chevron-down" : "chevron-right"}
                    size={20}
                    color={colors.textMuted}
                  />
                  <MaterialCommunityIcons
                    name={
                      item.isPartial
                        ? "progress-clock"
                        : item.id === activeTranslationId
                        ? "check-circle"
                        : "file-document-outline"
                    }
                    size={16}
                    color={
                      item.isPartial
                        ? colors.warning
                        : item.id === activeTranslationId
                        ? colors.success
                        : colors.textMuted
                    }
                  />
                  <View style={styles.translationHeaderInfo}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 4,
                      }}
                    >
                      <Text style={styles.translationConfig}>
                        {item.configName}
                      </Text>
                      {getPresetName(item.presetId) && (
                        <View style={styles.presetBadge}>
                          <MaterialCommunityIcons
                            name="tag-outline"
                            size={10}
                            color={colors.primary}
                          />
                          <Text style={styles.presetBadgeText}>
                            {getPresetName(item.presetId)}
                          </Text>
                        </View>
                      )}
                      {getBatchSettingsInfo(item) && (
                        <View style={styles.settingsBadge}>
                          <MaterialCommunityIcons
                            name="cog-outline"
                            size={10}
                            color={colors.textMuted}
                          />
                          <Text style={styles.settingsBadgeText}>
                            {getBatchSettingsInfo(item)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.translationDate}>
                      {formatDate(item.createdAt)}
                      {item.isPartial && ` • ${progressPercent}%`}
                    </Text>
                  </View>
                </View>
                {/* Quick actions on header */}
                <View style={styles.translationHeaderActions}>
                  {item.isPartial &&
                    onResume &&
                    !isPausedInQueue &&
                    !isTranslating && (
                      <TouchableOpacity
                        style={styles.headerActionBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          onResume(item);
                        }}
                      >
                        <MaterialCommunityIcons
                          name="play-circle-outline"
                          size={20}
                          color={colors.success}
                        />
                      </TouchableOpacity>
                    )}
                </View>
              </TouchableOpacity>

              {/* Expanded content */}
              {isExpanded && (
                <View style={styles.translationExpanded}>
                  {/* Progress bar for partial */}
                  {item.isPartial && (
                    <View style={styles.expandedProgressContainer}>
                      <View style={styles.partialProgressBar}>
                        <View
                          style={[
                            styles.partialProgressFill,
                            { width: `${progressPercent}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.partialProgressText}>
                        {t("subtitleModal.translate.partial")} •{" "}
                        {item.completedBatches}/{item.totalBatches || "?"}{" "}
                        batches
                      </Text>
                    </View>
                  )}

                  {/* Batch grid */}
                  {batches.length > 0 && (
                    <View style={styles.batchesContainer}>
                      <Text style={styles.batchesTitle}>
                        {t("subtitleModal.translate.batchList")}
                      </Text>
                      <View style={styles.batchesGrid}>
                        {batches.map((batch) => {
                          // Check if this batch is being retranslated
                          const isBatchRetranslating =
                            batchRetranslateJob?.status === "processing" &&
                            batchRetranslateJob?.rangeStart !== undefined &&
                            batch.startTime >= batchRetranslateJob.rangeStart &&
                            (batchRetranslateJob.rangeEnd === undefined ||
                              batch.startTime < batchRetranslateJob.rangeEnd);

                          // Check if this batch is paused
                          const isBatchPaused =
                            pausedBatchRetranslation &&
                            ((pausedBatchRetranslation.mode === "single" &&
                              batch.index ===
                                pausedBatchRetranslation.batchIndex) ||
                              (pausedBatchRetranslation.mode === "fromHere" &&
                                batch.index >=
                                  pausedBatchRetranslation.batchIndex));

                          // Use status from batchStatuses metadata
                          const isCompleted =
                            batch.status === "completed" &&
                            !isBatchRetranslating &&
                            !isBatchPaused;
                          const isError = batch.status === "error";
                          const isProcessing = isBatchRetranslating;
                          const isPaused = isBatchPaused && !isProcessing;

                          return (
                            <View
                              key={batch.index}
                              style={styles.batchChipContainer}
                            >
                              <View
                                style={[
                                  styles.batchChip,
                                  isCompleted && styles.batchChipCompleted,
                                  isError && styles.batchChipError,
                                  isProcessing && styles.batchChipProcessing,
                                  isPaused && styles.batchChipPaused,
                                  !isCompleted &&
                                    !isError &&
                                    !isProcessing &&
                                    !isPaused &&
                                    styles.batchChipPending,
                                ]}
                              >
                                {isProcessing ? (
                                  <MaterialCommunityIcons
                                    name="translate"
                                    size={12}
                                    color="#fff"
                                  />
                                ) : isPaused ? (
                                  <MaterialCommunityIcons
                                    name="pause"
                                    size={12}
                                    color="#fff"
                                  />
                                ) : (
                                  <Text
                                    style={[
                                      styles.batchChipText,
                                      isCompleted &&
                                        styles.batchChipTextCompleted,
                                      isError && styles.batchChipTextError,
                                    ]}
                                  >
                                    {batch.index + 1}
                                  </Text>
                                )}
                                <Text
                                  style={[
                                    styles.batchChipTime,
                                    isCompleted &&
                                      styles.batchChipTimeCompleted,
                                    isError && styles.batchChipTimeError,
                                    isProcessing && { color: "#fff" },
                                    isPaused && { color: "#fff" },
                                  ]}
                                >
                                  {formatTime(batch.startTime)} -{" "}
                                  {formatTime(batch.endTime)}
                                </Text>
                              </View>
                              {/* Retranslate buttons - hide when retranslating or paused */}
                              {onRetranslateBatch &&
                                !batchRetranslateJob &&
                                !pausedBatchRetranslation && (
                                  <View style={styles.batchActions}>
                                    <TouchableOpacity
                                      style={styles.batchActionBtn}
                                      onPress={() =>
                                        handleRetranslateBatch(
                                          item,
                                          batch.index,
                                          "single"
                                        )
                                      }
                                    >
                                      <MaterialCommunityIcons
                                        name="refresh"
                                        size={14}
                                        color={colors.primary}
                                      />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={styles.batchActionBtn}
                                      onPress={() =>
                                        handleRetranslateBatch(
                                          item,
                                          batch.index,
                                          "fromHere"
                                        )
                                      }
                                    >
                                      <MaterialCommunityIcons
                                        name="arrow-right-bold"
                                        size={14}
                                        color={colors.warning}
                                      />
                                    </TouchableOpacity>
                                  </View>
                                )}
                            </View>
                          );
                        })}
                      </View>
                      {/* Stop button when retranslating */}
                      {batchRetranslateJob?.status === "processing" &&
                        onStopBatchRetranslate && (
                          <TouchableOpacity
                            style={[
                              styles.expandedActionBtn,
                              { backgroundColor: colors.error, marginTop: 8 },
                            ]}
                            onPress={onStopBatchRetranslate}
                          >
                            <MaterialCommunityIcons
                              name="pause"
                              size={16}
                              color="#fff"
                            />
                            <Text style={{ color: "#fff", marginLeft: 4 }}>
                              {t("subtitleModal.translate.pauseRetranslate")}
                            </Text>
                          </TouchableOpacity>
                        )}
                      {/* Resume button when paused */}
                      {pausedBatchRetranslation && onResumeBatchRetranslate && (
                        <TouchableOpacity
                          style={[
                            styles.expandedActionBtn,
                            { backgroundColor: colors.success, marginTop: 8 },
                          ]}
                          onPress={onResumeBatchRetranslate}
                        >
                          <MaterialCommunityIcons
                            name="play"
                            size={16}
                            color="#fff"
                          />
                          <Text style={{ color: "#fff", marginLeft: 4 }}>
                            {pausedBatchRetranslation.mode === "single"
                              ? t("subtitleModal.translate.resumeBatchSingle", {
                                  batch:
                                    pausedBatchRetranslation.batchIndex + 1,
                                })
                              : t("subtitleModal.translate.resumeBatchFrom", {
                                  batch:
                                    pausedBatchRetranslation.batchIndex + 1,
                                })}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {!batchRetranslateJob && !pausedBatchRetranslation && (
                        <Text style={styles.batchesHint}>
                          {t("subtitleModal.translate.retranslateHint")}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={styles.expandedActions}>
                    <TouchableOpacity
                      style={[
                        styles.expandedActionBtn,
                        styles.expandedActionBtnPrimary,
                      ]}
                      onPress={() => onSelect(item)}
                    >
                      <MaterialCommunityIcons
                        name="check"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.expandedActionBtnTextPrimary}>
                        {t("subtitleModal.translate.useThis")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.expandedActionBtn,
                        styles.expandedActionBtnDanger,
                      ]}
                      onPress={() => onDelete(item)}
                    >
                      <MaterialCommunityIcons
                        name="delete-outline"
                        size={18}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default SavedTranslationsList;
