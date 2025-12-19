import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import Slider from "@react-native-community/slider";
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
      <Text style={styles.sectionTitle}>Dịch video</Text>

      <View style={styles.settingGroup}>
        <Text style={styles.settingLabel}>
          Độ dài mỗi phần: {Math.floor(batchSettings.maxVideoDuration / 60)}{" "}
          phút
        </Text>
        <Text style={styles.settingHint}>
          Video dài hơn sẽ được chia nhỏ để dịch
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
          Dịch cùng lúc: {batchSettings.maxConcurrentBatches} phần
        </Text>
        <Text style={styles.settingHint}>
          Dịch nhiều phần cùng lúc (nhanh hơn nhưng tốn key)
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
          Dung sai thêm: {Math.floor((batchSettings.batchOffset ?? 60) / 60)}{" "}
          phút {(batchSettings.batchOffset ?? 60) % 60}s
        </Text>
        <Text style={styles.settingHint}>
          Video dài hơn một chút vẫn dịch 1 lần (VD: 10p + 1p dung sai = video
          11p không bị chia nhỏ)
        </Text>
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
          Phần đầu (xem nhanh):{" "}
          {Math.floor((batchSettings.presubDuration ?? 120) / 60)} phút{" "}
          {(batchSettings.presubDuration ?? 120) % 60}s
        </Text>
        <Text style={styles.settingHint}>
          Độ dài phần đầu khi bật chế độ Xem nhanh để có phụ đề sớm hơn
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
