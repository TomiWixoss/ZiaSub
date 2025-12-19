/**
 * Hook for managing app settings
 */
import { useState, useEffect, useCallback } from "react";
import type { SubtitleSettings, BatchSettings, TTSSettings } from "@src/types";
import {
  getSubtitleSettings,
  saveSubtitleSettings,
  getBatchSettings,
  saveBatchSettings,
  getTTSSettings,
  saveTTSSettings,
  getApiKeys,
  saveApiKeys,
} from "@utils/storage";
import {
  DEFAULT_SUBTITLE_SETTINGS,
  DEFAULT_BATCH_SETTINGS,
  DEFAULT_TTS_SETTINGS,
} from "@constants/defaults";
import { keyManager } from "@services/keyManager";
import { ttsService } from "@services/ttsService";

export const useAppSettings = () => {
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>(
    DEFAULT_SUBTITLE_SETTINGS
  );
  const [batchSettings, setBatchSettings] = useState<BatchSettings>(
    DEFAULT_BATCH_SETTINGS
  );
  const [ttsSettings, setTTSSettings] =
    useState<TTSSettings>(DEFAULT_TTS_SETTINGS);
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [subtitleS, batchS, keys, ttsS] = await Promise.all([
          getSubtitleSettings(),
          getBatchSettings(),
          getApiKeys(),
          getTTSSettings(),
        ]);
        setSubtitleSettings(subtitleS);
        setBatchSettings(batchS);
        setApiKeys(keys);
        keyManager.initialize(keys);
        setTTSSettings(ttsS);
        ttsService.setSettings(ttsS);
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const updateSubtitleSettings = useCallback(
    async (newSettings: SubtitleSettings) => {
      setSubtitleSettings(newSettings);
      await saveSubtitleSettings(newSettings);
    },
    []
  );

  const updateBatchSettings = useCallback(
    async (newSettings: BatchSettings) => {
      setBatchSettings(newSettings);
      await saveBatchSettings(newSettings);
    },
    []
  );

  const updateTTSSettings = useCallback(async (newSettings: TTSSettings) => {
    setTTSSettings(newSettings);
    ttsService.setSettings(newSettings);
    await saveTTSSettings(newSettings);
    if (!newSettings.enabled) {
      ttsService.stop();
    }
  }, []);

  const updateApiKeys = useCallback(async (newKeys: string[]) => {
    setApiKeys(newKeys);
    await saveApiKeys(newKeys);
    keyManager.initialize(newKeys);
  }, []);

  return {
    subtitleSettings,
    batchSettings,
    ttsSettings,
    apiKeys,
    isLoading,
    updateSubtitleSettings,
    updateBatchSettings,
    updateTTSSettings,
    updateApiKeys,
  };
};
