import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { COLORS } from "@constants/colors";
import type { BatchSettings } from "@src/types";
import { saveBatchSettings } from "@utils/storage";

interface BatchSectionProps {
  batchSettings: BatchSettings;
  onBatchChange: (settings: BatchSettings) => void;
}

const BatchSection: React.FC<BatchSectionProps> = ({
  batchSettings,
  onBatchChange,
}) => {
  const { t } = useTranslation();
  const handleBatchDurationChange = (value: number) => {
    const newSettings = { ...batchSettings, maxVideoDuration: value };
    onBatchChange(newSettings);
    saveBatchSettings(newSettings);
  };

  const handleConcurrentChange = (value: number) => {
    const newSettings = { ...batchSettings, maxConcurrentBatches: value };
    onBatchChange(newSettings);
    saveBatchSettings(newSettings);
  };

  const handleOffsetChange = (value: number) => {
    const newSettings = { ...batchSettings, batchOffset: value };
    onBatchChange(newSettings);
    saveBatchSettings(newSettings);
  };

  const handlePresubDurationChange = (value: number) => {
    const newSettings = { ...batchSettings, presubDuration: value };
    onBatchChange(newSettings);
    saveBatchSettings(newSettings);
  };

  return (
    <>
      <Text style={styles.sectionTitle}>{t("settings.batch.title")}</Text>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          {t("settings.batch.batchDuration", {
            minutes: Math.floor(batchSettings.maxVideoDuration / 60),
          })}
        </Text>
        <Text style={styles.settingHint}>
          {t("settings.batch.batchDurationHint")}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={300}
          maximumValue={1800}
          step={60}
          value={batchSettings.maxVideoDuration}
          onValueChange={handleBatchDurationChange}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          {t("settings.batch.concurrent", {
            count: batchSettings.maxConcurrentBatches,
          })}
        </Text>
        <Text style={styles.settingHint}>
          {t("settings.batch.concurrentHint")}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={batchSettings.maxConcurrentBatches}
          onValueChange={handleConcurrentChange}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          {t("settings.batch.offset", {
            minutes: Math.floor((batchSettings.batchOffset ?? 60) / 60),
            seconds: (batchSettings.batchOffset ?? 60) % 60,
          })}
        </Text>
        <Text style={styles.settingHint}>{t("settings.batch.offsetHint")}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={300}
          step={30}
          value={batchSettings.batchOffset ?? 60}
          onValueChange={handleOffsetChange}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          {t("settings.batch.presubDuration", {
            minutes: Math.floor((batchSettings.presubDuration ?? 120) / 60),
            seconds: (batchSettings.presubDuration ?? 120) % 60,
          })}
        </Text>
        <Text style={styles.settingHint}>
          {t("settings.batch.presubDurationHint")}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={60}
          maximumValue={300}
          step={30}
          value={batchSettings.presubDuration ?? 120}
          onValueChange={handlePresubDurationChange}
          minimumTrackTintColor={COLORS.warning}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.warning}
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
});

export default BatchSection;
