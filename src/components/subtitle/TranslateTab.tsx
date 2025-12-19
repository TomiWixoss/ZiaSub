import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { alert, confirmDestructive } from "../common/CustomAlert";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type {
  GeminiConfig,
  BatchSettings,
  SavedTranslation,
  BatchProgress,
} from "@src/types";
import {
  getGeminiConfigs,
  getActiveTranslationConfig,
  saveActiveTranslationConfigId,
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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(translateTabThemedStyles);
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
    // Filter out chat config for translation picker
    const translationConfigs = configs.filter(
      (c) => c.id !== "default-chat-config"
    );
    setGeminiConfigs(translationConfigs);
    const activeConfig = await getActiveTranslationConfig();
    if (activeConfig) {
      setSelectedConfigId(activeConfig.id);
    } else if (translationConfigs.length > 0) {
      setSelectedConfigId(translationConfigs[0].id);
    }
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
    if (batchSettings && onBatchSettingsChange)
      onBatchSettingsChange({ ...batchSettings, streamingMode: value });
  };
  const handlePresubModeChange = (value: boolean) => {
    setPresubMode(value);
    if (value && !streamingMode) {
      setStreamingMode(true);
      if (batchSettings && onBatchSettingsChange)
        onBatchSettingsChange({
          ...batchSettings,
          presubMode: value,
          streamingMode: true,
        });
    } else if (batchSettings && onBatchSettingsChange)
      onBatchSettingsChange({ ...batchSettings, presubMode: value });
  };

  const handleTranslate = async () => {
    const config = geminiConfigs.find((c) => c.id === selectedConfigId);
    if (!config)
      return alert(
        t("subtitleModal.translate.notSelected"),
        t("subtitleModal.translate.notSelectedMessage")
      );
    if (!videoUrl)
      return alert(
        t("subtitleModal.translate.noVideo"),
        t("subtitleModal.translate.noVideoMessage")
      );
    if (translationManager.isTranslatingUrl(videoUrl))
      return alert(
        t("common.notice"),
        t("subtitleModal.translate.alreadyTranslating")
      );
    let rangeStart: number | undefined;
    let rangeEnd: number | undefined;
    if (useCustomRange) {
      const start = rangeStartStr.trim() ? parseTime(rangeStartStr) : 0;
      const end = rangeEndStr.trim() ? parseTime(rangeEndStr) : videoDuration;
      if (start === null)
        return alert(
          t("common.error"),
          t("subtitleModal.translate.invalidStartTime")
        );
      if (end === null || end === undefined)
        return alert(
          t("common.error"),
          t("subtitleModal.translate.invalidEndTime")
        );
      const clampedStart = Math.max(0, start);
      const clampedEnd = videoDuration ? Math.min(end, videoDuration) : end;
      if (clampedStart >= clampedEnd)
        return alert(
          t("common.error"),
          t("subtitleModal.translate.invalidRange")
        );
      rangeStart = clampedStart;
      rangeEnd = clampedEnd;
    }
    try {
      await saveActiveTranslationConfigId(selectedConfigId);
      translationManager.startTranslation(
        videoUrl,
        config,
        videoDuration,
        batchSettings,
        rangeStart,
        rangeEnd
      );
    } catch (error: any) {
      alert(
        t("subtitleModal.translate.error"),
        error.message || t("errors.generic")
      );
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
      t("subtitleModal.translate.deleteTitle"),
      t("subtitleModal.translate.deleteConfirm"),
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
          <View style={themedStyles.warningContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color={colors.warning}
            />
            <Text style={themedStyles.warningText}>
              {t("subtitleModal.translate.noApiKey")}
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
          title={
            isTranslating
              ? t("subtitleModal.translate.translating")
              : t("subtitleModal.translate.newTranslation")
          }
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

const translateTabThemedStyles = createThemedStyles((colors) => ({
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,183,77,0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningText: { color: colors.warning, fontSize: 13, flex: 1 },
}));
