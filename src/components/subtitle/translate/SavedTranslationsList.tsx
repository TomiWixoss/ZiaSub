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

interface SavedTranslationsListProps {
  translations: SavedTranslation[];
  activeTranslationId: string | null;
  onSelect: (translation: SavedTranslation) => void;
  onDelete: (translation: SavedTranslation) => void;
  onResume?: (translation: SavedTranslation) => void;
  onRetranslateFromBatch?: (
    translation: SavedTranslation,
    fromBatchIndex: number
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
}

const SavedTranslationsList: React.FC<SavedTranslationsListProps> = ({
  translations,
  activeTranslationId,
  onSelect,
  onDelete,
  onResume,
  onRetranslateFromBatch,
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

      if (duration <= 0) return [];

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

        batches.push({
          index: i,
          startTime,
          endTime,
          subtitleCount: subtitlesInBatch.length,
          hasContent: subtitlesInBatch.length > 0,
        });
      }

      return batches;
    };
  }, [videoDuration]);

  if (translations.length === 0) return null;

  const getProgressPercent = (item: SavedTranslation) => {
    if (!item.isPartial || !item.totalBatches) return 100;
    return Math.round(((item.completedBatches || 0) / item.totalBatches) * 100);
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const handleRetranslateFrom = (
    item: SavedTranslation,
    batchIndex: number
  ) => {
    if (onRetranslateFromBatch) {
      onRetranslateFromBatch(item, batchIndex);
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
                    <Text style={styles.translationConfig}>
                      {item.configName}
                    </Text>
                    <Text style={styles.translationDate}>
                      {formatDate(item.createdAt)}
                      {item.isPartial && ` • ${progressPercent}%`}
                    </Text>
                  </View>
                </View>
                {/* Quick actions on header */}
                <View style={styles.translationHeaderActions}>
                  {item.isPartial && onResume && (
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
                          const isCompleted = item.isPartial
                            ? batch.index < (item.completedBatches || 0)
                            : batch.hasContent;

                          return (
                            <TouchableOpacity
                              key={batch.index}
                              style={[
                                styles.batchChip,
                                isCompleted && styles.batchChipCompleted,
                                !isCompleted && styles.batchChipPending,
                              ]}
                              onPress={() =>
                                handleRetranslateFrom(item, batch.index)
                              }
                              disabled={!onRetranslateFromBatch}
                            >
                              <Text
                                style={[
                                  styles.batchChipText,
                                  isCompleted && styles.batchChipTextCompleted,
                                ]}
                              >
                                {batch.index + 1}
                              </Text>
                              <Text
                                style={[
                                  styles.batchChipTime,
                                  isCompleted && styles.batchChipTimeCompleted,
                                ]}
                              >
                                {formatTime(batch.startTime)}
                              </Text>
                            </TouchableOpacity>
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
