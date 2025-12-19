import React from "react";
import { View, StyleSheet, Switch } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { TTSSettings } from "@src/types";
import { saveTTSSettings } from "@utils/storage";

interface TTSSectionProps {
  ttsSettings: TTSSettings;
  onTTSChange: (settings: TTSSettings) => void;
}

const TTSSection: React.FC<TTSSectionProps> = ({
  ttsSettings,
  onTTSChange,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(ttsThemedStyles);

  const handleTTSEnabledChange = (value: boolean) => {
    const newSettings = { ...ttsSettings, enabled: value };
    onTTSChange(newSettings);
    saveTTSSettings(newSettings);
  };
  const handleTTSRateChange = (value: number) => {
    const newSettings = { ...ttsSettings, rate: Math.round(value * 10) / 10 };
    onTTSChange(newSettings);
    saveTTSSettings(newSettings);
  };
  const handleTTSPitchChange = (value: number) => {
    const newSettings = { ...ttsSettings, pitch: Math.round(value * 10) / 10 };
    onTTSChange(newSettings);
    saveTTSSettings(newSettings);
  };
  const handleAutoRateChange = (value: boolean) => {
    const newSettings = { ...ttsSettings, autoRate: value };
    onTTSChange(newSettings);
    saveTTSSettings(newSettings);
  };
  const handleDuckVideoChange = (value: boolean) => {
    const newSettings = { ...ttsSettings, duckVideo: value };
    onTTSChange(newSettings);
    saveTTSSettings(newSettings);
  };
  const handleDuckLevelChange = (value: number) => {
    const newSettings = {
      ...ttsSettings,
      duckLevel: Math.round(value * 100) / 100,
    };
    onTTSChange(newSettings);
    saveTTSSettings(newSettings);
  };

  return (
    <>
      <Text style={themedStyles.sectionTitle}>{t("settings.tts.title")}</Text>
      <View style={themedStyles.ttsToggleRow}>
        <View style={styles.ttsToggleInfo}>
          <MaterialCommunityIcons
            name="account-voice"
            size={20}
            color={ttsSettings.enabled ? colors.success : colors.textMuted}
          />
          <View>
            <Text style={themedStyles.settingLabel}>
              {t("settings.tts.enabled")}
            </Text>
            <Text style={themedStyles.settingHint}>
              {t("settings.tts.enabledHint")}
            </Text>
          </View>
        </View>
        <Switch
          value={ttsSettings.enabled}
          onValueChange={handleTTSEnabledChange}
          trackColor={{ false: colors.border, true: colors.success }}
          thumbColor={colors.text}
        />
      </View>
      {ttsSettings.enabled && (
        <>
          <View style={themedStyles.ttsToggleRow}>
            <View style={styles.ttsToggleInfo}>
              <MaterialCommunityIcons
                name="speedometer"
                size={20}
                color={ttsSettings.autoRate ? colors.success : colors.textMuted}
              />
              <View>
                <Text style={themedStyles.settingLabel}>
                  {t("settings.tts.autoRate")}
                </Text>
                <Text style={themedStyles.settingHint}>
                  {t("settings.tts.autoRateHint")}
                </Text>
              </View>
            </View>
            <Switch
              value={ttsSettings.autoRate ?? true}
              onValueChange={handleAutoRateChange}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={colors.text}
            />
          </View>
          <View style={styles.settingGroup}>
            <Text style={themedStyles.settingLabel}>
              {t("settings.tts.baseRate", {
                rate: ttsSettings.rate.toFixed(1),
              })}
            </Text>
            <Text style={themedStyles.settingHint}>
              {ttsSettings.autoRate
                ? t("settings.tts.baseRateHintAuto")
                : t("settings.tts.baseRateHintFixed")}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={2.0}
              step={0.1}
              value={ttsSettings.rate}
              onValueChange={handleTTSRateChange}
              minimumTrackTintColor={colors.success}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.success}
            />
          </View>
          <View style={styles.settingGroup}>
            <Text style={themedStyles.settingLabel}>
              {t("settings.tts.pitch", { pitch: ttsSettings.pitch.toFixed(1) })}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={2.0}
              step={0.1}
              value={ttsSettings.pitch}
              onValueChange={handleTTSPitchChange}
              minimumTrackTintColor={colors.success}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.success}
            />
          </View>
          <View style={themedStyles.ttsToggleRow}>
            <View style={styles.ttsToggleInfo}>
              <MaterialCommunityIcons
                name="volume-low"
                size={20}
                color={
                  ttsSettings.duckVideo ? colors.success : colors.textMuted
                }
              />
              <View>
                <Text style={themedStyles.settingLabel}>
                  {t("settings.tts.duckVideo")}
                </Text>
                <Text style={themedStyles.settingHint}>
                  {t("settings.tts.duckVideoHint")}
                </Text>
              </View>
            </View>
            <Switch
              value={ttsSettings.duckVideo ?? true}
              onValueChange={handleDuckVideoChange}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={colors.text}
            />
          </View>
          {ttsSettings.duckVideo && (
            <View style={styles.settingGroup}>
              <Text style={themedStyles.settingLabel}>
                {t("settings.tts.duckLevel", {
                  level: Math.round((ttsSettings.duckLevel ?? 0.2) * 100),
                })}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={0.5}
                step={0.05}
                value={ttsSettings.duckLevel ?? 0.2}
                onValueChange={handleDuckLevelChange}
                minimumTrackTintColor={colors.success}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.success}
              />
            </View>
          )}
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  settingGroup: { marginBottom: 16 },
  slider: { width: "100%", height: 40 },
  ttsToggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
});

const ttsThemedStyles = createThemedStyles((colors) => ({
  sectionTitle: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 24,
    textTransform: "uppercase",
  },
  settingLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  settingHint: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  ttsToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
}));

export default TTSSection;
