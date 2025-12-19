import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { alert, confirmDestructive } from "../common/CustomAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type {
  SubtitleSettings,
  BatchSettings,
  TTSSettings,
  GeminiConfig,
} from "@src/types";
import { getGeminiConfigs, saveGeminiConfigs } from "@utils/storage";
import GeneralTab from "./GeneralTab";
import GeminiList from "./GeminiList";
import GeminiEdit from "./GeminiEdit";

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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [geminiConfigs, setGeminiConfigs] = useState<GeminiConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<GeminiConfig | null>(null);

  const themedStyles = useThemedStyles(settingsThemedStyles);

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
    const newConfig = {
      id: Date.now().toString(),
      name: `${t("settings.gemini")} ${geminiConfigs.length + 1}`,
      model: "models/gemini-3-flash-preview",
      temperature: 0.7,
      systemPrompt: "",
    };
    setEditingConfig(newConfig);
  };

  const handleDeleteConfig = (id: string) => {
    if (geminiConfigs.length <= 1) {
      alert(
        t("settings.geminiConfig.cannotDelete"),
        t("settings.geminiConfig.cannotDeleteMessage")
      );
      return;
    }
    confirmDestructive(
      t("settings.geminiConfig.deleteTitle"),
      t("settings.geminiConfig.deleteConfirm"),
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
        <Animated.View
          style={[
            styles.modalBackdrop,
            themedStyles.modalBackdrop,
            { opacity: fadeAnim },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomSheet,
            themedStyles.bottomSheet,
            {
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={[styles.dragHandle, themedStyles.dragHandle]} />
            <Text style={[styles.title, themedStyles.title]}>
              {editingConfig ? t("settings.editConfig") : t("settings.title")}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {!editingConfig && (
            <View style={[styles.tabBar, themedStyles.tabBar]}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "general" && [
                    styles.tabActive,
                    themedStyles.tabActive,
                  ],
                ]}
                onPress={() => setActiveTab("general")}
              >
                <MaterialCommunityIcons
                  name="cog"
                  size={18}
                  color={
                    activeTab === "general" ? colors.primary : colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    themedStyles.tabText,
                    activeTab === "general" && themedStyles.tabTextActive,
                  ]}
                >
                  {t("settings.general")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "gemini" && [
                    styles.tabActive,
                    themedStyles.tabActive,
                  ],
                ]}
                onPress={() => setActiveTab("gemini")}
              >
                <MaterialCommunityIcons
                  name="robot"
                  size={18}
                  color={
                    activeTab === "gemini" ? colors.primary : colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    themedStyles.tabText,
                    activeTab === "gemini" && themedStyles.tabTextActive,
                  ]}
                >
                  {t("settings.gemini")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {renderContent()}
        </Animated.View>

        {editingConfig && (
          <GeminiEdit
            config={editingConfig}
            onChange={setEditingConfig}
            onSave={handleSaveConfig}
            onCancel={() => setEditingConfig(null)}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: "100%",
    height: SHEET_HEIGHT,
    borderTopWidth: 1,
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
  },
  title: { fontSize: 16, fontWeight: "600" },
  closeButton: { position: "absolute", right: 0, top: 12, padding: 8 },
  tabBar: {
    flexDirection: "row",
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
  tabActive: {},
  tabText: { fontSize: 13, fontWeight: "500" },
  tabTextActive: {},
});

const settingsThemedStyles = createThemedStyles((colors) => ({
  modalBackdrop: { backgroundColor: colors.overlay },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  dragHandle: { backgroundColor: colors.borderLight },
  title: { color: colors.text },
  tabBar: { backgroundColor: colors.surfaceLight },
  tabActive: { backgroundColor: colors.surfaceElevated },
  tabText: { color: colors.textMuted },
  tabTextActive: { color: colors.text },
}));

export default SettingsModal;
