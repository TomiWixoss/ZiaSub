import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Switch,
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

// Helper to format seconds to mm:ss
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Helper to parse mm:ss to seconds
const parseTime = (timeStr: string): number | null => {
  const parts = timeStr.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1 && !isNaN(parts[0])) {
    return parts[0];
  }
  return null;
};

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
  onBatchSettingsChange?: (settings: BatchSettings) => void;
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
  onBatchSettingsChange,
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

  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [streamingMode, setStreamingMode] = useState(
    batchSettings?.streamingMode ?? false
  );
  const [presubMode, setPresubMode] = useState(
    batchSettings?.presubMode ?? false
  );
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [rangeStartStr, setRangeStartStr] = useState(""); // Empty = from start (0)
  const [rangeEndStr, setRangeEndStr] = useState(""); // Empty = to end (videoDuration)

  useEffect(() => {
    loadConfigs();
    checkApiKeys();
  }, []);

  useEffect(() => {
    if (videoUrl) loadTranslations();
  }, [videoUrl]);

  useEffect(() => {
    // Sync settings from batchSettings
    if (batchSettings) {
      setStreamingMode(batchSettings.streamingMode ?? false);
      setPresubMode(batchSettings.presubMode ?? false);
    }
  }, [batchSettings]);

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

  const handleStreamingModeChange = (value: boolean) => {
    setStreamingMode(value);
    if (batchSettings && onBatchSettingsChange) {
      onBatchSettingsChange({ ...batchSettings, streamingMode: value });
    }
  };

  const handlePresubModeChange = (value: boolean) => {
    setPresubMode(value);
    // Presub mode requires streaming mode
    if (value && !streamingMode) {
      setStreamingMode(true);
      if (batchSettings && onBatchSettingsChange) {
        onBatchSettingsChange({
          ...batchSettings,
          presubMode: value,
          streamingMode: true,
        });
      }
    } else if (batchSettings && onBatchSettingsChange) {
      onBatchSettingsChange({ ...batchSettings, presubMode: value });
    }
  };

  const handleTranslate = async () => {
    const config = geminiConfigs.find((c) => c.id === selectedConfigId);
    if (!config) return alert("Chưa chọn", "Chọn kiểu dịch trước nhé.");
    if (!videoUrl) return alert("Chưa có video", "Mở video cần dịch trước.");
    if (translationManager.isTranslatingUrl(videoUrl)) {
      return alert("Thông báo", "Video này đang dịch rồi.");
    }

    // Parse custom range if enabled
    let rangeStart: number | undefined;
    let rangeEnd: number | undefined;

    if (useCustomRange) {
      // Empty start = 0 (from beginning), empty end = videoDuration (to end)
      const start = rangeStartStr.trim() ? parseTime(rangeStartStr) : 0;
      const end = rangeEndStr.trim() ? parseTime(rangeEndStr) : videoDuration;

      if (start === null) {
        return alert(
          "Lỗi",
          "Thời gian bắt đầu không hợp lệ. Dùng mm:ss hoặc để trống"
        );
      }
      if (end === null || end === undefined) {
        return alert(
          "Lỗi",
          "Thời gian kết thúc không hợp lệ. Dùng mm:ss hoặc để trống"
        );
      }

      // Clamp values to video duration
      const clampedStart = Math.max(0, start);
      const clampedEnd = videoDuration ? Math.min(end, videoDuration) : end;

      if (clampedStart >= clampedEnd) {
        return alert(
          "Lỗi",
          "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc"
        );
      }

      rangeStart = clampedStart;
      rangeEnd = clampedEnd;
    }

    try {
      await saveActiveGeminiConfigId(selectedConfigId);
      translationManager.startTranslation(
        videoUrl,
        config,
        videoDuration,
        batchSettings,
        rangeStart,
        rangeEnd
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
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Saved Translations List */}
        {savedTranslations.length > 0 && (
          <View style={styles.translationsSection}>
            <Text style={styles.sectionTitle}>Đã dịch</Text>
            <View style={styles.translationsList}>
              {savedTranslations.map((t) => (
                <View
                  key={t.id}
                  style={[
                    styles.translationItem,
                    t.id === activeTranslationId &&
                      styles.translationItemActive,
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
                      <Text style={styles.translationConfig}>
                        {t.configName}
                      </Text>
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
            </View>
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

        {/* Advanced Options Toggle */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <MaterialCommunityIcons
            name="tune-variant"
            size={18}
            color={COLORS.textMuted}
          />
          <Text style={styles.advancedToggleText}>Tùy chọn nâng cao</Text>
          <MaterialCommunityIcons
            name={showAdvanced ? "chevron-up" : "chevron-down"}
            size={18}
            color={COLORS.textMuted}
          />
        </TouchableOpacity>

        {/* Advanced Options Panel */}
        {showAdvanced && (
          <View style={styles.advancedPanel}>
            {/* Streaming Mode */}
            <View style={styles.advancedRow}>
              <View style={styles.advancedRowLeft}>
                <MaterialCommunityIcons
                  name="play-speed"
                  size={18}
                  color={COLORS.primary}
                />
                <View style={styles.advancedRowInfo}>
                  <Text style={styles.advancedRowTitle}>Dịch từng đợt</Text>
                  <Text style={styles.advancedRowDesc}>
                    Xem phụ đề ngay khi mỗi phần dịch xong
                  </Text>
                </View>
              </View>
              <Switch
                value={streamingMode}
                onValueChange={handleStreamingModeChange}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.text}
              />
            </View>

            {/* Presub Mode */}
            <View style={styles.advancedRow}>
              <View style={styles.advancedRowLeft}>
                <MaterialCommunityIcons
                  name="lightning-bolt"
                  size={18}
                  color={COLORS.warning}
                />
                <View style={styles.advancedRowInfo}>
                  <Text style={styles.advancedRowTitle}>Xem nhanh</Text>
                  <Text style={styles.advancedRowDesc}>
                    Phần đầu dịch ngắn hơn để xem ngay (~2 phút)
                  </Text>
                </View>
              </View>
              <Switch
                value={presubMode}
                onValueChange={handlePresubModeChange}
                trackColor={{ false: COLORS.border, true: COLORS.warning }}
                thumbColor={COLORS.text}
              />
            </View>

            {/* Custom Range */}
            <View
              style={[
                styles.advancedRow,
                { borderBottomWidth: useCustomRange ? 1 : 0 },
              ]}
            >
              <View style={styles.advancedRowLeft}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={18}
                  color={COLORS.primary}
                />
                <View style={styles.advancedRowInfo}>
                  <Text style={styles.advancedRowTitle}>
                    Dịch khoảng thời gian
                  </Text>
                  <Text style={styles.advancedRowDesc}>
                    Để trống = từ đầu/tới cuối
                  </Text>
                </View>
              </View>
              <Switch
                value={useCustomRange}
                onValueChange={setUseCustomRange}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.text}
              />
            </View>

            {/* Range Inputs */}
            {useCustomRange && (
              <View style={styles.rangeInputContainer}>
                <View style={styles.rangeInputGroup}>
                  <Text style={styles.rangeLabel}>Từ</Text>
                  <TextInput
                    style={styles.rangeInput}
                    value={rangeStartStr}
                    onChangeText={setRangeStartStr}
                    placeholder="0:00"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color={COLORS.textMuted}
                />
                <View style={styles.rangeInputGroup}>
                  <Text style={styles.rangeLabel}>Đến</Text>
                  <TextInput
                    style={styles.rangeInput}
                    value={rangeEndStr}
                    onChangeText={setRangeEndStr}
                    placeholder={
                      videoDuration ? formatTime(videoDuration) : "cuối"
                    }
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
            )}

            {videoDuration && (
              <Text style={styles.durationHint}>
                Độ dài video: {formatTime(videoDuration)}
              </Text>
            )}
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
      </ScrollView>

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
  scrollContent: { flex: 1 },
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
  translationsList: { maxHeight: 140, overflow: "hidden" },
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
  // Advanced options styles
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  advancedToggleText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  advancedPanel: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  advancedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  advancedRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  advancedRowInfo: {
    flex: 1,
  },
  advancedRowTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "500",
  },
  advancedRowDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  rangeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rangeInputGroup: {
    alignItems: "center",
    gap: 4,
  },
  rangeLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  rangeInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
    minWidth: 80,
    textAlign: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  durationHint: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
});
