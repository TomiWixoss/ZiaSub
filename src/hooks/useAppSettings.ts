/**
 * Hook for managing app settings
 * Uses cache service for immediate updates
 */
import { useState, useEffect, useCallback } from "react";
import type { SubtitleSettings, BatchSettings, TTSSettings } from "@src/types";
import { cacheService } from "@services/cacheService";
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

  // Load all settings from cache on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        // Cache is already initialized by App.tsx, just read from it
        const settings = cacheService.getSettings();

        setSubtitleSettings(settings.subtitle || DEFAULT_SUBTITLE_SETTINGS);
        setBatchSettings(settings.batch || DEFAULT_BATCH_SETTINGS);
        setTTSSettings(settings.tts || DEFAULT_TTS_SETTINGS);

        const keys = settings.apiKeys?.keys || [];
        setApiKeys(keys);

        // Initialize services with loaded settings
        if (keys.length > 0) {
          keyManager.initialize(keys);
        }
        ttsService.setSettings(settings.tts || DEFAULT_TTS_SETTINGS);
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Wait for cache to be ready
    if (cacheService.isInitialized()) {
      loadSettings();
    } else {
      cacheService.waitForInit().then(loadSettings);
    }

    // Subscribe to settings changes
    const unsubscribe = cacheService.subscribe("settings", (newSettings) => {
      setSubtitleSettings(newSettings.subtitle || DEFAULT_SUBTITLE_SETTINGS);
      setBatchSettings(newSettings.batch || DEFAULT_BATCH_SETTINGS);
      setTTSSettings(newSettings.tts || DEFAULT_TTS_SETTINGS);
    });

    const unsubscribeKeys = cacheService.subscribe("apiKeys", (newKeys) => {
      setApiKeys(newKeys);
    });

    return () => {
      unsubscribe();
      unsubscribeKeys();
    };
  }, []);

  const updateSubtitleSettings = useCallback(
    (newSettings: SubtitleSettings) => {
      setSubtitleSettings(newSettings);
      const settings = cacheService.getSettings();
      settings.subtitle = newSettings;
      cacheService.setSettings(settings);
    },
    []
  );

  const updateBatchSettings = useCallback((newSettings: BatchSettings) => {
    setBatchSettings(newSettings);
    const settings = cacheService.getSettings();
    settings.batch = newSettings;
    cacheService.setSettings(settings);
  }, []);

  const updateTTSSettings = useCallback((newSettings: TTSSettings) => {
    setTTSSettings(newSettings);
    ttsService.setSettings(newSettings);

    const settings = cacheService.getSettings();
    settings.tts = newSettings;
    cacheService.setSettings(settings);

    if (!newSettings.enabled) {
      ttsService.stop();
    }
  }, []);

  const updateApiKeys = useCallback((newKeys: string[]) => {
    setApiKeys(newKeys);
    keyManager.initialize(newKeys);
    cacheService.setApiKeys(newKeys);
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
