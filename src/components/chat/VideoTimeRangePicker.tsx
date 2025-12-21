import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  PanResponder,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

const SLIDER_WIDTH = 280;
const THUMB_SIZE = 28;
const TRACK_HEIGHT = 8;

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
  const [activeThumb, setActiveThumb] = useState<"start" | "end" | null>(null);

  // Use refs to track current values for pan responders
  const startValueRef = useRef(startValue);
  const endValueRef = useRef(endValue);
  const videoDurationRef = useRef(videoDuration);

  useEffect(() => {
    startValueRef.current = startValue;
  }, [startValue]);

  useEffect(() => {
    endValueRef.current = endValue;
  }, [endValue]);

  useEffect(() => {
    videoDurationRef.current = videoDuration;
  }, [videoDuration]);

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

  // Convert value to position
  const valueToPosition = (value: number) => {
    return (value / videoDurationRef.current) * SLIDER_WIDTH;
  };

  // Create pan responders with refs
  const startPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setActiveThumb("start"),
      onPanResponderMove: (_, gestureState) => {
        const currentPos =
          (startValueRef.current / videoDurationRef.current) * SLIDER_WIDTH;
        const newPos = currentPos + gestureState.dx;
        const newValue = Math.max(
          0,
          Math.min(
            videoDurationRef.current,
            Math.round((newPos / SLIDER_WIDTH) * videoDurationRef.current)
          )
        );
        if (newValue < endValueRef.current - 5) {
          setStartValue(newValue);
        }
      },
      onPanResponderRelease: () => setActiveThumb(null),
    })
  ).current;

  const endPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setActiveThumb("end"),
      onPanResponderMove: (_, gestureState) => {
        const currentPos =
          (endValueRef.current / videoDurationRef.current) * SLIDER_WIDTH;
        const newPos = currentPos + gestureState.dx;
        const newValue = Math.max(
          0,
          Math.min(
            videoDurationRef.current,
            Math.round((newPos / SLIDER_WIDTH) * videoDurationRef.current)
          )
        );
        if (newValue > startValueRef.current + 5) {
          setEndValue(newValue);
        }
      },
      onPanResponderRelease: () => setActiveThumb(null),
    })
  ).current;

  const handleConfirm = () => {
    if (startValue === 0 && endValue === videoDuration) {
      onConfirm(null);
    } else {
      onConfirm({ startTime: startValue, endTime: endValue });
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

  const startPos = valueToPosition(startValue);
  const endPos = valueToPosition(endValue);
  const selectedWidth = endPos - startPos;

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

          {/* Dual slider */}
          <View style={styles.sliderSection}>
            <View style={styles.sliderContainer}>
              {/* Track background */}
              <View
                style={[styles.track, { backgroundColor: colors.border }]}
              />

              {/* Selected range */}
              <View
                style={[
                  styles.selectedTrack,
                  {
                    backgroundColor: colors.primary,
                    left: startPos,
                    width: selectedWidth,
                  },
                ]}
              />

              {/* Start thumb */}
              <View
                {...startPanResponder.panHandlers}
                style={[
                  styles.thumb,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.primary,
                    left: startPos - THUMB_SIZE / 2,
                  },
                  activeThumb === "start" && {
                    transform: [{ scale: 1.15 }],
                    borderColor: colors.accent,
                  },
                ]}
              >
                <View
                  style={[
                    styles.thumbInner,
                    { backgroundColor: colors.primary },
                  ]}
                />
              </View>

              {/* End thumb */}
              <View
                {...endPanResponder.panHandlers}
                style={[
                  styles.thumb,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.primary,
                    left: endPos - THUMB_SIZE / 2,
                  },
                  activeThumb === "end" && {
                    transform: [{ scale: 1.15 }],
                    borderColor: colors.accent,
                  },
                ]}
              >
                <View
                  style={[
                    styles.thumbInner,
                    { backgroundColor: colors.primary },
                  ]}
                />
              </View>
            </View>

            {/* Slider labels */}
            <View style={styles.sliderLabels}>
              <Text style={[styles.sliderLabel, { color: colors.textMuted }]}>
                0:00
              </Text>
              <Text style={[styles.sliderLabel, { color: colors.textMuted }]}>
                {formatTime(videoDuration)}
              </Text>
            </View>
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
    marginVertical: 16,
  },
  sliderContainer: {
    width: SLIDER_WIDTH,
    height: 50,
    alignSelf: "center",
    justifyContent: "center",
  },
  track: {
    position: "absolute",
    width: SLIDER_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  selectedTrack: {
    position: "absolute",
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  thumbInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 11,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
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
