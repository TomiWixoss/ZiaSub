/**
 * Storage module - Re-exports all storage functions
 */

// Settings
export {
  saveAppSettings,
  getAppSettings,
  saveSubtitleSettings,
  getSubtitleSettings,
  saveBatchSettings,
  getBatchSettings,
  saveApiKeys,
  getApiKeys,
  saveTTSSettings,
  getTTSSettings,
} from "./settingsStorage";

// SRT
export { saveSRT, getSRT, removeSRT } from "./srtStorage";

// Translations
export {
  saveTranslation,
  getVideoTranslations,
  setActiveTranslation,
  deleteTranslation,
  getAllTranslatedVideoUrls,
  hasTranslation,
  getActiveTranslation,
} from "./translationStorage";

// Gemini
export {
  createDefaultGeminiConfig,
  createDefaultChatConfig,
  saveGeminiConfigs,
  getGeminiConfigs,
  saveActiveGeminiConfigId,
  getActiveGeminiConfigId,
  getActiveGeminiConfig,
} from "./geminiStorage";

// Chat
export {
  getChatSessions,
  saveChatSessions,
  createChatSession,
  updateChatSession,
  deleteChatSession,
  getActiveChatSessionId,
  setActiveChatSessionId,
  getActiveChatSession,
  saveChatHistory,
  getChatHistory,
  clearChatHistory,
} from "./chatStorage";

// Re-export types from types module
export type {
  SubtitleSettings,
  BatchSettings,
  TTSSettings,
  ApiKeysSettings,
  AppSettings,
  SavedTranslation,
  VideoTranslations,
  GeminiConfig,
  ChatSession,
  ChatHistory,
  StoredChatMessage,
} from "@src/types";

// Re-export defaults
export {
  DEFAULT_SUBTITLE_SETTINGS,
  DEFAULT_BATCH_SETTINGS,
  DEFAULT_TTS_SETTINGS,
  DEFAULT_API_KEYS_SETTINGS,
  DEFAULT_APP_SETTINGS,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_CHAT_CONFIG_ID,
} from "@constants/defaults";
