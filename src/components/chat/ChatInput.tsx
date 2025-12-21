import React from "react";
import { View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { VideoTimeRange } from "@src/types";

interface ChatInputProps {
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isLoading: boolean;
  videoUrl?: string;
  videoTitle?: string;
  attachVideo: boolean;
  onToggleVideo: () => void;
  configName: string;
  onOpenConfig: () => void;
  onStop?: () => void;
  disabled?: boolean;
  videoTimeRange?: VideoTimeRange | null;
  onOpenTimeRange?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  onChangeText,
  onSend,
  isLoading,
  videoUrl,
  videoTitle,
  attachVideo,
  onToggleVideo,
  configName,
  onOpenConfig,
  onStop,
  disabled,
  videoTimeRange,
  onOpenTimeRange,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(chatInputThemedStyles);

  // Format time range for display
  const formatTimeRange = (range: VideoTimeRange) => {
    const formatTime = (seconds: number) => {
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
    return `${formatTime(range.startTime)} - ${formatTime(range.endTime)}`;
  };

  return (
    <View style={styles.inputArea}>
      <View style={themedStyles.inputBox}>
        {attachVideo && videoUrl && (
          <View style={themedStyles.attachmentBar}>
            <MaterialCommunityIcons
              name="youtube"
              size={16}
              color={colors.error}
            />
            <Text style={themedStyles.attachmentText} numberOfLines={1}>
              {videoTitle || t("chat.video")}
            </Text>
            {videoTimeRange && (
              <TouchableOpacity
                style={themedStyles.timeRangeBadge}
                onPress={onOpenTimeRange}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={12}
                  color={colors.primary}
                />
                <Text style={themedStyles.timeRangeText}>
                  {formatTimeRange(videoTimeRange)}
                </Text>
              </TouchableOpacity>
            )}
            {!videoTimeRange && (
              <TouchableOpacity
                style={themedStyles.timeRangeBtn}
                onPress={onOpenTimeRange}
              >
                <MaterialCommunityIcons
                  name="clock-plus-outline"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={themedStyles.attachmentCancelBtn}
              onPress={onToggleVideo}
            >
              <Text style={themedStyles.attachmentCancelText}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <TextInput
          style={[themedStyles.input, disabled && styles.inputDisabled]}
          value={inputText}
          onChangeText={onChangeText}
          placeholder={
            disabled
              ? t("chat.inputPlaceholderDisabled")
              : t("chat.inputPlaceholder")
          }
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={4000}
          editable={!disabled}
        />
        <View style={styles.inputBottomRow}>
          {videoUrl && !attachVideo && (
            <TouchableOpacity style={styles.videoBtn} onPress={onToggleVideo}>
              <MaterialCommunityIcons
                name="youtube"
                size={20}
                color={colors.error}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={themedStyles.modelSelector}
            onPress={onOpenConfig}
          >
            <Text style={themedStyles.modelText} numberOfLines={1}>
              {configName}
            </Text>
          </TouchableOpacity>
          <View style={styles.inputSpacer} />
          {isLoading ? (
            <TouchableOpacity style={themedStyles.stopBtn} onPress={onStop}>
              <MaterialCommunityIcons name="stop" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                themedStyles.sendBtn,
                (!inputText.trim() || disabled) && themedStyles.sendBtnDisabled,
              ]}
              onPress={onSend}
              disabled={!inputText.trim() || disabled}
            >
              <MaterialCommunityIcons
                name="arrow-up"
                size={20}
                color={
                  inputText.trim() && !disabled ? "#FFFFFF" : colors.textMuted
                }
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputArea: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  inputDisabled: { opacity: 0.5 },
  inputBottomRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  videoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  inputSpacer: { flex: 1 },
});

const chatInputThemedStyles = createThemedStyles((colors) => ({
  inputBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  attachmentBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  attachmentText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  attachmentCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  attachmentCancelText: { color: colors.textMuted, fontSize: 13 },
  timeRangeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.primaryLight || colors.surface,
    borderRadius: 12,
  },
  timeRangeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "500",
  },
  timeRangeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  input: {
    color: colors.text,
    fontSize: 16,
    minHeight: 24,
    maxHeight: 120,
    padding: 0,
    marginBottom: 8,
  },
  modelSelector: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 120,
  },
  modelText: { color: colors.text, fontSize: 13, fontWeight: "500" },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: colors.surfaceElevated },
  stopBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center",
  },
}));

export default ChatInput;
