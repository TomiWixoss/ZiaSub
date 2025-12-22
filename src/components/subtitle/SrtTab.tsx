import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  Platform,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { alert } from "../common/CustomAlert";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { readAsStringAsync } from "expo-file-system/legacy";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import Button3D from "../common/Button3D";

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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(srtTabThemedStyles);

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) setSrtContent(clipboardContent);
      else alert(t("common.notice"), t("subtitleModal.srt.pasteNothing"));
    } catch (error) {
      alert(t("common.error"), t("subtitleModal.srt.pasteError"));
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
      alert(t("common.error"), t("subtitleModal.srt.fileError"));
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      bottomOffset={20}
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
          onPress={handlePasteFromClipboard}
          icon="clipboard-text-outline"
          title={t("common.paste")}
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
      <Button3D
        onPress={onLoadSubtitles}
        title={t("subtitleModal.srt.load")}
        variant="primary"
      />
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
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
