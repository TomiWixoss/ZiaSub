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
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(() => createTranslateStyles(colors));

  if (translations.length === 0) return null;

  return (
    <View style={styles.translationsSection}>
      <Text style={styles.sectionTitle}>
        {t("subtitleModal.translate.savedTranslations")}
      </Text>
      <View style={styles.translationsList}>
        {translations.map((item) => (
          <View
            key={item.id}
            style={[
              styles.translationItem,
              item.id === activeTranslationId && styles.translationItemActive,
            ]}
          >
            <TouchableOpacity
              style={styles.translationInfo}
              onPress={() => onSelect(item)}
            >
              <View style={styles.translationHeader}>
                <MaterialCommunityIcons
                  name={
                    item.id === activeTranslationId
                      ? "check-circle"
                      : "file-document-outline"
                  }
                  size={16}
                  color={
                    item.id === activeTranslationId
                      ? colors.success
                      : colors.textMuted
                  }
                />
                <Text style={styles.translationConfig}>{item.configName}</Text>
              </View>
              <Text style={styles.translationDate}>
                {formatDate(item.createdAt)}
              </Text>
            </TouchableOpacity>
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
        ))}
      </View>
    </View>
  );
};

export default SavedTranslationsList;
