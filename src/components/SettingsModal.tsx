import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { alert, confirmDestructive } from "./CustomAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";
import {
  SubtitleSettings,
  BatchSettings,
  TTSSettings,
  GeminiConfig,
  getGeminiConfigs,
  saveGeminiConfigs,
  createDefaultGeminiConfig,
} from "@utils/storage";
import { GeneralTab, GeminiList, GeminiEdit } from "./settings";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

type TabType = "general" | "gemini";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  subtitleSettings: SubtitleSettings;
  onSubtitleSettingsChange: (settings: SubtitleSettings) => void;
  batchSettings: BatchSettings;
  onBatchSettingsChange: (settings: BatchSettings) => void;
  apiKeys: string[];
  onApiKeysChange: (keys: string[]) => void;
  ttsSettings: TTSSettings;
  onTTSSettingsChange: (settings: TTSSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  subtitleSettings,
  onSubtitleSettingsChange,
  batchSettings,
  onBatchSettingsChange,
  apiKeys,
  onApiKeysChange,
  ttsSettings,
  onTTSSettingsChange,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [geminiConfigs, setGeminiConfigs] = useState<GeminiConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<GeminiConfig | null>(null);

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

  const handleAddConfig = () => {
    const newConfig = createDefaultGeminiConfig();
    newConfig.name = `Kiểu dịch ${geminiConfigs.length + 1}`;
    setEditingConfig(newConfig);
  };

  const handleDeleteConfig = (id: string) => {
    if (geminiConfigs.length <= 1) {
      alert("Không xóa được", "Cần giữ lại ít nhất một kiểu dịch.");
      return;
    }
    confirmDestructive(
      "Xóa kiểu dịch",
      "Bạn muốn xóa kiểu dịch này?",
      async () => {
        const newConfigs = geminiConfigs.filter((c) => c.id !== id);
        setGeminiConfigs(newConfigs);
        await saveGeminiConfigs(newConfigs);
      }
    );
  };

  const handleSaveConfig = async () => {
    if (!editingConfig) return;
    const exists = geminiConfigs.find((c) => c.id === editingConfig.id);
    const newConfigs = exists
      ? geminiConfigs.map((c) =>
          c.id === editingConfig.id ? editingConfig : c
        )
      : [...geminiConfigs, editingConfig];
    setGeminiConfigs(newConfigs);
    await saveGeminiConfigs(newConfigs);
    setEditingConfig(null);
  };

  const renderContent = () => {
    if (editingConfig) {
      return (
        <GeminiEdit
          config={editingConfig}
          onChange={setEditingConfig}
          onSave={handleSaveConfig}
          onCancel={() => setEditingConfig(null)}
        />
      );
    }
    if (activeTab === "general") {
      return (
        <GeneralTab
          subtitleSettings={subtitleSettings}
          onSubtitleChange={onSubtitleSettingsChange}
          batchSettings={batchSettings}
          onBatchChange={onBatchSettingsChange}
          apiKeys={apiKeys}
          onApiKeysChange={onApiKeysChange}
          ttsSettings={ttsSettings}
          onTTSChange={onTTSSettingsChange}
        />
      );
    }
    return (
      <GeminiList
        configs={geminiConfigs}
        onEdit={(c) => setEditingConfig({ ...c })}
        onDelete={handleDeleteConfig}
        onAdd={handleAddConfig}
      />
    );
  };

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent
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
              {editingConfig ? "Chỉnh kiểu dịch" : "Cài đặt"}
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
                  activeTab === "general" && styles.tabActive,
                ]}
                onPress={() => setActiveTab("general")}
              >
                <MaterialCommunityIcons
                  name="cog"
                  size={18}
                  color={
                    activeTab === "general" ? COLORS.primary : COLORS.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "general" && styles.tabTextActive,
                  ]}
                >
                  Cài đặt chung
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
                  Kiểu dịch
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {renderContent()}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
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
  title: { color: COLORS.text, fontSize: 16, fontWeight: "600" },
  closeButton: { position: "absolute", right: 0, top: 12, padding: 8 },
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
  tabActive: { backgroundColor: COLORS.surfaceElevated },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "500" },
  tabTextActive: { color: COLORS.text },
});

export default SettingsModal;
