import React from "react";
import { View, TouchableOpacity, TextInput, Switch } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "@constants/colors";
import { formatDuration } from "@utils/videoUtils";
import { translateStyles as styles } from "./translateStyles";

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
  return (
    <>
      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={onToggleAdvanced}
      >
        <MaterialCommunityIcons
          name="tune-variant"
          size={18}
          color={COLORS.textMuted}
        />
        <Text style={styles.advancedToggleText}>
          {t("subtitleModal.translate.advancedOptions")}
        </Text>
        <MaterialCommunityIcons
          name={showAdvanced ? "chevron-up" : "chevron-down"}
          size={18}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>

      {showAdvanced && (
        <View style={styles.advancedPanel}>
          {/* Streaming Mode */}
          <View style={styles.advancedRow}>
            <View style={styles.advancedRowLeft}>
              <MaterialCommunityIcons
                name="play-speed"
                size={18}
                color={COLORS.primary}
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
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.text}
            />
          </View>

          {/* Presub Mode */}
          <View style={styles.advancedRow}>
            <View style={styles.advancedRowLeft}>
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={18}
                color={COLORS.warning}
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
              trackColor={{ false: COLORS.border, true: COLORS.warning }}
              thumbColor={COLORS.text}
            />
          </View>

          {/* Custom Range */}
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
                color={COLORS.primary}
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
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.text}
            />
          </View>

          {/* Range Inputs */}
          {useCustomRange && (
            <View style={styles.rangeInputContainer}>
              <View style={styles.rangeInputGroup}>
                <Text style={styles.rangeLabel}>
                  {t("subtitleModal.translate.rangeFrom")}
                </Text>
                <TextInput
                  style={styles.rangeInput}
                  value={rangeStartStr}
                  onChangeText={onRangeStartChange}
                  placeholder="0:00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color={COLORS.textMuted}
              />
              <View style={styles.rangeInputGroup}>
                <Text style={styles.rangeLabel}>
                  {t("subtitleModal.translate.rangeTo")}
                </Text>
                <TextInput
                  style={styles.rangeInput}
                  value={rangeEndStr}
                  onChangeText={onRangeEndChange}
                  placeholder={
                    videoDuration
                      ? formatDuration(videoDuration)
                      : t("subtitleModal.translate.rangeEnd")
                  }
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numbers-and-punctuation"
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
