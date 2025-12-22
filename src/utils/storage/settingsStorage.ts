/**
 * Settings Storage - App settings persistence using AsyncStorage
 */
import { storageService } from "@services/storageService";
import type {
  AppSettings,
  SubtitleSettings,
  BatchSettings,
  TTSSettings,
  FloatingUISettings,
  NotificationSettings,
} from "@src/types";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_SUBTITLE_SETTINGS,
  DEFAULT_BATCH_SETTINGS,
  DEFAULT_TTS_SETTINGS,
  DEFAULT_FLOATING_UI_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
} from "@constants/defaults";

// ============================================
// APP SETTINGS
// ============================================
export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  await storageService.setSettings(settings);
};

export const getAppSettings = async (): Promise<AppSettings> => {
  return storageService.getSettings();
};

// ============================================
// SUBTITLE SETTINGS
// ============================================
export const saveSubtitleSettings = async (
  settings: SubtitleSettings
): Promise<void> => {
  const appSettings = storageService.getSettings();
  appSettings.subtitle = settings;
  await storageService.setSettings(appSettings);
};

export const getSubtitleSettings = async (): Promise<SubtitleSettings> => {
  const appSettings = storageService.getSettings();
  return appSettings.subtitle || DEFAULT_SUBTITLE_SETTINGS;
};

// ============================================
// BATCH SETTINGS
// ============================================
export const saveBatchSettings = async (
  settings: BatchSettings
): Promise<void> => {
  const appSettings = storageService.getSettings();
  appSettings.batch = settings;
  await storageService.setSettings(appSettings);
};

export const getBatchSettings = async (): Promise<BatchSettings> => {
  const appSettings = storageService.getSettings();
  return appSettings.batch || DEFAULT_BATCH_SETTINGS;
};

// ============================================
// API KEYS
// ============================================
export const saveApiKeys = async (keys: string[]): Promise<void> => {
  await storageService.setApiKeys(keys);
};

export const getApiKeys = async (): Promise<string[]> => {
  return storageService.getApiKeys();
};

// ============================================
// TTS SETTINGS
// ============================================
export const saveTTSSettings = async (settings: TTSSettings): Promise<void> => {
  const appSettings = storageService.getSettings();
  appSettings.tts = settings;
  await storageService.setSettings(appSettings);
};

export const getTTSSettings = async (): Promise<TTSSettings> => {
  const appSettings = storageService.getSettings();
  return appSettings.tts || DEFAULT_TTS_SETTINGS;
};

// ============================================
// FLOATING UI SETTINGS
// ============================================
export const saveFloatingUISettings = async (
  settings: FloatingUISettings
): Promise<void> => {
  const appSettings = storageService.getSettings();
  appSettings.floatingUI = settings;
  await storageService.setSettings(appSettings);
};

export const getFloatingUISettings = async (): Promise<FloatingUISettings> => {
  const appSettings = storageService.getSettings();
  return appSettings.floatingUI || DEFAULT_FLOATING_UI_SETTINGS;
};

// ============================================
// NOTIFICATION SETTINGS
// ============================================
export const saveNotificationSettings = async (
  settings: NotificationSettings
): Promise<void> => {
  const appSettings = storageService.getSettings();
  appSettings.notification = settings;
  await storageService.setSettings(appSettings);
};

export const getNotificationSettings =
  async (): Promise<NotificationSettings> => {
    const appSettings = storageService.getSettings();
    return appSettings.notification || DEFAULT_NOTIFICATION_SETTINGS;
  };

// ============================================
// ONBOARDING
// ============================================
export const setOnboardingCompleted = async (
  completed: boolean
): Promise<void> => {
  await storageService.setOnboardingCompleted(completed);
};

export const getOnboardingCompleted = async (): Promise<boolean> => {
  return await storageService.getOnboardingCompleted();
};

// Legacy export for compatibility
export const clearSettingsCache = (): void => {
  // No-op
};
