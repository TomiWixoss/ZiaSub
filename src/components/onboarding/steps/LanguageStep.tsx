import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import Button3D from "@components/common/Button3D";
import { Ionicons } from "@expo/vector-icons";
import { supportedLanguages, changeLanguage } from "@i18n/index";

interface StepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const languageFlags: Record<string, string> = {
  vi: "🇻🇳",
  en: "🇺🇸",
};

export const LanguageStep: React.FC<StepProps> = ({ onNext, onPrevious }) => {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  const handleLanguageSelect = async (code: string) => {
    await changeLanguage(code);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.surfaceLight },
          ]}
        >
          <Ionicons name="language-outline" size={64} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {t("onboarding.language.title")}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t("onboarding.language.subtitle")}
        </Text>

        <View style={styles.options}>
          {supportedLanguages.map((lang) => (
            <Pressable
              key={lang.code}
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor:
                    i18n.language === lang.code
                      ? colors.primary
                      : colors.border,
                  borderWidth: i18n.language === lang.code ? 2 : 1,
                },
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
            >
              <Text style={styles.flag}>{languageFlags[lang.code]}</Text>
              <Text
                style={[
                  styles.optionText,
                  {
                    color:
                      i18n.language === lang.code
                        ? colors.primary
                        : colors.text,
                    fontWeight: i18n.language === lang.code ? "600" : "400",
                  },
                ]}
              >
                {lang.nativeName}
              </Text>
              {i18n.language === lang.code && (
                <View
                  style={[
                    styles.checkmark,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.backButton, { borderColor: colors.border }]}
          onPress={onPrevious}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <Button3D
          title={t("common.next")}
          onPress={onNext}
          style={styles.nextButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  options: {
    width: "100%",
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 12,
    position: "relative",
  },
  flag: {
    fontSize: 28,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 24,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButton: {
    flex: 1,
  },
});
