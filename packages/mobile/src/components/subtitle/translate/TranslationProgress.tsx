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
}

const TranslationProgress: React.FC<TranslationProgressProps> = ({
  isTranslating,
  translateStatus,
  keyStatus,
  batchProgress,
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
              {isMultiBatch
                ? t("subtitleModal.translate.progress.translatingPart", {
                    current: completedBatches + 1,
                    total: totalBatches,
                  })
                : t("subtitleModal.translate.progress.translatingVideo")}
            </Text>
            {keyStatus && (
              <Text style={styles.keyStatus} numberOfLines={1}>
                {keyStatus}
              </Text>
            )}
          </View>
        </View>
        {isMultiBatch && (
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

      {/* Batch indicators for multi-batch */}
      {isMultiBatch && batchProgress?.batchStatuses && (
        <View style={styles.batchesContainer}>
          {batchProgress.batchStatuses.map((status, index) => {
            const isCompleted = status === "completed";
            const isProcessing = status === "processing";
            const isError = status === "error";

            return (
              <View
                key={index}
                style={[
                  styles.batchIndicator,
                  isCompleted && styles.batchCompleted,
                  isProcessing && styles.batchProcessing,
                  isError && styles.batchError,
                ]}
              >
                {isCompleted ? (
                  <MaterialCommunityIcons name="check" size={14} color="#fff" />
                ) : isProcessing ? (
                  <MaterialCommunityIcons
                    name="translate"
                    size={14}
                    color="#fff"
                  />
                ) : isError ? (
                  <MaterialCommunityIcons name="close" size={14} color="#fff" />
                ) : (
                  <Text style={styles.batchNumber}>{index + 1}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Single batch - simple status */}
      {!isMultiBatch && (
        <View style={styles.singleBatchStatus}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={14}
            color={colors.textMuted}
          />
          <Text style={styles.statusText}>{translateStatus}</Text>
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
  batchError: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  batchNumber: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600" as const,
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
