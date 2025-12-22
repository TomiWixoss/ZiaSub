import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme, ThemeMode } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";

const ThemeSection: React.FC = () => {
  const { t } = useTranslation();
  const { colors, themeMode, setThemeMode } = useTheme();
  const themedStyles = useThemedStyles(themeThemedStyles);

  const themes: { mode: ThemeMode; labelKey: string; icon: string }[] = [
    { mode: "system", labelKey: "settings.theme.system", icon: "cellphone" },
    {
      mode: "light",
      labelKey: "settings.theme.light",
      icon: "white-balance-sunny",
    },
    {
      mode: "dark",
      labelKey: "settings.theme.dark",
      icon: "moon-waning-crescent",
    },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name="palette"
          size={20}
          color={colors.primary}
        />
        <Text style={themedStyles.sectionTitle}>
          {t("settings.theme.title")}
        </Text>
      </View>
      <View style={themedStyles.themeList}>
        {themes.map((theme, index) => (
          <Pressable
            key={theme.mode}
            style={[
              themedStyles.themeItem,
              themeMode === theme.mode && themedStyles.themeItemActive,
              index === themes.length - 1 && { borderBottomWidth: 0 },
            ]}
            onPress={() => setThemeMode(theme.mode)}
          >
            <View style={styles.themeItemLeft}>
              <MaterialCommunityIcons
                name={theme.icon as any}
                size={20}
                color={
                  themeMode === theme.mode ? colors.primary : colors.textMuted
                }
              />
              <Text
                style={[
                  themedStyles.themeName,
                  themeMode === theme.mode && themedStyles.themeNameActive,
                ]}
              >
                {t(theme.labelKey)}
              </Text>
            </View>
            {themeMode === theme.mode && (
              <MaterialCommunityIcons
                name="check"
                size={20}
                color={colors.primary}
              />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  themeItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
});

const themeThemedStyles = createThemedStyles((colors) => ({
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "600" },
  themeList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  themeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  themeItemActive: { backgroundColor: `${colors.primary}15` },
  themeName: { color: colors.text, fontSize: 15 },
  themeNameActive: { color: colors.primary, fontWeight: "600" },
}));

export default ThemeSection;
