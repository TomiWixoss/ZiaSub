import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import { useLanguage } from "@hooks/useLanguage";

const LanguageSection: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(languageThemedStyles);
  const { currentLanguage, setLanguage, supportedLanguages } = useLanguage();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name="translate"
          size={20}
          color={colors.primary}
        />
        <Text style={themedStyles.sectionTitle}>{t("settings.language")}</Text>
      </View>
      <View style={themedStyles.languageList}>
        {supportedLanguages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              themedStyles.languageItem,
              currentLanguage === lang.code && themedStyles.languageItemActive,
            ]}
            onPress={() => setLanguage(lang.code)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                themedStyles.languageName,
                currentLanguage === lang.code &&
                  themedStyles.languageNameActive,
              ]}
            >
              {lang.nativeName}
            </Text>
            {currentLanguage === lang.code && (
              <MaterialCommunityIcons
                name="check"
                size={20}
                color={colors.primary}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 0 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
});

const languageThemedStyles = createThemedStyles((colors) => ({
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "600" },
  languageList: {
    backgroundColor: colors.surface,
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
    borderBottomColor: colors.border,
  },
  languageItemActive: { backgroundColor: `${colors.primary}15` },
  languageName: { color: colors.text, fontSize: 15 },
  languageNameActive: { color: colors.primary, fontWeight: "600" },
}));

export default LanguageSection;
