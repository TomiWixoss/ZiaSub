import React, { useCallback } from "react";
import { View, TouchableOpacity, TextInput, Switch } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles } from "@hooks/useThemedStyles";
import { formatDuration } from "@utils/videoUtils";
import { createTranslateStyles } from "./translateStyles";
import PresetPromptPicker from "./PresetPromptPicker";
import type { PresetPromptType } from "@constants/defaults";

// Helper: parse time string to seconds
// Supports: "5" (5 min), "5:30" (5m30s), "1:05:30" (1h5m30s)
const parseTimeToSeconds = (timeStr: string): number => {
  if (!timeStr) return 0;
  // Remove non-numeric except ":"
  const cleaned = timeStr.replace(/[^\d:]/g, "");
  const parts = cleaned.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 1) return parts[0] * 60; // Just minutes
  if (parts.length === 2) return parts[0] * 60 + parts[1]; // m:ss
  return parts[0] * 3600 + parts[1] * 60 + parts[2]; // h:mm:ss
};

// Helper: format seconds to time string
// Under 1 hour: "m:ss", 1 hour+: "h:mm:ss"
const formatSecondsToTime = (seconds: number): string => {
  if (seconds < 0) seconds = 0;
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

// Auto-format time input as user types
// "5" -> "5" (typing minutes)
// "530" -> "5:30" (auto add colon)
// "10530" -> "1:05:30" (with hours)
const formatTimeInput = (input: string): string => {
  // Only keep digits
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";

  const len = digits.length;

  // 1-2 digits: just minutes (e.g., "5" or "12")
  if (len <= 2) return digits;

  // 3-4 digits: m:ss or mm:ss (e.g., "530" -> "5:30", "1230" -> "12:30")
  if (len <= 4) {
    const secs = digits.slice(-2);
    const mins = digits.slice(0, -2);
    return `${mins}:${secs}`;
  }

  // 5-6 digits: h:mm:ss or hh:mm:ss (e.g., "10530" -> "1:05:30")
  const secs = digits.slice(-2);
  const mins = digits.slice(-4, -2);
  const hours = digits.slice(0, -4);
  return `${hours}:${mins}:${secs}`;
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

  const handleTextChange = useCallback(
    (text: string) => {
      const formatted = formatTimeInput(text);
      onChange(formatted);
    },
    [onChange]
  );

  // Format on blur to ensure valid time
  const handleBlur = useCallback(() => {
    if (!value) return;
    let seconds = parseTimeToSeconds(value);
    if (maxSeconds !== undefined && seconds > maxSeconds) {
      seconds = maxSeconds;
    }
    onChange(formatSecondsToTime(seconds));
  }, [value, onChange, maxSeconds]);

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
        onChangeText={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        maxLength={8}
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
  // Preset prompt support
  currentPresetId?: PresetPromptType;
  onSelectPreset?: (prompt: string, presetId: PresetPromptType) => void;
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
  currentPresetId,
  onSelectPreset,
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
          {onSelectPreset && (
            <PresetPromptPicker
              onSelectPreset={onSelectPreset}
              currentPresetId={currentPresetId}
            />
          )}
        </View>
      )}
    </>
  );
};

export default AdvancedOptions;
