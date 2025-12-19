import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@src/contexts";
import { useThemedStyles } from "@hooks/useThemedStyles";
import type { BatchProgress } from "@src/types";
import { createTranslateStyles } from "./translateStyles";

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
  const { colors } = useTheme();
  const styles = useThemedStyles(() => createTranslateStyles(colors));

  if (!isTranslating) return null;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <View style={styles.progressTitleRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.progressTitle}>{translateStatus}</Text>
        </View>
        {batchProgress && batchProgress.totalBatches > 1 && (
          <Text style={styles.progressCount}>
            {batchProgress.completedBatches}/{batchProgress.totalBatches}
          </Text>
        )}
      </View>
      {keyStatus && <Text style={styles.keyStatusText}>{keyStatus}</Text>}
      {batchProgress && batchProgress.totalBatches > 1 && (
        <View style={styles.batchGrid}>
          {batchProgress.batchStatuses.map((status, index) => (
            <View
              key={index}
              style={[
                styles.batchItem,
                status === "completed" && styles.batchCompleted,
                status === "processing" && styles.batchProcessing,
                status === "error" && styles.batchError,
              ]}
            >
              <Text style={styles.batchItemText}>{index + 1}</Text>
              {status === "completed" && (
                <MaterialCommunityIcons
                  name="check"
                  size={12}
                  color={colors.text}
                />
              )}
              {status === "error" && (
                <MaterialCommunityIcons
                  name="close"
                  size={12}
                  color={colors.text}
                />
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default TranslationProgress;
