import React, { useEffect, useCallback, useRef, useState } from "react";
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
  Animated,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { readAsStringAsync } from "expo-file-system/legacy";
import { COLORS } from "@constants/colors";
import {
  GeminiConfig,
  getGeminiConfigs,
  getActiveGeminiConfig,
  saveActiveGeminiConfigId,
} from "@utils/storage";
import { translateVideoWithGemini } from "@services/geminiService";
import Button3D from "./Button3D";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

type TabType = "srt" | "translate";

const isSRTFormat = (text: string): boolean => {
  if (!text || text.length < 10) return false;
  const srtPattern =
    /^\d+\s*\n\d{2}:\d{2}:\d{2}[,.:]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.:]\d{3}/m;
  return srtPattern.test(text.trim());
};

interface SubtitleInputModalProps {
  visible: boolean;
  onClose: () => void;
  srtContent: string;
  setSrtContent: (text: string) => void;
  onLoadSubtitles: () => void;
  videoUrl?: string;
}

const SubtitleInputModal: React.FC<SubtitleInputModalProps> = ({
  visible,
  onClose,
  srtContent,
  setSrtContent,
  onLoadSubtitles,
  videoUrl,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<TabType>("srt");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateStatus, setTranslateStatus] = useState("");
  const [geminiConfigs, setGeminiConfigs] = useState<GeminiConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [showConfigPicker, setShowConfigPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      loadConfigs();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
      fadeAnim.setValue(0);
      setTranslateStatus("");
    }
  }, [visible]);

  const loadConfigs = async () => {
    const configs = await getGeminiConfigs();
    setGeminiConfigs(configs);
    const activeConfig = await getActiveGeminiConfig();
    if (activeConfig) {
      setSelectedConfigId(activeConfig.id);
    }
  };

  const handleClose = () => {
    if (isTranslating) {
      Alert.alert("Đang dịch", "Vui lòng đợi quá trình dịch hoàn tất.");
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

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
    } catch (error) {}
  }, [srtContent, setSrtContent]);

  useEffect(() => {
    if (visible && activeTab === "srt") {
      checkClipboard();
    }
  }, [visible, activeTab, checkClipboard]);

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

  const handleTranslate = async () => {
    const config = geminiConfigs.find((c) => c.id === selectedConfigId);
    if (!config) {
      Alert.alert("Lỗi", "Vui lòng chọn cấu hình Gemini.");
      return;
    }

    if (!config.apiKey) {
      Alert.alert("Lỗi", "Cấu hình này chưa có API Key. Vui lòng cài đặt.");
      return;
    }

    if (!videoUrl) {
      Alert.alert("Lỗi", "Không tìm thấy URL video.");
      return;
    }

    try {
      setIsTranslating(true);
      setTranslateStatus("Đang kết nối với Gemini AI...");
      await saveActiveGeminiConfigId(selectedConfigId);

      let hasStartedStreaming = false;

      const result = await translateVideoWithGemini(
        videoUrl,
        config,
        (text: string) => {
          if (!hasStartedStreaming) {
            hasStartedStreaming = true;
            setTranslateStatus("Đang nhận dữ liệu...");
          }
        }
      );

      // Set result to SRT content
      setSrtContent(result);
      setTranslateStatus("Hoàn tất!");
      setActiveTab("srt");

      Alert.alert(
        "Thành công",
        "Đã dịch xong! Kiểm tra tab Nhập SRT để xem kết quả."
      );
    } catch (error: any) {
      setTranslateStatus("");
      Alert.alert("Lỗi dịch", error.message || "Không thể dịch video.");
    } finally {
      setIsTranslating(false);
    }
  };

  const selectedConfig = geminiConfigs.find((c) => c.id === selectedConfigId);

  const renderSRTTab = () => (
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

  const renderTranslateTab = () => (
    <View style={styles.tabContent}>
      {/* Config Picker */}
      <TouchableOpacity
        style={styles.configPicker}
        onPress={() => setShowConfigPicker(!showConfigPicker)}
      >
        <View style={styles.configPickerLeft}>
          <MaterialCommunityIcons
            name="robot"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.configPickerText}>
            {selectedConfig?.name || "Chọn cấu hình"}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={showConfigPicker ? "chevron-up" : "chevron-down"}
          size={20}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>

      {showConfigPicker && (
        <View style={styles.configDropdown}>
          {geminiConfigs.map((config) => (
            <TouchableOpacity
              key={config.id}
              style={[
                styles.configOption,
                config.id === selectedConfigId && styles.configOptionActive,
              ]}
              onPress={() => {
                setSelectedConfigId(config.id);
                setShowConfigPicker(false);
              }}
            >
              <Text
                style={[
                  styles.configOptionText,
                  config.id === selectedConfigId &&
                    styles.configOptionTextActive,
                ]}
              >
                {config.name}
              </Text>
              {!config.apiKey && (
                <Text style={styles.configNoKey}>Chưa có API Key</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Video URL Info */}
      <View style={styles.videoInfo}>
        <MaterialCommunityIcons
          name="youtube"
          size={20}
          color={COLORS.textMuted}
        />
        <Text style={styles.videoUrlText} numberOfLines={1}>
          {videoUrl || "Chưa có video"}
        </Text>
      </View>

      {/* Status */}
      {isTranslating && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.statusText}>{translateStatus}</Text>
        </View>
      )}

      {/* Translate Button */}
      <View style={styles.translateButtonContainer}>
        <Button3D
          onPress={handleTranslate}
          icon="translate"
          title={isTranslating ? "Đang dịch..." : "Bắt đầu dịch"}
          variant="primary"
          disabled={isTranslating || !videoUrl}
        />
      </View>

      <Text style={styles.noteText}>
        Gemini AI sẽ phân tích video và tạo phụ đề SRT tự động.
        {"\n"}Kết quả sẽ được đưa vào tab "Nhập SRT".
      </Text>
    </View>
  );

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                paddingBottom: Math.max(insets.bottom, 20),
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.dragHandle} />
              <Text style={styles.title}>Phụ đề</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "srt" && styles.tabActive]}
                onPress={() => setActiveTab("srt")}
              >
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={18}
                  color={
                    activeTab === "srt" ? COLORS.primary : COLORS.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "srt" && styles.tabTextActive,
                  ]}
                >
                  Nhập SRT
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "translate" && styles.tabActive,
                ]}
                onPress={() => setActiveTab("translate")}
              >
                <MaterialCommunityIcons
                  name="translate"
                  size={18}
                  color={
                    activeTab === "translate"
                      ? COLORS.primary
                      : COLORS.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "translate" && styles.tabTextActive,
                  ]}
                >
                  Dịch tự động
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === "srt" ? renderSRTTab() : renderTranslateTab()}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  keyboardView: {
    width: "100%",
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: "100%",
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  sheetHeader: {
    alignItems: "center",
    marginBottom: 16,
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
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: 12,
    padding: 8,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.surfaceElevated,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  tabTextActive: {
    color: COLORS.text,
  },
  tabContent: {
    flex: 1,
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
  configPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  configPickerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  configPickerText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
  },
  configDropdown: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  configOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  configOptionActive: {
    backgroundColor: COLORS.surfaceElevated,
  },
  configOptionText: {
    color: COLORS.text,
    fontSize: 14,
  },
  configOptionTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  configNoKey: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  videoInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  videoUrlText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 12,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  statusText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  translateButtonContainer: {
    marginTop: "auto",
    marginBottom: 16,
  },
  noteText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});

export default SubtitleInputModal;
