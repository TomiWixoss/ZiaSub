import React from "react";
import { View, StyleSheet, Switch } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { COLORS } from "@constants/colors";
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
      <Text style={styles.sectionTitle}>{t("settings.tts.title")}</Text>

      <View style={styles.ttsToggleRow}>
        <View style={styles.ttsToggleInfo}>
          <MaterialCommunityIcons
            name="account-voice"
            size={20}
            color={ttsSettings.enabled ? COLORS.success : COLORS.textMuted}
          />
          <View>
            <Text style={styles.settingLabel}>{t("settings.tts.enabled")}</Text>
            <Text style={styles.settingHint}>
              {t("settings.tts.enabledHint")}
            </Text>
          </View>
        </View>
        <Switch
          value={ttsSettings.enabled}
          onValueChange={handleTTSEnabledChange}
          trackColor={{ false: COLORS.border, true: COLORS.success }}
          thumbColor={COLORS.text}
        />
      </View>

      {ttsSettings.enabled && (
        <>
          <View style={styles.ttsToggleRow}>
            <View style={styles.ttsToggleInfo}>
              <MaterialCommunityIcons
                name="speedometer"
                size={20}
                color={ttsSettings.autoRate ? COLORS.success : COLORS.textMuted}
              />
              <View>
                <Text style={styles.settingLabel}>
                  {t("settings.tts.autoRate")}
                </Text>
                <Text style={styles.settingHint}>
                  {t("settings.tts.autoRateHint")}
                </Text>
              </View>
            </View>
            <Switch
              value={ttsSettings.autoRate ?? true}
              onValueChange={handleAutoRateChange}
              trackColor={{ false: COLORS.border, true: COLORS.success }}
              thumbColor={COLORS.text}
            />
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>
              {t("settings.tts.baseRate", {
                rate: ttsSettings.rate.toFixed(1),
              })}
            </Text>
            <Text style={styles.settingHint}>
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
              minimumTrackTintColor={COLORS.success}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.success}
            />
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>
              {t("settings.tts.pitch", { pitch: ttsSettings.pitch.toFixed(1) })}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={2.0}
              step={0.1}
              value={ttsSettings.pitch}
              onValueChange={handleTTSPitchChange}
              minimumTrackTintColor={COLORS.success}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.success}
            />
          </View>

          <View style={styles.ttsToggleRow}>
            <View style={styles.ttsToggleInfo}>
              <MaterialCommunityIcons
                name="volume-low"
                size={20}
                color={
                  ttsSettings.duckVideo ? COLORS.success : COLORS.textMuted
                }
              />
              <View>
                <Text style={styles.settingLabel}>
                  {t("settings.tts.duckVideo")}
                </Text>
                <Text style={styles.settingHint}>
                  {t("settings.tts.duckVideoHint")}
                </Text>
              </View>
            </View>
            <Switch
              value={ttsSettings.duckVideo ?? true}
              onValueChange={handleDuckVideoChange}
              trackColor={{ false: COLORS.border, true: COLORS.success }}
              thumbColor={COLORS.text}
            />
          </View>

          {ttsSettings.duckVideo && (
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>
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
                minimumTrackTintColor={COLORS.success}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.success}
              />
            </View>
          )}
        </>
      )}
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
  settingGroup: { marginBottom: 16 },
  settingLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  settingHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  slider: { width: "100%", height: 40 },
  ttsToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ttsToggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
});

export default TTSSection;
