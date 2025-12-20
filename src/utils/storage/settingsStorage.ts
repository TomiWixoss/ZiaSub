/**
 * Settings Storage - App settings persistence using file system
 */
import { fileStorage, STORAGE_FILES } from "@services/fileStorageService";
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
  DEFAULT_API_KEYS_SETTINGS,
} from "@constants/defaults";

const SETTINGS_FILE = STORAGE_FILES.settings;

// ============================================
// APP SETTINGS
// ============================================
export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  try {
    await fileStorage.saveData(SETTINGS_FILE, settings);
  } catch (error) {
    console.error("Error saving app settings:", error);
  }
};

export const getAppSettings = async (): Promise<AppSettings> => {
  try {
    const parsed = await fileStorage.loadData<Partial<AppSettings>>(
      SETTINGS_FILE,
      {}
    );
    if (parsed && Object.keys(parsed).length > 0) {
      return {
        subtitle: { ...DEFAULT_SUBTITLE_SETTINGS, ...parsed.subtitle },
        batch: { ...DEFAULT_BATCH_SETTINGS, ...parsed.batch },
        apiKeys: { ...DEFAULT_API_KEYS_SETTINGS, ...parsed.apiKeys },
        tts: { ...DEFAULT_TTS_SETTINGS, ...parsed.tts },
      };
    }
    return DEFAULT_APP_SETTINGS;
  } catch (error) {
    console.error("Error getting app settings:", error);
    return DEFAULT_APP_SETTINGS;
  }
};

// ============================================
// SUBTITLE SETTINGS
// ============================================
export const saveSubtitleSettings = async (
  settings: SubtitleSettings
): Promise<void> => {
  const appSettings = await getAppSettings();
  appSettings.subtitle = settings;
  await saveAppSettings(appSettings);
};

export const getSubtitleSettings = async (): Promise<SubtitleSettings> => {
  const appSettings = await getAppSettings();
  return appSettings.subtitle;
};

// ============================================
// BATCH SETTINGS
// ============================================
export const saveBatchSettings = async (
  settings: BatchSettings
): Promise<void> => {
  const appSettings = await getAppSettings();
  appSettings.batch = settings;
  await saveAppSettings(appSettings);
};

export const getBatchSettings = async (): Promise<BatchSettings> => {
  const appSettings = await getAppSettings();
  return appSettings.batch;
};

// ============================================
// API KEYS
// ============================================
export const saveApiKeys = async (keys: string[]): Promise<void> => {
  const appSettings = await getAppSettings();
  appSettings.apiKeys = { keys };
  await saveAppSettings(appSettings);
};

export const getApiKeys = async (): Promise<string[]> => {
  const appSettings = await getAppSettings();
  return appSettings.apiKeys?.keys || [];
};

// ============================================
// TTS SETTINGS
// ============================================
export const saveTTSSettings = async (settings: TTSSettings): Promise<void> => {
  const appSettings = await getAppSettings();
  appSettings.tts = settings;
  await saveAppSettings(appSettings);
};

export const getTTSSettings = async (): Promise<TTSSettings> => {
  const appSettings = await getAppSettings();
  return appSettings.tts;
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
