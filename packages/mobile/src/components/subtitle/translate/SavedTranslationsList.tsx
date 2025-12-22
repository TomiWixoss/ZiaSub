import React, { useState, useMemo } from "react";
import { View, TouchableOpacity, LayoutAnimation } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles } from "@hooks/useThemedStyles";
import type { SavedTranslation } from "@src/types";
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
  videoDuration?: number;
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
  videoDuration,
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
                    </View>
                    <Text style={styles.translationDate}>
                      {formatDate(item.createdAt)}
                      {item.isPartial && ` • ${progressPercent}%`}
                    </Text>
                  </View>
                </View>
                {/* Quick actions on header - removed resume button, use main Resume button below instead */}
                <View style={styles.translationHeaderActions}></View>
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
                          // Use status from batchStatuses metadata
                          const isCompleted = batch.status === "completed";
                          const isError = batch.status === "error";

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
                                  !isCompleted &&
                                    !isError &&
                                    styles.batchChipPending,
                                ]}
                              >
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
                                <Text
                                  style={[
                                    styles.batchChipTime,
                                    isCompleted &&
                                      styles.batchChipTimeCompleted,
                                    isError && styles.batchChipTimeError,
                                  ]}
                                >
                                  {formatTime(batch.startTime)} -{" "}
                                  {formatTime(batch.endTime)}
                                </Text>
                              </View>
                              {/* Retranslate buttons */}
                              {onRetranslateBatch && (
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
                      <Text style={styles.batchesHint}>
                        {t("subtitleModal.translate.retranslateHint")}
                      </Text>
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
