import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { alert, confirmDestructive } from "../CustomAlert";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";
import {
  GeminiConfig,
  BatchSettings,
  SavedTranslation,
  getGeminiConfigs,
  getActiveGeminiConfig,
  saveActiveGeminiConfigId,
  getVideoTranslations,
  setActiveTranslation,
  deleteTranslation,
  getApiKeys,
} from "@utils/storage";
import { BatchProgress } from "@services/geminiService";
import { translationManager } from "@services/translationManager";
import Button3D from "../Button3D";

interface TranslateTabProps {
  videoUrl?: string;
  videoDuration?: number;
  batchSettings?: BatchSettings;
  isTranslating: boolean;
  translateStatus: string;
  keyStatus: string | null;
  batchProgress: BatchProgress | null;
  onClose: () => void;
  onSelectTranslation: (srtContent: string) => void;
}

export const TranslateTab: React.FC<TranslateTabProps> = ({
  videoUrl,
  videoDuration,
  batchSettings,
  isTranslating,
  translateStatus,
  keyStatus,
  batchProgress,
  onClose,
  onSelectTranslation,
}) => {
  const [geminiConfigs, setGeminiConfigs] = useState<GeminiConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [showConfigPicker, setShowConfigPicker] = useState(false);
  const [savedTranslations, setSavedTranslations] = useState<
    SavedTranslation[]
  >([]);
  const [activeTranslationId, setActiveTranslationId] = useState<string | null>(
    null
  );
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    loadConfigs();
    checkApiKeys();
  }, []);

  useEffect(() => {
    if (videoUrl) loadTranslations();
  }, [videoUrl]);

  const loadConfigs = async () => {
    const configs = await getGeminiConfigs();
    setGeminiConfigs(configs);
    const activeConfig = await getActiveGeminiConfig();
    if (activeConfig) setSelectedConfigId(activeConfig.id);
  };

  const checkApiKeys = async () => {
    const keys = await getApiKeys();
    setHasApiKey(keys.length > 0);
  };

  const loadTranslations = async () => {
    if (!videoUrl) return;
    const data = await getVideoTranslations(videoUrl);
    if (data) {
      setSavedTranslations(data.translations);
      setActiveTranslationId(data.activeTranslationId);
    } else {
      setSavedTranslations([]);
      setActiveTranslationId(null);
    }
  };

  const handleTranslate = async () => {
    const config = geminiConfigs.find((c) => c.id === selectedConfigId);
    if (!config) return alert("Chưa chọn", "Chọn kiểu dịch trước nhé.");
    if (!videoUrl) return alert("Chưa có video", "Mở video cần dịch trước.");
    if (translationManager.isTranslatingUrl(videoUrl)) {
      return alert("Thông báo", "Video này đang dịch rồi.");
    }

    try {
      await saveActiveGeminiConfigId(selectedConfigId);
      translationManager.startTranslation(
        videoUrl,
        config,
        videoDuration,
        batchSettings
      );
    } catch (error: any) {
      alert("Không dịch được", error.message || "Có lỗi xảy ra.");
    }
  };

  const handleSelectTranslation = async (translation: SavedTranslation) => {
    if (!videoUrl) return;
    await setActiveTranslation(videoUrl, translation.id);
    setActiveTranslationId(translation.id);
    onSelectTranslation(translation.srtContent);
    onClose();
  };

  const handleDeleteTranslation = (translation: SavedTranslation) => {
    confirmDestructive(
      "Xóa bản dịch",
      "Bạn muốn xóa bản dịch này?",
      async () => {
        if (!videoUrl) return;
        await deleteTranslation(videoUrl, translation.id);
        loadTranslations();
      }
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const selectedConfig = geminiConfigs.find((c) => c.id === selectedConfigId);

  return (
    <View style={styles.tabContent}>
      {/* Saved Translations List */}
      {savedTranslations.length > 0 && (
        <View style={styles.translationsSection}>
          <Text style={styles.sectionTitle}>Đã dịch</Text>
          <ScrollView
            style={styles.translationsList}
            showsVerticalScrollIndicator={false}
          >
            {savedTranslations.map((t) => (
              <View
                key={t.id}
                style={[
                  styles.translationItem,
                  t.id === activeTranslationId && styles.translationItemActive,
                ]}
              >
                <TouchableOpacity
                  style={styles.translationInfo}
                  onPress={() => handleSelectTranslation(t)}
                >
                  <View style={styles.translationHeader}>
                    <MaterialCommunityIcons
                      name={
                        t.id === activeTranslationId
                          ? "check-circle"
                          : "file-document-outline"
                      }
                      size={16}
                      color={
                        t.id === activeTranslationId
                          ? COLORS.success
                          : COLORS.textMuted
                      }
                    />
                    <Text style={styles.translationConfig}>{t.configName}</Text>
                  </View>
                  <Text style={styles.translationDate}>
                    {formatDate(t.createdAt)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteTranslation(t)}
                >
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={18}
                    color={COLORS.error}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* API Key Warning */}
      {!hasApiKey && (
        <View style={styles.warningContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={20}
            color={COLORS.warning}
          />
          <Text style={styles.warningText}>
            Chưa có key. Thêm trong Cài đặt nhé
          </Text>
        </View>
      )}

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
            {selectedConfig?.name || "Chọn kiểu dịch"}
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
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Translation Progress */}
      {isTranslating && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <View style={styles.progressTitleRow}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.progressTitle}>{translateStatus}</Text>
            </View>
            {batchProgress && batchProgress.totalBatches > 1 && (
              <Text style={styles.progressCount}>
                {batchProgress.completedBatches}/{batchProgress.totalBatches}
              </Text>
            )}
          </View>

          {keyStatus && <Text style={styles.keyStatusText}>{keyStatus}</Text>}

          {batchProgress && batchProgress.totalBatches > 1 && (
            <View style={styles.batchGrid}>
              {batchProgress.batchStatuses.map((status, index) => (
                <View
                  key={index}
                  style={[
                    styles.batchItem,
                    status === "completed" && styles.batchCompleted,
                    status === "processing" && styles.batchProcessing,
                    status === "error" && styles.batchError,
                  ]}
                >
                  <Text style={styles.batchItemText}>{index + 1}</Text>
                  {status === "completed" && (
                    <MaterialCommunityIcons
                      name="check"
                      size={12}
                      color={COLORS.text}
                    />
                  )}
                  {status === "error" && (
                    <MaterialCommunityIcons
                      name="close"
                      size={12}
                      color={COLORS.text}
                    />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Translate Button */}
      <View style={styles.translateButtonContainer}>
        <Button3D
          onPress={handleTranslate}
          icon="translate"
          title={isTranslating ? "Đang dịch..." : "Dịch mới"}
          variant="primary"
          disabled={isTranslating || !videoUrl || !hasApiKey}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: { flex: 1 },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,183,77,0.15)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  warningText: {
    color: COLORS.warning,
    fontSize: 13,
    flex: 1,
  },
  translationsSection: { marginBottom: 16 },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  translationsList: { maxHeight: 140 },
  translationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  translationItemActive: { borderColor: COLORS.success },
  translationInfo: { flex: 1, padding: 12 },
  translationHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  translationConfig: { color: COLORS.text, fontSize: 13, fontWeight: "500" },
  translationDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  deleteBtn: { padding: 12 },
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
  configPickerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  configPickerText: { color: COLORS.text, fontSize: 14, fontWeight: "500" },
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
  configOptionActive: { backgroundColor: COLORS.surfaceElevated },
  configOptionText: { color: COLORS.text, fontSize: 14 },
  configOptionTextActive: { color: COLORS.primary, fontWeight: "600" },
  configNoKey: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  translateButtonContainer: { marginTop: "auto", marginBottom: 8 },
  progressContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  progressTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
  },
  progressCount: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  keyStatusText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 30,
  },
  batchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  batchItem: {
    width: 44,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  batchCompleted: { backgroundColor: COLORS.success },
  batchProcessing: { backgroundColor: COLORS.primary },
  batchError: { backgroundColor: COLORS.error },
  batchItemText: { color: COLORS.text, fontSize: 12, fontWeight: "600" },
});
