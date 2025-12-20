import React, { useCallback } from "react";
import { View, TouchableOpacity, TextInput, Switch } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles } from "@hooks/useThemedStyles";
import { formatDuration } from "@utils/videoUtils";
import { createTranslateStyles } from "./translateStyles";

// Helper: parse time string "m:ss" to seconds
const parseTimeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

// Helper: format seconds to "m:ss"
const formatSecondsToTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxSeconds?: number;
  colors: any;
  styles: any;
}

const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  placeholder,
  maxSeconds,
  colors,
  styles,
}) => {
  const adjustTime = useCallback(
    (delta: number) => {
      const currentSeconds = parseTimeToSeconds(value || "0:00");
      let newSeconds = currentSeconds + delta;
      if (newSeconds < 0) newSeconds = 0;
      if (maxSeconds !== undefined && newSeconds > maxSeconds) {
        newSeconds = maxSeconds;
      }
      onChange(formatSecondsToTime(newSeconds));
    },
    [value, onChange, maxSeconds]
  );

  return (
    <View style={styles.timeInputWrapper}>
      <TouchableOpacity
        style={styles.timeAdjustBtn}
        onPress={() => adjustTime(-10)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="minus" size={18} color={colors.text} />
      </TouchableOpacity>
      <TextInput
        style={styles.timeInputField}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
      />
      <TouchableOpacity
        style={styles.timeAdjustBtn}
        onPress={() => adjustTime(10)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="plus" size={18} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
};

interface AdvancedOptionsProps {
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  streamingMode: boolean;
  onStreamingModeChange: (value: boolean) => void;
  presubMode: boolean;
  onPresubModeChange: (value: boolean) => void;
  useCustomRange: boolean;
  onUseCustomRangeChange: (value: boolean) => void;
  rangeStartStr: string;
  onRangeStartChange: (value: string) => void;
  rangeEndStr: string;
  onRangeEndChange: (value: string) => void;
  videoDuration?: number;
}

const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  showAdvanced,
  onToggleAdvanced,
  streamingMode,
  onStreamingModeChange,
  presubMode,
  onPresubModeChange,
  useCustomRange,
  onUseCustomRangeChange,
  rangeStartStr,
  onRangeStartChange,
  rangeEndStr,
  onRangeEndChange,
  videoDuration,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(() => createTranslateStyles(colors));

  return (
    <>
      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={onToggleAdvanced}
      >
        <MaterialCommunityIcons
          name="tune-variant"
          size={18}
          color={colors.textMuted}
        />
        <Text style={styles.advancedToggleText}>
          {t("subtitleModal.translate.advancedOptions")}
        </Text>
        <MaterialCommunityIcons
          name={showAdvanced ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textMuted}
        />
      </TouchableOpacity>
      {showAdvanced && (
        <View style={styles.advancedPanel}>
          <View style={styles.advancedRow}>
            <View style={styles.advancedRowLeft}>
              <MaterialCommunityIcons
                name="play-speed"
                size={18}
                color={colors.primary}
              />
              <View style={styles.advancedRowInfo}>
                <Text style={styles.advancedRowTitle}>
                  {t("subtitleModal.translate.streamingMode")}
                </Text>
                <Text style={styles.advancedRowDesc}>
                  {t("subtitleModal.translate.streamingModeHint")}
                </Text>
              </View>
            </View>
            <Switch
              value={streamingMode}
              onValueChange={onStreamingModeChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={streamingMode ? "#FFFFFF" : colors.surfaceElevated}
            />
          </View>
          <View style={styles.advancedRow}>
            <View style={styles.advancedRowLeft}>
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={18}
                color={colors.warning}
              />
              <View style={styles.advancedRowInfo}>
                <Text style={styles.advancedRowTitle}>
                  {t("subtitleModal.translate.presubMode")}
                </Text>
                <Text style={styles.advancedRowDesc}>
                  {t("subtitleModal.translate.presubModeHint")}
                </Text>
              </View>
            </View>
            <Switch
              value={presubMode}
              onValueChange={onPresubModeChange}
              trackColor={{ false: colors.border, true: colors.warning }}
              thumbColor={presubMode ? "#FFFFFF" : colors.surfaceElevated}
            />
          </View>
          <View
            style={[
              styles.advancedRow,
              { borderBottomWidth: useCustomRange ? 1 : 0 },
            ]}
          >
            <View style={styles.advancedRowLeft}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={18}
                color={colors.primary}
              />
              <View style={styles.advancedRowInfo}>
                <Text style={styles.advancedRowTitle}>
                  {t("subtitleModal.translate.customRange")}
                </Text>
                <Text style={styles.advancedRowDesc}>
                  {t("subtitleModal.translate.customRangeHint")}
                </Text>
              </View>
            </View>
            <Switch
              value={useCustomRange}
              onValueChange={onUseCustomRangeChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={useCustomRange ? "#FFFFFF" : colors.surfaceElevated}
            />
          </View>
          {useCustomRange && (
            <View style={styles.rangeInputContainer}>
              <View style={styles.rangeInputGroup}>
                <Text style={styles.rangeLabel}>
                  {t("subtitleModal.translate.rangeFrom")}
                </Text>
                <TimeInput
                  value={rangeStartStr}
                  onChange={onRangeStartChange}
                  placeholder="0:00"
                  maxSeconds={videoDuration}
                  colors={colors}
                  styles={styles}
                />
              </View>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color={colors.textMuted}
              />
              <View style={styles.rangeInputGroup}>
                <Text style={styles.rangeLabel}>
                  {t("subtitleModal.translate.rangeTo")}
                </Text>
                <TimeInput
                  value={rangeEndStr}
                  onChange={onRangeEndChange}
                  placeholder={
                    videoDuration
                      ? formatDuration(videoDuration)
                      : t("subtitleModal.translate.rangeEnd")
                  }
                  maxSeconds={videoDuration}
                  colors={colors}
                  styles={styles}
                />
              </View>
            </View>
          )}
          {videoDuration && (
            <Text style={styles.durationHint}>
              {t("subtitleModal.translate.videoDuration", {
                duration: formatDuration(videoDuration),
              })}
            </Text>
          )}
        </View>
      )}
    </>
  );
};

export default AdvancedOptions;
