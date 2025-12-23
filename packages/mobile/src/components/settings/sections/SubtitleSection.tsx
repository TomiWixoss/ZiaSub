import React from "react";
import {
  View,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  Switch,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { SubtitleSettings } from "@src/types";
import { saveSubtitleSettings } from "@utils/storage";

interface SubtitleSectionProps {
  subtitleSettings: SubtitleSettings;
  onSubtitleChange: (settings: SubtitleSettings) => void;
}

const SubtitleSection: React.FC<SubtitleSectionProps> = ({
  subtitleSettings,
  onSubtitleChange,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(subtitleThemedStyles);

  const handleFontSizeChange = (value: number) => {
    const newSettings = { ...subtitleSettings, fontSize: Math.round(value) };
    onSubtitleChange(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const toggleBold = () => {
    const newSettings = {
      ...subtitleSettings,
      fontWeight: subtitleSettings.fontWeight === "bold" ? "normal" : "bold",
    } as SubtitleSettings;
    onSubtitleChange(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const toggleItalic = () => {
    const newSettings = {
      ...subtitleSettings,
      fontStyle: subtitleSettings.fontStyle === "italic" ? "normal" : "italic",
    } as SubtitleSettings;
    onSubtitleChange(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const handlePositionChange = (
    key: "portraitBottom" | "landscapeBottom" | "desktopBottom",
    value: number
  ) => {
    const newSettings = { ...subtitleSettings, [key]: value };
    onSubtitleChange(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const toggleDesktopBackground = () => {
    const newSettings = {
      ...subtitleSettings,
      desktopShowBackground: !subtitleSettings.desktopShowBackground,
    };
    onSubtitleChange(newSettings);
    saveSubtitleSettings(newSettings);
  };

  return (
    <>
      <View style={styles.previewContainer}>
        <RNText
          style={[
            styles.previewText,
            {
              fontSize: subtitleSettings.fontSize,
              fontWeight:
                subtitleSettings.fontWeight === "bold" ? "700" : "400",
              fontStyle: subtitleSettings.fontStyle,
            },
          ]}
        >
          {t("settings.subtitle.preview")}
        </RNText>
      </View>
      <View style={styles.settingRow}>
        <Text style={themedStyles.settingLabel}>
          {t("settings.subtitle.fontSizeValue", {
            size: subtitleSettings.fontSize,
          })}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={10}
          maximumValue={28}
          value={subtitleSettings.fontSize}
          onValueChange={handleFontSizeChange}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
      </View>
      <View style={styles.styleButtonsRow}>
        <TouchableOpacity
          onPress={toggleBold}
          style={[
            themedStyles.styleButton,
            subtitleSettings.fontWeight === "bold" &&
              themedStyles.styleButtonActive,
          ]}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="format-bold"
            size={20}
            color={
              subtitleSettings.fontWeight === "bold"
                ? colors.primary
                : colors.textMuted
            }
          />
          <Text
            style={[
              themedStyles.styleButtonText,
              subtitleSettings.fontWeight === "bold" &&
                themedStyles.styleButtonTextActive,
            ]}
          >
            {t("settings.subtitle.bold")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleItalic}
          style={[
            themedStyles.styleButton,
            subtitleSettings.fontStyle === "italic" &&
              themedStyles.styleButtonActive,
          ]}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="format-italic"
            size={20}
            color={
              subtitleSettings.fontStyle === "italic"
                ? colors.primary
                : colors.textMuted
            }
          />
          <Text
            style={[
              themedStyles.styleButtonText,
              subtitleSettings.fontStyle === "italic" &&
                themedStyles.styleButtonTextActive,
            ]}
          >
            {t("settings.subtitle.italic")}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.settingGroup}>
        <Text style={themedStyles.settingLabel}>
          {t("settings.subtitle.positionPortrait", {
            value: subtitleSettings.portraitBottom ?? 100,
          })}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={500}
          step={10}
          value={subtitleSettings.portraitBottom ?? 100}
          onValueChange={(value) =>
            handlePositionChange("portraitBottom", value)
          }
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
      </View>
      <View style={styles.settingGroup}>
        <Text style={themedStyles.settingLabel}>
          {t("settings.subtitle.positionLandscape", {
            value: subtitleSettings.landscapeBottom ?? 8,
          })}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={60}
          step={2}
          value={subtitleSettings.landscapeBottom ?? 8}
          onValueChange={(value) =>
            handlePositionChange("landscapeBottom", value)
          }
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
      </View>

      {/* Desktop mode settings */}
      <View style={[styles.settingGroup, themedStyles.desktopSection]}>
        <View style={styles.desktopHeader}>
          <MaterialCommunityIcons
            name="monitor"
            size={18}
            color={colors.primary}
          />
          <Text style={themedStyles.desktopTitle}>
            {t("settings.subtitle.desktopMode")}
          </Text>
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={themedStyles.settingLabel}>
              {t("settings.subtitle.showBackground")}
            </Text>
            <Text style={themedStyles.switchHint}>
              {t("settings.subtitle.showBackgroundHint")}
            </Text>
          </View>
          <Switch
            value={subtitleSettings.desktopShowBackground ?? true}
            onValueChange={toggleDesktopBackground}
            trackColor={{ false: colors.border, true: `${colors.primary}50` }}
            thumbColor={
              subtitleSettings.desktopShowBackground
                ? colors.primary
                : colors.textMuted
            }
          />
        </View>
        <View style={styles.desktopPositionRow}>
          <Text style={themedStyles.settingLabel}>
            {t("settings.subtitle.desktopPosition", {
              value: subtitleSettings.desktopBottom ?? 60,
            })}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={200}
            step={5}
            value={subtitleSettings.desktopBottom ?? 60}
            onValueChange={(value) =>
              handlePositionChange("desktopBottom", value)
            }
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  settingRow: { marginBottom: 16 },
  settingGroup: { marginBottom: 16 },
  slider: { width: "100%", height: 40 },
  styleButtonsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  previewContainer: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    minHeight: 60,
    justifyContent: "center",
  },
  previewText: {
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  desktopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  desktopPositionRow: {
    marginTop: 16,
  },
});

const subtitleThemedStyles = createThemedStyles((colors) => ({
  settingLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  styleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  styleButtonActive: {
    backgroundColor: `${colors.primary}15`,
    borderColor: colors.primary,
  },
  styleButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  styleButtonTextActive: {
    color: colors.primary,
  },
  desktopSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  desktopTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  switchHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
}));

export default SubtitleSection;
