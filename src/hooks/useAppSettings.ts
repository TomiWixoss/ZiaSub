/**
 * Hook for managing app settings
 * Uses storage service for persistence
 */
import { useState, useEffect, useCallback } from "react";
import type {
  SubtitleSettings,
  BatchSettings,
  TTSSettings,
  FloatingUISettings,
  NotificationSettings,
} from "@src/types";
import { storageService } from "@services/storageService";
import {
  DEFAULT_SUBTITLE_SETTINGS,
  DEFAULT_BATCH_SETTINGS,
  DEFAULT_TTS_SETTINGS,
  DEFAULT_FLOATING_UI_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
} from "@constants/defaults";
import { keyManager } from "@services/keyManager";
import { ttsService } from "@services/ttsService";
import { notificationService } from "@services/notificationService";

export const useAppSettings = () => {
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>(
    DEFAULT_SUBTITLE_SETTINGS
  );
  const [batchSettings, setBatchSettings] = useState<BatchSettings>(
    DEFAULT_BATCH_SETTINGS
  );
  const [ttsSettings, setTTSSettings] =
    useState<TTSSettings>(DEFAULT_TTS_SETTINGS);
  const [floatingUISettings, setFloatingUISettings] =
    useState<FloatingUISettings>(DEFAULT_FLOATING_UI_SETTINGS);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all settings from storage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const settings = storageService.getSettings();

        setSubtitleSettings(settings.subtitle || DEFAULT_SUBTITLE_SETTINGS);
        setBatchSettings(settings.batch || DEFAULT_BATCH_SETTINGS);
        setTTSSettings(settings.tts || DEFAULT_TTS_SETTINGS);
        setFloatingUISettings(
          settings.floatingUI || DEFAULT_FLOATING_UI_SETTINGS
        );
        setNotificationSettings(
          settings.notification || DEFAULT_NOTIFICATION_SETTINGS
        );

        const keys = settings.apiKeys?.keys || [];
        setApiKeys(keys);

        // Initialize services with loaded settings
        if (keys.length > 0) {
          keyManager.initialize(keys);
        }
        ttsService.setSettings(settings.tts || DEFAULT_TTS_SETTINGS);

        // Initialize notification service
        notificationService.initialize();
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (storageService.isInitialized()) {
      loadSettings();
    }
  }, []);

  const updateSubtitleSettings = useCallback(
    async (newSettings: SubtitleSettings) => {
      setSubtitleSettings(newSettings);
      const settings = storageService.getSettings();
      settings.subtitle = newSettings;
      await storageService.setSettings(settings);
    },
    []
  );

  const updateBatchSettings = useCallback(
    async (newSettings: BatchSettings) => {
      setBatchSettings(newSettings);
      const settings = storageService.getSettings();
      settings.batch = newSettings;
      await storageService.setSettings(settings);
    },
    []
  );

  const updateTTSSettings = useCallback(async (newSettings: TTSSettings) => {
    setTTSSettings(newSettings);
    ttsService.setSettings(newSettings);

    const settings = storageService.getSettings();
    settings.tts = newSettings;
    await storageService.setSettings(settings);

    if (!newSettings.enabled) {
      ttsService.stop();
    }
  }, []);

  const updateApiKeys = useCallback(async (newKeys: string[]) => {
    setApiKeys(newKeys);
    keyManager.initialize(newKeys);
    await storageService.setApiKeys(newKeys);
  }, []);

  const updateFloatingUISettings = useCallback(
    async (newSettings: FloatingUISettings) => {
      setFloatingUISettings(newSettings);
      const settings = storageService.getSettings();
      settings.floatingUI = newSettings;
      await storageService.setSettings(settings);
    },
    []
  );

  const updateNotificationSettings = useCallback(
    async (newSettings: NotificationSettings) => {
      setNotificationSettings(newSettings);
      const settings = storageService.getSettings();
      settings.notification = newSettings;
      await storageService.setSettings(settings);
    },
    []
  );

  return {
    subtitleSettings,
    batchSettings,
    ttsSettings,
    floatingUISettings,
    notificationSettings,
    apiKeys,
    isLoading,
    updateSubtitleSettings,
    updateBatchSettings,
    updateTTSSettings,
    updateFloatingUISettings,
    updateNotificationSettings,
    updateApiKeys,
  };
};
