import React, { useEffect, useCallback } from "react";
import {
  View,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableOpacity,
  Alert,
  TextInput as RNTextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { readAsStringAsync } from "expo-file-system/legacy";
import { COLORS } from "@constants/colors";
import Button3D from "./Button3D";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Simple SRT format detection
const isSRTFormat = (text: string): boolean => {
  if (!text || text.length < 10) return false;
  // Check for SRT patterns: number, timestamp with --> , text
  const srtPattern = /^\d+\s*\n\d{2}:\d{2}:\d{2}[,.:]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.:]\d{3}/m;
  return srtPattern.test(text.trim());
};

interface SubtitleInputModalProps {
  visible: boolean;
  onClose: () => void;
  srtContent: string;
  setSrtContent: (text: string) => void;
  onLoadSubtitles: () => void;
}

const SubtitleInputModal: React.FC<SubtitleInputModalProps> = ({
  visible,
  onClose,
  srtContent,
  setSrtContent,
  onLoadSubtitles,
}) => {
  const insets = useSafeAreaInsets();

  // Auto-detect SRT from clipboard when modal opens
  const checkClipboard = useCallback(async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent && isSRTFormat(clipboardContent) && !srtContent) {
        Alert.alert(
          "Phát hiện SRT",
          "Clipboard có nội dung SRT. Bạn có muốn dán vào không?",
          [
            { text: "Không", style: "cancel" },
            { text: "Dán", onPress: () => setSrtContent(clipboardContent) },
          ]
        );
      }
    } catch (error) {
      // Clipboard access denied or empty
    }
  }, [srtContent, setSrtContent]);

  useEffect(() => {
    if (visible) {
      checkClipboard();
    }
  }, [visible, checkClipboard]);

  // Manual paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        setSrtContent(clipboardContent);
      } else {
        Alert.alert("Thông báo", "Clipboard trống.");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể truy cập clipboard.");
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (asset) {
        if (
          !asset.name.toLowerCase().endsWith(".srt") &&
          !asset.name.toLowerCase().endsWith(".txt")
        ) {
          Alert.alert(
            "Lưu ý",
            "File này có thể không phải là file phụ đề .srt hợp lệ."
          );
        }

        const content = await readAsStringAsync(asset.uri);
        setSrtContent(content);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      Alert.alert("Lỗi", "Không thể đọc file này.");
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <View
            style={[
              styles.bottomSheet,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.dragHandle} />
              <Text style={styles.title}>Phụ đề</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <Button3D
                onPress={handlePickFile}
                icon="file-document-outline"
                title="Chọn file"
                variant="outline"
                style={styles.rowButton}
              />
              <Button3D
                onPress={handlePasteFromClipboard}
                icon="clipboard-text-outline"
                title="Dán"
                variant="outline"
                style={styles.rowButton}
              />
            </View>

            <View style={styles.inputContainer}>
              <RNTextInput
                placeholder="Dán nội dung SRT vào đây..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                value={srtContent}
                onChangeText={setSrtContent}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {srtContent.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSrtContent("")}
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={18}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>

            <Button3D
              onPress={onLoadSubtitles}
              title="Áp dụng"
              variant="primary"
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: COLORS.overlay,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardView: {
    width: "100%",
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: "100%",
    height: SCREEN_HEIGHT * 0.65,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  sheetHeader: {
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    backgroundColor: COLORS.borderLight,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: 12,
    padding: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  rowButton: {
    flex: 1,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 16,
    position: "relative",
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 16,
    paddingTop: 16,
    color: COLORS.text,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
  },
});

export default SubtitleInputModal;
