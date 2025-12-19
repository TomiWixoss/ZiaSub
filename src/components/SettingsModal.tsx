import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  TextInput as RNTextInput,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { COLORS } from "@constants/colors";
import {
  SubtitleSettings,
  GeminiConfig,
  getSubtitleSettings,
  saveSubtitleSettings,
  getGeminiConfigs,
  saveGeminiConfigs,
  createDefaultGeminiConfig,
  DEFAULT_SUBTITLE_SETTINGS,
} from "@utils/storage";
import Button3D from "./Button3D";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

type TabType = "subtitle" | "gemini";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  subtitleSettings: SubtitleSettings;
  onSubtitleSettingsChange: (settings: SubtitleSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  subtitleSettings,
  onSubtitleSettingsChange,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<TabType>("subtitle");
  const [geminiConfigs, setGeminiConfigs] = useState<GeminiConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<GeminiConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
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
    }
  }, [visible]);

  const loadData = async () => {
    const configs = await getGeminiConfigs();
    setGeminiConfigs(configs);
  };

  const handleClose = () => {
    setEditingConfig(null);
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

  // Subtitle handlers
  const handleFontSizeChange = (value: number) => {
    const newSettings = { ...subtitleSettings, fontSize: Math.round(value) };
    onSubtitleSettingsChange(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const toggleBold = () => {
    const newSettings = {
      ...subtitleSettings,
      fontWeight: subtitleSettings.fontWeight === "bold" ? "normal" : "bold",
    } as SubtitleSettings;
    onSubtitleSettingsChange(newSettings);
    saveSubtitleSettings(newSettings);
  };

  const toggleItalic = () => {
    const newSettings = {
      ...subtitleSettings,
      fontStyle: subtitleSettings.fontStyle === "italic" ? "normal" : "italic",
    } as SubtitleSettings;
    onSubtitleSettingsChange(newSettings);
    saveSubtitleSettings(newSettings);
  };

  // Gemini handlers
  const handleAddConfig = () => {
    const newConfig = createDefaultGeminiConfig();
    newConfig.name = `Cấu hình ${geminiConfigs.length + 1}`;
    setEditingConfig(newConfig);
  };

  const handleEditConfig = (config: GeminiConfig) => {
    setEditingConfig({ ...config });
  };

  const handleDeleteConfig = (id: string) => {
    if (geminiConfigs.length <= 1) {
      Alert.alert("Lỗi", "Phải có ít nhất một cấu hình.");
      return;
    }
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa cấu hình này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const newConfigs = geminiConfigs.filter((c) => c.id !== id);
          setGeminiConfigs(newConfigs);
          await saveGeminiConfigs(newConfigs);
        },
      },
    ]);
  };

  const handleSaveConfig = async () => {
    if (!editingConfig) return;

    const exists = geminiConfigs.find((c) => c.id === editingConfig.id);
    let newConfigs: GeminiConfig[];

    if (exists) {
      newConfigs = geminiConfigs.map((c) =>
        c.id === editingConfig.id ? editingConfig : c
      );
    } else {
      newConfigs = [...geminiConfigs, editingConfig];
    }

    setGeminiConfigs(newConfigs);
    await saveGeminiConfigs(newConfigs);
    setEditingConfig(null);
  };

  const renderSubtitleTab = () => (
    <View style={styles.tabContent}>
      {/* Preview */}
      <View style={styles.previewContainer}>
        <RNText
          style={[
            styles.previewText,
            {
              fontSize: subtitleSettings.fontSize,
              fontWeight:
                subtitleSettings.fontWeight === "bold" ? "700" : "400",
              fontStyle: subtitleSettings.fontStyle,
            },
          ]}
        >
          Xem trước phụ đề
        </RNText>
      </View>

      {/* Font Size */}
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          Cỡ chữ: {subtitleSettings.fontSize}px
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={10}
          maximumValue={28}
          value={subtitleSettings.fontSize}
          onValueChange={handleFontSizeChange}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>

      {/* Font Style Buttons */}
      <View style={styles.styleButtonsRow}>
        <Button3D
          onPress={toggleBold}
          icon="format-bold"
          title="Đậm"
          variant="secondary"
          active={subtitleSettings.fontWeight === "bold"}
          style={styles.styleButton}
        />
        <Button3D
          onPress={toggleItalic}
          icon="format-italic"
          title="Nghiêng"
          variant="secondary"
          active={subtitleSettings.fontStyle === "italic"}
          style={styles.styleButton}
        />
      </View>
    </View>
  );

  const renderGeminiList = () => (
    <View style={styles.tabContent}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {geminiConfigs.map((config) => (
          <TouchableOpacity
            key={config.id}
            style={styles.configItem}
            onPress={() => handleEditConfig(config)}
          >
            <View style={styles.configInfo}>
              <Text style={styles.configName}>{config.name}</Text>
              <Text style={styles.configModel}>{config.model}</Text>
            </View>
            <View style={styles.configActions}>
              <TouchableOpacity
                style={styles.configActionBtn}
                onPress={() => handleDeleteConfig(config.id)}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={COLORS.textMuted}
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Button3D
        onPress={handleAddConfig}
        icon="plus"
        title="Thêm cấu hình"
        variant="outline"
        style={{ marginTop: 16 }}
      />
    </View>
  );

  const renderGeminiEdit = () => {
    if (!editingConfig) return null;

    return (
      <ScrollView
        style={styles.tabContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>Tên cấu hình</Text>
          <RNTextInput
            style={styles.input}
            value={editingConfig.name}
            onChangeText={(text) =>
              setEditingConfig({ ...editingConfig, name: text })
            }
            placeholder="Tên cấu hình..."
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {/* API Key */}
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>API Key</Text>
          <View style={styles.apiKeyContainer}>
            <RNTextInput
              style={styles.apiKeyInput}
              value={editingConfig.apiKey}
              onChangeText={(text) =>
                setEditingConfig({ ...editingConfig, apiKey: text })
              }
              placeholder="Nhập Gemini API Key..."
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowApiKey(!showApiKey)}
            >
              <MaterialCommunityIcons
                name={showApiKey ? "eye-off" : "eye"}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Model */}
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>Model</Text>
          <RNTextInput
            style={styles.input}
            value={editingConfig.model}
            onChangeText={(text) =>
              setEditingConfig({ ...editingConfig, model: text })
            }
            placeholder="gemini-3-flash-preview"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
          />
        </View>

        {/* Temperature */}
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>
            Temperature: {editingConfig.temperature.toFixed(1)}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={2}
            step={0.1}
            value={editingConfig.temperature}
            onValueChange={(value) =>
              setEditingConfig({ ...editingConfig, temperature: value })
            }
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.primary}
          />
        </View>

        {/* System Prompt */}
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>System Prompt</Text>
          <RNTextInput
            style={styles.promptInput}
            value={editingConfig.systemPrompt}
            onChangeText={(text) =>
              setEditingConfig({ ...editingConfig, systemPrompt: text })
            }
            placeholder="Nhập system prompt..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.buttonRow}>
          <Button3D
            onPress={() => setEditingConfig(null)}
            title="Hủy"
            variant="outline"
            style={styles.rowButton}
          />
          <Button3D
            onPress={handleSaveConfig}
            title="Lưu"
            variant="primary"
            style={styles.rowButton}
          />
        </View>
      </ScrollView>
    );
  };

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
            <Text style={styles.title}>
              {editingConfig ? "Chỉnh sửa cấu hình" : "Cài đặt"}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {!editingConfig && (
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "subtitle" && styles.tabActive,
                ]}
                onPress={() => setActiveTab("subtitle")}
              >
                <MaterialCommunityIcons
                  name="subtitles"
                  size={18}
                  color={
                    activeTab === "subtitle" ? COLORS.primary : COLORS.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "subtitle" && styles.tabTextActive,
                  ]}
                >
                  Phụ đề
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === "gemini" && styles.tabActive]}
                onPress={() => setActiveTab("gemini")}
              >
                <MaterialCommunityIcons
                  name="robot"
                  size={18}
                  color={
                    activeTab === "gemini" ? COLORS.primary : COLORS.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "gemini" && styles.tabTextActive,
                  ]}
                >
                  Gemini AI
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {editingConfig
            ? renderGeminiEdit()
            : activeTab === "subtitle"
            ? renderSubtitleTab()
            : renderGeminiList()}
        </Animated.View>
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
  previewContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    minHeight: 80,
    justifyContent: "center",
  },
  previewText: {
    color: COLORS.text,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  settingRow: {
    marginBottom: 20,
  },
  settingGroup: {
    marginBottom: 16,
  },
  settingLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  styleButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  styleButton: {
    flex: 1,
  },
  configItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  configInfo: {
    flex: 1,
  },
  configName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  configModel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  configActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  configActionBtn: {
    padding: 4,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  apiKeyContainer: {
    position: "relative",
  },
  apiKeyInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    paddingRight: 44,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 14,
  },
  promptInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 120,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  rowButton: {
    flex: 1,
  },
});

export default SettingsModal;
