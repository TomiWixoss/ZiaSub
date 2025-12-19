import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "@constants/colors";
import { useLanguage } from "@hooks/useLanguage";

const LanguageSection: React.FC = () => {
  const { t } = useTranslation();
  const { currentLanguage, setLanguage, supportedLanguages } = useLanguage();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name="translate"
          size={20}
          color={COLORS.primary}
        />
        <Text style={styles.sectionTitle}>{t("settings.language")}</Text>
      </View>

      <View style={styles.languageList}>
        {supportedLanguages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageItem,
              currentLanguage === lang.code && styles.languageItemActive,
            ]}
            onPress={() => setLanguage(lang.code)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.languageName,
                currentLanguage === lang.code && styles.languageNameActive,
              ]}
            >
              {lang.nativeName}
            </Text>
            {currentLanguage === lang.code && (
              <MaterialCommunityIcons
                name="check"
                size={20}
                color={COLORS.primary}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  languageList: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  languageItemActive: {
    backgroundColor: "rgba(155, 126, 217, 0.1)",
  },
  languageName: {
    color: COLORS.text,
    fontSize: 15,
  },
  languageNameActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});

export default LanguageSection;
