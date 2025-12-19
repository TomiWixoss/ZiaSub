import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
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

  useEffect(() => {
    loadConfigs();
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
    if (!config) return Alert.alert("Lỗi", "Vui lòng chọn cấu hình Gemini.");
    if (!videoUrl) return Alert.alert("Lỗi", "Không tìm thấy URL video.");
    if (translationManager.isTranslatingUrl(videoUrl)) {
      return Alert.alert("Thông báo", "Video này đang được dịch.");
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
      Alert.alert("Lỗi", error.message || "Không thể bắt đầu dịch.");
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
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa bản dịch này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          if (!videoUrl) return;
          await deleteTranslation(videoUrl, translation.id);
          loadTranslations();
        },
      },
    ]);
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
          <Text style={styles.sectionTitle}>Bản dịch đã lưu</Text>
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
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Status */}
      {isTranslating && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.statusText}>{translateStatus}</Text>
        </View>
      )}

      {/* Batch Progress */}
      {batchProgress && batchProgress.totalBatches > 1 && (
        <View style={styles.batchProgressContainer}>
          <View style={styles.batchProgressHeader}>
            <Text style={styles.batchProgressTitle}>Tiến trình batch</Text>
            <Text style={styles.batchProgressCount}>
              {batchProgress.completedBatches}/{batchProgress.totalBatches}
            </Text>
          </View>
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
                {status === "processing" && (
                  <ActivityIndicator size={10} color={COLORS.text} />
                )}
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
        </View>
      )}

      {/* Translate Button */}
      <View style={styles.translateButtonContainer}>
        <Button3D
          onPress={handleTranslate}
          icon="translate"
          title={isTranslating ? "Đang dịch..." : "Dịch mới"}
          variant="primary"
          disabled={isTranslating || !videoUrl}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: { flex: 1 },
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
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 10,
  },
  statusText: { color: COLORS.textSecondary, fontSize: 14 },
  translateButtonContainer: { marginTop: "auto", marginBottom: 8 },
  batchProgressContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  batchProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  batchProgressTitle: { color: COLORS.text, fontSize: 13, fontWeight: "500" },
  batchProgressCount: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  batchGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  batchItem: {
    width: 44,
    height: 36,
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
