import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import Button3D from "../common/Button3D";
import type { VideoTimeRange } from "@src/types";

interface VideoTimeRangePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (range: VideoTimeRange | null) => void;
  currentRange?: VideoTimeRange | null;
  videoDuration?: number;
}

// Format seconds to mm:ss or hh:mm:ss
const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const VideoTimeRangePicker: React.FC<VideoTimeRangePickerProps> = ({
  visible,
  onClose,
  onConfirm,
  currentRange,
  videoDuration = 600,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [startValue, setStartValue] = useState(0);
  const [endValue, setEndValue] = useState(videoDuration);

  useEffect(() => {
    if (visible) {
      if (currentRange) {
        setStartValue(currentRange.startTime);
        setEndValue(currentRange.endTime);
      } else {
        setStartValue(0);
        setEndValue(videoDuration);
      }
    }
  }, [visible, currentRange, videoDuration]);

  const handleStartChange = (value: number) => {
    // Đảm bảo start không vượt quá end - 5 giây
    const maxStart = Math.max(0, endValue - 5);
    setStartValue(Math.min(value, maxStart));
  };

  const handleEndChange = (value: number) => {
    // Đảm bảo end không nhỏ hơn start + 5 giây
    const minEnd = Math.min(videoDuration, startValue + 5);
    setEndValue(Math.max(value, minEnd));
  };

  const handleConfirm = () => {
    if (startValue === 0 && endValue === videoDuration) {
      onConfirm(null);
    } else {
      onConfirm({
        startTime: Math.round(startValue),
        endTime: Math.round(endValue),
      });
    }
    onClose();
  };

  const handleClear = () => {
    onConfirm(null);
    onClose();
  };

  const handleReset = () => {
    setStartValue(0);
    setEndValue(videoDuration);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={28}
                color={colors.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>
                {t("chat.selectTimeRange")}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t("chat.timeRangeHint")}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Time display */}
          <View
            style={[styles.timeBox, { backgroundColor: colors.surfaceLight }]}
          >
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                {t("chat.startTime")}
              </Text>
              <Text style={[styles.timeValue, { color: colors.text }]}>
                {formatTime(startValue)}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color={colors.textMuted}
            />
            <View style={styles.timeItem}>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                {t("chat.endTime")}
              </Text>
              <Text style={[styles.timeValue, { color: colors.text }]}>
                {formatTime(endValue)}
              </Text>
            </View>
          </View>

          {/* Start Slider */}
          <View style={styles.sliderSection}>
            <View style={styles.sliderRow}>
              <Text
                style={[styles.sliderTitle, { color: colors.textSecondary }]}
              >
                {t("chat.startTime")}
              </Text>
              <Text style={[styles.sliderValue, { color: colors.primary }]}>
                {formatTime(startValue)}
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={videoDuration}
              value={startValue}
              onValueChange={handleStartChange}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
              step={1}
            />
          </View>

          {/* End Slider */}
          <View style={styles.sliderSection}>
            <View style={styles.sliderRow}>
              <Text
                style={[styles.sliderTitle, { color: colors.textSecondary }]}
              >
                {t("chat.endTime")}
              </Text>
              <Text style={[styles.sliderValue, { color: colors.primary }]}>
                {formatTime(endValue)}
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={videoDuration}
              value={endValue}
              onValueChange={handleEndChange}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
              step={1}
            />
          </View>

          {/* Info row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                {t("chat.selectedDuration")}
              </Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>
                {formatTime(endValue - startValue)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleReset}
              style={[
                styles.resetBtn,
                { backgroundColor: colors.surfaceLight },
              ]}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={[styles.resetText, { color: colors.textSecondary }]}>
                {t("common.reset")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <View style={styles.buttonWrapper}>
              <Button3D
                title={t("chat.clearRange")}
                variant="outline"
                onPress={handleClear}
              />
            </View>
            <View style={styles.buttonWrapper}>
              <Button3D
                title={t("common.confirm")}
                icon="check"
                variant="primary"
                onPress={handleConfirm}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerIcon: {},
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  timeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    gap: 16,
  },
  timeItem: {
    alignItems: "center",
    minWidth: 80,
  },
  timeLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  sliderSection: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  sliderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sliderTitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetText: {
    fontSize: 13,
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  buttonWrapper: {
    flex: 1,
  },
});

export default VideoTimeRangePicker;
