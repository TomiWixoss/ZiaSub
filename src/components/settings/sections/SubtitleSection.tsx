import React from "react";
import { View, StyleSheet, Text as RNText } from "react-native";
import { Text } from "react-native-paper";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import Button3D from "../../common/Button3D";
import { COLORS } from "@constants/colors";
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
    key: "portraitBottom" | "landscapeBottom",
    value: number
  ) => {
    const newSettings = { ...subtitleSettings, [key]: value };
    onSubtitleChange(newSettings);
    saveSubtitleSettings(newSettings);
  };

  return (
    <>
      <Text style={styles.sectionTitle}>{t("settings.subtitle.title")}</Text>

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
        <Text style={styles.settingLabel}>
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
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>

      <View style={[styles.styleButtonsRow, { marginBottom: 20 }]}>
        <Button3D
          onPress={toggleBold}
          icon="format-bold"
          title={t("settings.subtitle.bold")}
          variant="secondary"
          active={subtitleSettings.fontWeight === "bold"}
          style={styles.styleButton}
        />
        <Button3D
          onPress={toggleItalic}
          icon="format-italic"
          title={t("settings.subtitle.italic")}
          variant="secondary"
          active={subtitleSettings.fontStyle === "italic"}
          style={styles.styleButton}
        />
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
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
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
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
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 24,
    textTransform: "uppercase",
  },
  previewContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    minHeight: 60,
    justifyContent: "center",
  },
  previewText: {
    color: COLORS.text,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  settingRow: { marginBottom: 16 },
  settingGroup: { marginBottom: 16 },
  settingLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  slider: { width: "100%", height: 40 },
  styleButtonsRow: { flexDirection: "row", gap: 12 },
  styleButton: { flex: 1 },
});

export default SubtitleSection;
