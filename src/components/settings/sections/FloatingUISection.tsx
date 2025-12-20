import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { FloatingUISettings } from "@src/types";
import Button3D from "@components/common/Button3D";

interface FloatingUISectionProps {
  floatingUISettings: FloatingUISettings;
  onFloatingUIChange: (settings: FloatingUISettings) => void;
}

const FloatingUISection: React.FC<FloatingUISectionProps> = ({
  floatingUISettings,
  onFloatingUIChange,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(sectionThemedStyles);

  const updateSetting = <K extends keyof FloatingUISettings>(
    key: K,
    value: FloatingUISettings[K]
  ) => {
    onFloatingUIChange({ ...floatingUISettings, [key]: value });
  };

  return (
    <View style={styles.container}>
      {/* Bottom Offset - Normal */}
      <View style={styles.sliderSection}>
        <Text style={themedStyles.label}>
          {t("settings.floatingUI.bottomOffset", {
            value: floatingUISettings.bottomOffset,
          })}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={20}
          maximumValue={200}
          step={5}
          value={floatingUISettings.bottomOffset}
          onValueChange={(v) => updateSetting("bottomOffset", v)}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
        <Text style={themedStyles.hint}>
          {t("settings.floatingUI.bottomOffsetHint")}
        </Text>
      </View>

      {/* Bottom Offset - Video */}
      <View style={styles.sliderSection}>
        <Text style={themedStyles.label}>
          {t("settings.floatingUI.bottomOffsetVideo", {
            value: floatingUISettings.bottomOffsetVideo,
          })}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={10}
          maximumValue={150}
          step={5}
          value={floatingUISettings.bottomOffsetVideo}
          onValueChange={(v) => updateSetting("bottomOffsetVideo", v)}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
        <Text style={themedStyles.hint}>
          {t("settings.floatingUI.bottomOffsetVideoHint")}
        </Text>
      </View>

      {/* Side Offset */}
      <View style={styles.sliderSection}>
        <Text style={themedStyles.label}>
          {t("settings.floatingUI.sideOffset", {
            value: floatingUISettings.sideOffset,
          })}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={8}
          maximumValue={50}
          step={2}
          value={floatingUISettings.sideOffset}
          onValueChange={(v) => updateSetting("sideOffset", v)}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
      </View>

      {/* Position */}
      <View style={styles.buttonSection}>
        <Text style={themedStyles.label}>
          {t("settings.floatingUI.position")}
        </Text>
        <View style={styles.buttonRow}>
          <Button3D
            title={t("settings.floatingUI.positionLeft")}
            onPress={() => updateSetting("position", "left")}
            variant={
              floatingUISettings.position === "left" ? "primary" : "secondary"
            }
            style={styles.optionButton}
          />
          <Button3D
            title={t("settings.floatingUI.positionRight")}
            onPress={() => updateSetting("position", "right")}
            variant={
              floatingUISettings.position === "right" ? "primary" : "secondary"
            }
            style={styles.optionButton}
          />
        </View>
      </View>

      {/* Layout */}
      <View style={styles.buttonSection}>
        <Text style={themedStyles.label}>
          {t("settings.floatingUI.layout")}
        </Text>
        <View style={styles.buttonRow}>
          <Button3D
            title={t("settings.floatingUI.layoutVertical")}
            onPress={() => updateSetting("layout", "vertical")}
            variant={
              floatingUISettings.layout === "vertical" ? "primary" : "secondary"
            }
            style={styles.optionButton}
          />
          <Button3D
            title={t("settings.floatingUI.layoutHorizontal")}
            onPress={() => updateSetting("layout", "horizontal")}
            variant={
              floatingUISettings.layout === "horizontal"
                ? "primary"
                : "secondary"
            }
            style={styles.optionButton}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 16 },
  sliderSection: { gap: 8 },
  slider: { width: "100%", height: 40 },
  buttonSection: { gap: 8 },
  buttonRow: { flexDirection: "row", gap: 8 },
  optionButton: { flex: 1 },
});

const sectionThemedStyles = createThemedStyles((colors) => ({
  label: { fontSize: 14, color: colors.text, fontWeight: "500" },
  hint: { fontSize: 12, color: colors.textMuted },
}));

export default FloatingUISection;
