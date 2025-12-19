import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";
import type { SavedTranslation } from "@src/types";
import { translateStyles as styles } from "./translateStyles";

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
  if (translations.length === 0) return null;

  return (
    <View style={styles.translationsSection}>
      <Text style={styles.sectionTitle}>Đã dịch</Text>
      <View style={styles.translationsList}>
        {translations.map((t) => (
          <View
            key={t.id}
            style={[
              styles.translationItem,
              t.id === activeTranslationId && styles.translationItemActive,
            ]}
          >
            <TouchableOpacity
              style={styles.translationInfo}
              onPress={() => onSelect(t)}
            >
              <View style={styles.translationHeader}>
                <MaterialCommunityIcons
                  name={
                    t.id === activeTranslationId
                      ? "check-circle"
                      : "file-document-outline"
                  }
                  size={16}
                  color={
                    t.id === activeTranslationId
                      ? COLORS.success
                      : COLORS.textMuted
                  }
                />
                <Text style={styles.translationConfig}>{t.configName}</Text>
              </View>
              <Text style={styles.translationDate}>
                {formatDate(t.createdAt)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => onDelete(t)}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={18}
                color={COLORS.error}
              />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

export default SavedTranslationsList;
