import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles } from "@hooks/useThemedStyles";
import type { SavedTranslation } from "@src/types";
import { createTranslateStyles } from "./translateStyles";

interface SavedTranslationsListProps {
  translations: SavedTranslation[];
  activeTranslationId: string | null;
  onSelect: (translation: SavedTranslation) => void;
  onDelete: (translation: SavedTranslation) => void;
  onResume?: (translation: SavedTranslation) => void;
}

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const SavedTranslationsList: React.FC<SavedTranslationsListProps> = ({
  translations,
  activeTranslationId,
  onSelect,
  onDelete,
  onResume,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(() => createTranslateStyles(colors));

  if (translations.length === 0) return null;

  const getProgressPercent = (item: SavedTranslation) => {
    if (!item.isPartial || !item.totalBatches) return 0;
    return Math.round(((item.completedBatches || 0) / item.totalBatches) * 100);
  };

  return (
    <View style={styles.translationsSection}>
      <Text style={styles.sectionTitle}>
        {t("subtitleModal.translate.savedTranslations")}
      </Text>
      <View style={styles.translationsList}>
        {translations.map((item) => {
          const progressPercent = getProgressPercent(item);

          return (
            <View
              key={item.id}
              style={[
                styles.translationItem,
                item.id === activeTranslationId && styles.translationItemActive,
                item.isPartial && styles.translationItemPartial,
              ]}
            >
              <TouchableOpacity
                style={styles.translationInfo}
                onPress={() => onSelect(item)}
              >
                <View style={styles.translationHeader}>
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
                  <Text style={styles.translationConfig}>
                    {item.configName}
                  </Text>
                </View>
                <Text style={styles.translationDate}>
                  {formatDate(item.createdAt)}
                </Text>
                {item.isPartial && (
                  <View style={styles.partialProgressContainer}>
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
                      {item.completedBatches}/{item.totalBatches || "?"} (
                      {progressPercent}%)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {item.isPartial && onResume && (
                <TouchableOpacity
                  style={styles.resumeBtn}
                  onPress={() => onResume(item)}
                >
                  <MaterialCommunityIcons
                    name="play-circle-outline"
                    size={18}
                    color={colors.success}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => onDelete(item)}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={18}
                  color={colors.error}
                />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default SavedTranslationsList;
