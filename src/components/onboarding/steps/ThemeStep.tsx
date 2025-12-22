import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, ThemeMode } from "@src/contexts";
import Button3D from "@components/common/Button3D";
import { Ionicons } from "@expo/vector-icons";

interface StepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const themeOptions: {
  mode: ThemeMode;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { mode: "system", icon: "phone-portrait-outline" },
  { mode: "light", icon: "sunny-outline" },
  { mode: "dark", icon: "moon-outline" },
];

export const ThemeStep: React.FC<StepProps> = ({ onNext, onPrevious }) => {
  const { t } = useTranslation();
  const { colors, themeMode, setThemeMode } = useTheme();

  const handleThemeSelect = async (mode: ThemeMode) => {
    await setThemeMode(mode);
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
          <Ionicons
            name="color-palette-outline"
            size={64}
            color={colors.primary}
          />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {t("onboarding.theme.title")}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t("onboarding.theme.subtitle")}
        </Text>

        <View style={styles.options}>
          {themeOptions.map((option) => (
            <Pressable
              key={option.mode}
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor:
                    themeMode === option.mode ? colors.primary : colors.border,
                  borderWidth: themeMode === option.mode ? 2 : 1,
                },
              ]}
              onPress={() => handleThemeSelect(option.mode)}
            >
              <Ionicons
                name={option.icon}
                size={24}
                color={
                  themeMode === option.mode
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.optionText,
                  {
                    color:
                      themeMode === option.mode ? colors.primary : colors.text,
                    fontWeight: themeMode === option.mode ? "600" : "400",
                  },
                ]}
              >
                {t(`settings.theme.${option.mode}`)}
              </Text>
              {themeMode === option.mode && (
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
