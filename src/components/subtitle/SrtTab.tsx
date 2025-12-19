import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput as RNTextInput,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { readAsStringAsync } from "expo-file-system/legacy";
import { COLORS } from "@constants/colors";
import Button3D from "../Button3D";

interface SrtTabProps {
  srtContent: string;
  setSrtContent: (text: string) => void;
  onLoadSubtitles: () => void;
}

export const SrtTab: React.FC<SrtTabProps> = ({
  srtContent,
  setSrtContent,
  onLoadSubtitles,
}) => {
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
        const content = await readAsStringAsync(asset.uri);
        setSrtContent(content);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể đọc file này.");
    }
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.buttonRow}>
        <Button3D
          onPress={handlePickFile}
          icon="file-document-outline"
          title="File"
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

      <Button3D onPress={onLoadSubtitles} title="Áp dụng" variant="primary" />
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: { flex: 1 },
  buttonRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  rowButton: { flex: 1 },
  inputContainer: { flex: 1, marginBottom: 16, position: "relative" },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearButton: { position: "absolute", top: 12, right: 12, padding: 4 },
});
