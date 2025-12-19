import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";
import {
  GeminiConfig,
  BatchSettings,
  getGeminiConfigs,
  getActiveGeminiConfig,
  saveActiveGeminiConfigId,
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
}

export const TranslateTab: React.FC<TranslateTabProps> = ({
  videoUrl,
  videoDuration,
  batchSettings,
  isTranslating,
  translateStatus,
  batchProgress,
  onClose,
}) => {
  const [geminiConfigs, setGeminiConfigs] = useState<GeminiConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [showConfigPicker, setShowConfigPicker] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const configs = await getGeminiConfigs();
    setGeminiConfigs(configs);
    const activeConfig = await getActiveGeminiConfig();
    if (activeConfig) {
      setSelectedConfigId(activeConfig.id);
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
    if (translationManager.isTranslatingUrl(videoUrl)) {
      Alert.alert("Thông báo", "Video này đang được dịch.");
      return;
    }

    try {
      await saveActiveGeminiConfigId(selectedConfigId);
      translationManager.startTranslation(
        videoUrl,
        config,
        videoDuration,
        batchSettings
      );
      onClose();
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể bắt đầu dịch.");
    }
  };

  const selectedConfig = geminiConfigs.find((c) => c.id === selectedConfigId);

  return (
    <View style={styles.tabContent}>
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

      {isTranslating && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.statusText}>{translateStatus}</Text>
        </View>
      )}

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
                  <ActivityIndicator
                    size={10}
                    color={COLORS.text}
                    style={styles.batchSpinner}
                  />
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
};

const styles = StyleSheet.create({
  tabContent: { flex: 1 },
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
  videoUrlText: { flex: 1, color: COLORS.textMuted, fontSize: 12 },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  statusText: { color: COLORS.textSecondary, fontSize: 14 },
  translateButtonContainer: { marginTop: "auto", marginBottom: 16 },
  noteText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  batchProgressContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
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
  batchSpinner: { marginLeft: 2 },
});
