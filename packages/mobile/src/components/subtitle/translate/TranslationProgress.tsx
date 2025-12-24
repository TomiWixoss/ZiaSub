import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { BatchProgress } from "@src/types";

interface TranslationProgressProps {
  isTranslating: boolean;
  translateStatus: string;
  keyStatus: string | null;
  batchProgress: BatchProgress | null;
  presubMode?: boolean;
  // Time range translation info
  rangeStart?: number;
  rangeEnd?: number;
  // Batch duration for calculating batch times in time range
  batchDuration?: number;
}

// Format time for display (supports hours)
const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const TranslationProgress: React.FC<TranslationProgressProps> = ({
  isTranslating,
  translateStatus,
  keyStatus,
  batchProgress,
  presubMode = false,
  rangeStart,
  rangeEnd,
  batchDuration = 600, // Default 10 minutes
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  if (!isTranslating) return null;

  const totalBatches = batchProgress?.totalBatches || 1;
  const completedBatches = batchProgress?.completedBatches || 0;
  const progressPercent =
    totalBatches > 0 ? (completedBatches / totalBatches) * 100 : 0;
  const isMultiBatch = totalBatches > 1;

  // Check if this is a time range translation
  const isTimeRangeTranslation =
    rangeStart !== undefined || rangeEnd !== undefined;
  const timeRangeText = isTimeRangeTranslation
    ? `${formatTime(rangeStart || 0)} - ${formatTime(rangeEnd || 0)}`
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="translate" size={20} color="#fff" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>
              {isTimeRangeTranslation
                ? t("subtitleModal.translate.progress.translatingRange", {
                    range: timeRangeText,
                  })
                : isMultiBatch
                ? t("subtitleModal.translate.progress.translatingPart", {
                    current: completedBatches + 1,
                    total: totalBatches,
                  })
                : t("subtitleModal.translate.progress.translatingVideo")}
            </Text>
            {/* Time range badge */}
            {isTimeRangeTranslation && (
              <View style={styles.timeRangeBadge}>
                <MaterialCommunityIcons
                  name="clock-time-four-outline"
                  size={12}
                  color={colors.primary}
                />
                <Text style={styles.timeRangeText}>{timeRangeText}</Text>
              </View>
            )}
            {keyStatus && (
              <Text style={styles.keyStatus} numberOfLines={1}>
                {keyStatus}
              </Text>
            )}
          </View>
        </View>
        {isMultiBatch && !isTimeRangeTranslation && (
          <Text style={styles.progressPercent}>
            {Math.round(progressPercent)}%
          </Text>
        )}
        {isTimeRangeTranslation && isMultiBatch && (
          <Text style={styles.progressPercent}>
            {Math.round(progressPercent)}%
          </Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${Math.max(progressPercent, 5)}%` },
          ]}
        />
      </View>

      {/* Batch indicators for multi-batch - hide for time range translation */}
      {isMultiBatch &&
        batchProgress?.batchStatuses &&
        !isTimeRangeTranslation && (
          <View style={styles.batchesContainer}>
            {batchProgress.batchStatuses.map((status, index) => {
              const isCompleted = status === "completed";
              const isProcessing = status === "processing";
              const isError = status === "error";
              // First batch in presub mode should be yellow
              const isPresubBatch = presubMode && index === 0;

              return (
                <View
                  key={index}
                  style={[
                    styles.batchIndicator,
                    isCompleted && styles.batchCompleted,
                    isProcessing &&
                      (isPresubBatch
                        ? styles.batchPresub
                        : styles.batchProcessing),
                    isError && styles.batchError,
                  ]}
                >
                  {isCompleted ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color="#fff"
                    />
                  ) : isProcessing ? (
                    <MaterialCommunityIcons
                      name="translate"
                      size={14}
                      color="#fff"
                    />
                  ) : isError ? (
                    <MaterialCommunityIcons
                      name="close"
                      size={14}
                      color="#fff"
                    />
                  ) : (
                    <Text style={styles.batchNumber}>{index + 1}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

      {/* Batch indicators for time range translation - show with correct time range */}
      {isMultiBatch &&
        batchProgress?.batchStatuses &&
        isTimeRangeTranslation && (
          <View style={styles.batchesContainer}>
            {batchProgress.batchStatuses.map((status, index) => {
              const isCompleted = status === "completed";
              const isProcessing = status === "processing";
              const isError = status === "error";
              // Calculate batch time within the range
              const effectiveRangeStart = rangeStart || 0;
              const batchStartTime =
                effectiveRangeStart + index * batchDuration;
              const batchEndTime = Math.min(
                effectiveRangeStart + (index + 1) * batchDuration,
                rangeEnd || effectiveRangeStart + batchDuration
              );

              return (
                <View key={index} style={[styles.timeRangeBatchContainer]}>
                  <View
                    style={[
                      styles.batchIndicator,
                      isCompleted && styles.batchCompleted,
                      isProcessing && styles.batchProcessing,
                      isError && styles.batchError,
                    ]}
                  >
                    {isCompleted ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={14}
                        color="#fff"
                      />
                    ) : isProcessing ? (
                      <MaterialCommunityIcons
                        name="translate"
                        size={14}
                        color="#fff"
                      />
                    ) : isError ? (
                      <MaterialCommunityIcons
                        name="close"
                        size={14}
                        color="#fff"
                      />
                    ) : (
                      <Text style={styles.batchNumber}>{index + 1}</Text>
                    )}
                  </View>
                  <Text style={styles.batchTimeText}>
                    {formatTime(batchStartTime)}-{formatTime(batchEndTime)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

      {/* Single batch - simple status */}
      {!isMultiBatch && !isTimeRangeTranslation && (
        <View style={styles.singleBatchStatus}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={14}
            color={colors.textMuted}
          />
          <Text style={styles.statusText}>{translateStatus}</Text>
        </View>
      )}

      {/* Time range translation status - show time range info */}
      {isTimeRangeTranslation && (
        <View style={styles.singleBatchStatus}>
          <MaterialCommunityIcons
            name="clock-time-four-outline"
            size={14}
            color={colors.primary}
          />
          <Text style={[styles.statusText, { color: colors.primary }]}>
            {isMultiBatch
              ? t("subtitleModal.translate.progress.translatingPart", {
                  current: completedBatches + 1,
                  total: totalBatches,
                })
              : translateStatus}
          </Text>
        </View>
      )}
    </View>
  );
};

const themedStyles = createThemedStyles((colors) => ({
  container: {
    backgroundColor: colors.primary + "15",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  keyStatus: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  timeRangeBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.primary + "20",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: "flex-start" as const,
    gap: 4,
  },
  timeRangeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "500" as const,
  },
  progressPercent: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "700" as const,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: "hidden" as const,
    marginBottom: 12,
  },
  progressBar: {
    height: "100%" as const,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  batchesContainer: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
  },
  batchIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  batchCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  batchProcessing: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  batchPresub: {
    backgroundColor: colors.warning + "20", // Warning with 20% opacity
    borderColor: colors.warning, // Warning border
  },
  batchError: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  batchNumber: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600" as const,
  },
  timeRangeBatchContainer: {
    alignItems: "center" as const,
    gap: 2,
  },
  batchTimeText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "500" as const,
  },
  singleBatchStatus: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 12,
  },
}));

export default TranslationProgress;
