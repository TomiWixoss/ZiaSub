/**
 * Settings Storage - App settings persistence using cache + file system
 * Uses write-through cache: immediate cache update, background file persistence
 */
import { cacheService } from "@services/cacheService";
import { fileStorage } from "@services/fileStorageService";
import type {
  AppSettings,
  SubtitleSettings,
  BatchSettings,
  TTSSettings,
} from "@src/types";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_SUBTITLE_SETTINGS,
  DEFAULT_BATCH_SETTINGS,
  DEFAULT_TTS_SETTINGS,
} from "@constants/defaults";

// ============================================
// APP SETTINGS
// ============================================
export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  cacheService.setSettings(settings);
};

export const getAppSettings = async (): Promise<AppSettings> => {
  await cacheService.waitForInit();
  return cacheService.getSettings();
};

// ============================================
// SUBTITLE SETTINGS
// ============================================
export const saveSubtitleSettings = async (
  settings: SubtitleSettings
): Promise<void> => {
  const appSettings = cacheService.getSettings();
  appSettings.subtitle = settings;
  cacheService.setSettings(appSettings);
};

export const getSubtitleSettings = async (): Promise<SubtitleSettings> => {
  await cacheService.waitForInit();
  const appSettings = cacheService.getSettings();
  return appSettings.subtitle || DEFAULT_SUBTITLE_SETTINGS;
};

// ============================================
// BATCH SETTINGS
// ============================================
export const saveBatchSettings = async (
  settings: BatchSettings
): Promise<void> => {
  const appSettings = cacheService.getSettings();
  appSettings.batch = settings;
  cacheService.setSettings(appSettings);
};

export const getBatchSettings = async (): Promise<BatchSettings> => {
  await cacheService.waitForInit();
  const appSettings = cacheService.getSettings();
  return appSettings.batch || DEFAULT_BATCH_SETTINGS;
};

// ============================================
// API KEYS
// ============================================
export const saveApiKeys = async (keys: string[]): Promise<void> => {
  // If cache is initialized, use cache (normal flow)
  if (cacheService.isInitialized()) {
    cacheService.setApiKeys(keys);
    return;
  }

  // During onboarding, cache is not initialized yet
  // Save directly to file so it will be loaded when cache initializes
  try {
    // Load existing settings or use defaults
    const existingSettings = await fileStorage.loadData<AppSettings>(
      "settings.json",
      { ...DEFAULT_APP_SETTINGS }
    );
    existingSettings.apiKeys = { keys };
    await fileStorage.saveData("settings.json", existingSettings);
  } catch (error) {
    console.error("Error saving API keys during onboarding:", error);
  }
};

export const getApiKeys = async (): Promise<string[]> => {
  // If cache is initialized, use cache
  if (cacheService.isInitialized()) {
    return cacheService.getApiKeys();
  }

  // During onboarding, read directly from file
  try {
    const settings = await fileStorage.loadData<AppSettings | null>(
      "settings.json",
      null
    );
    return settings?.apiKeys?.keys || [];
  } catch {
    return [];
  }
};

// ============================================
// TTS SETTINGS
// ============================================
export const saveTTSSettings = async (settings: TTSSettings): Promise<void> => {
  const appSettings = cacheService.getSettings();
  appSettings.tts = settings;
  cacheService.setSettings(appSettings);
};

export const getTTSSettings = async (): Promise<TTSSettings> => {
  await cacheService.waitForInit();
  const appSettings = cacheService.getSettings();
  return appSettings.tts || DEFAULT_TTS_SETTINGS;
};

// ============================================
// ONBOARDING (uses AsyncStorage since it's needed before storage is configured)
// ============================================
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY = "@onboarding_completed";

export const setOnboardingCompleted = async (
  completed: boolean
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      ONBOARDING_COMPLETED_KEY,
      JSON.stringify(completed)
    );
  } catch (error) {
    console.error("Error saving onboarding status:", error);
  }
};

export const getOnboardingCompleted = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return data ? JSON.parse(data) : false;
  } catch (error) {
    console.error("Error getting onboarding status:", error);
    return false;
  }
};

// Legacy export for compatibility
export const clearSettingsCache = (): void => {
  // No-op, cache is managed by cacheService
};
