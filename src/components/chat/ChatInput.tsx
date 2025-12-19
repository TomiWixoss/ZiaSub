import React from "react";
import { View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "@constants/colors";

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
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.inputArea}>
      <View style={styles.inputBox}>
        {/* Video attachment indicator */}
        {attachVideo && videoUrl && (
          <View style={styles.attachmentBar}>
            <MaterialCommunityIcons
              name="youtube"
              size={16}
              color={COLORS.error}
            />
            <Text style={styles.attachmentText} numberOfLines={1}>
              {videoTitle || t("chat.video")}
            </Text>
            <TouchableOpacity
              style={styles.attachmentCancelBtn}
              onPress={onToggleVideo}
            >
              <Text style={styles.attachmentCancelText}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TextArea */}
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          value={inputText}
          onChangeText={onChangeText}
          placeholder={
            disabled
              ? t("chat.inputPlaceholderDisabled")
              : t("chat.inputPlaceholder")
          }
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={4000}
          editable={!disabled}
        />

        {/* Bottom row */}
        <View style={styles.inputBottomRow}>
          {videoUrl && !attachVideo && (
            <TouchableOpacity style={styles.videoBtn} onPress={onToggleVideo}>
              <MaterialCommunityIcons
                name="youtube"
                size={20}
                color={COLORS.error}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.modelSelector} onPress={onOpenConfig}>
            <Text style={styles.modelText} numberOfLines={1}>
              {configName}
            </Text>
          </TouchableOpacity>

          <View style={styles.inputSpacer} />

          {isLoading ? (
            <TouchableOpacity style={styles.stopBtn} onPress={onStop}>
              <MaterialCommunityIcons
                name="stop"
                size={18}
                color={COLORS.text}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || disabled) && styles.sendBtnDisabled,
              ]}
              onPress={onSend}
              disabled={!inputText.trim() || disabled}
            >
              <MaterialCommunityIcons
                name="arrow-up"
                size={20}
                color={
                  inputText.trim() && !disabled ? COLORS.text : COLORS.textMuted
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
  inputArea: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  inputBox: {
    backgroundColor: COLORS.surfaceLight,
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
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  attachmentText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
  },
  attachmentCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
  },
  attachmentCancelText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  input: {
    color: COLORS.text,
    fontSize: 16,
    minHeight: 24,
    maxHeight: 120,
    padding: 0,
    marginBottom: 8,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  inputBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  videoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  modelSelector: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 120,
  },
  modelText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "500",
  },
  inputSpacer: {
    flex: 1,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.surfaceElevated,
  },
  stopBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ChatInput;
