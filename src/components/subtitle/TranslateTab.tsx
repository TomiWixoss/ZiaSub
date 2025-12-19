import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { alert, confirmDestructive } from "../common/CustomAlert";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";
import type {
  GeminiConfig,
  BatchSettings,
  SavedTranslation,
  BatchProgress,
} from "@src/types";
import {
  getGeminiConfigs,
  getActiveGeminiConfig,
  saveActiveGeminiConfigId,
  getVideoTranslations,
  setActiveTranslation,
  deleteTranslation,
  getApiKeys,
} from "@utils/storage";
import { translationManager } from "@services/translationManager";
import { parseTime } from "@utils/videoUtils";
import Button3D from "../common/Button3D";
import {
  SavedTranslationsList,
  TranslationProgress,
  AdvancedOptions,
  TranslateConfigPicker,
  translateStyles,
} from "./translate";

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
  const [rangeStartStr, setRangeStartStr] = useState("");
  const [rangeEndStr, setRangeEndStr] = useState("");

  useEffect(() => {
    loadConfigs();
    checkApiKeys();
  }, []);

  useEffect(() => {
    if (videoUrl) loadTranslations();
  }, [videoUrl]);

  useEffect(() => {
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

    let rangeStart: number | undefined;
    let rangeEnd: number | undefined;

    if (useCustomRange) {
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

  const handleSelectConfig = (configId: string) => {
    setSelectedConfigId(configId);
    setShowConfigPicker(false);
  };

  return (
    <View style={styles.tabContent}>
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SavedTranslationsList
          translations={savedTranslations}
          activeTranslationId={activeTranslationId}
          onSelect={handleSelectTranslation}
          onDelete={handleDeleteTranslation}
        />

        {!hasApiKey && (
          <View style={translateStyles.warningContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color={COLORS.warning}
            />
            <Text style={translateStyles.warningText}>
              Chưa có key. Thêm trong Cài đặt nhé
            </Text>
          </View>
        )}

        <TranslateConfigPicker
          configs={geminiConfigs}
          selectedConfigId={selectedConfigId}
          showPicker={showConfigPicker}
          onTogglePicker={() => setShowConfigPicker(!showConfigPicker)}
          onSelectConfig={handleSelectConfig}
        />

        <AdvancedOptions
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
          streamingMode={streamingMode}
          onStreamingModeChange={handleStreamingModeChange}
          presubMode={presubMode}
          onPresubModeChange={handlePresubModeChange}
          useCustomRange={useCustomRange}
          onUseCustomRangeChange={setUseCustomRange}
          rangeStartStr={rangeStartStr}
          onRangeStartChange={setRangeStartStr}
          rangeEndStr={rangeEndStr}
          onRangeEndChange={setRangeEndStr}
          videoDuration={videoDuration}
        />

        <TranslationProgress
          isTranslating={isTranslating}
          translateStatus={translateStatus}
          keyStatus={keyStatus}
          batchProgress={batchProgress}
        />
      </ScrollView>

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
  translateButtonContainer: { marginTop: "auto", marginBottom: 8 },
});
