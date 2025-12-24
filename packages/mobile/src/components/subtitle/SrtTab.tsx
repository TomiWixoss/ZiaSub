import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  Platform,
  ScrollView,
} from "react-native";
import { alert } from "../common/CustomAlert";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import Button3D from "../common/Button3D";

interface SrtTabProps {
  srtContent: string;
  setSrtContent: (text: string) => void;
  onLoadSubtitles: () => void;
  videoTitle?: string;
  configName?: string;
  presetName?: string;
}

export const SrtTab: React.FC<SrtTabProps> = ({
  srtContent,
  setSrtContent,
  onLoadSubtitles,
  videoTitle,
  configName,
  presetName,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(srtTabThemedStyles);

  const sanitizeFileName = (name: string): string => {
    // Remove invalid characters for file names
    return name.replace(/[<>:"/\\|?*]/g, "_").trim();
  };

  const handleExportSrt = async () => {
    if (!srtContent.trim()) {
      alert(t("common.notice"), t("subtitleModal.srt.noContent"));
      return;
    }

    try {
      // Build file name: videoTitle + configName + presetName.srt
      const parts: string[] = [];
      if (videoTitle) parts.push(sanitizeFileName(videoTitle));
      if (configName) parts.push(sanitizeFileName(configName));
      if (presetName) parts.push(sanitizeFileName(presetName));

      const fileName =
        parts.length > 0 ? `${parts.join("_")}.srt` : "subtitle.srt";

      // Write to temp file
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, srtContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share/export the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/x-subrip",
          dialogTitle: t("subtitleModal.srt.export"),
        });
      } else {
        alert(t("common.error"), t("subtitleModal.srt.exportError"));
      }
    } catch (error) {
      alert(t("common.error"), t("subtitleModal.srt.exportError"));
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
        const content = await FileSystem.readAsStringAsync(asset.uri);
        setSrtContent(content);
      }
    } catch (error) {
      alert(t("common.error"), t("subtitleModal.srt.fileError"));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.tabContent}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.buttonRow}>
          <Button3D
            onPress={handlePickFile}
            icon="file-document-outline"
            title={t("common.file")}
            variant="outline"
            style={styles.rowButton}
          />
          <Button3D
            onPress={handleExportSrt}
            icon="export"
            title={t("subtitleModal.srt.export")}
            variant="outline"
            style={styles.rowButton}
          />
        </View>
        <View style={styles.inputContainer}>
          <RNTextInput
            placeholder={t("subtitleModal.srt.placeholder")}
            placeholderTextColor={colors.textMuted}
            multiline
            value={srtContent}
            onChangeText={setSrtContent}
            style={themedStyles.input}
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
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <View style={styles.buttonWrapper}>
        <Button3D
          onPress={onLoadSubtitles}
          title={t("subtitleModal.srt.load")}
          variant="primary"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContent: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  buttonRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  rowButton: { flex: 1 },
  inputContainer: {
    flex: 1,
    marginBottom: 16,
    position: "relative",
    minHeight: 200,
  },
  clearButton: { position: "absolute", top: 12, right: 12, padding: 4 },
  buttonWrapper: { paddingTop: 12 },
});

const srtTabThemedStyles = createThemedStyles((colors) => ({
  input: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: colors.border,
  },
}));
