/**
 * Gemini Config Storage - AI configuration persistence using cache + file system
 * Uses write-through cache: immediate cache update, background file persistence
 */
import { cacheService } from "@services/cacheService";
import type { GeminiConfig } from "@src/types";
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_CHAT_CONFIG_ID,
} from "@constants/defaults";

export const createDefaultGeminiConfig = (): GeminiConfig => ({
  id: Date.now().toString(),
  name: "Mặc định",
  model: "models/gemini-3-flash-preview",
  temperature: 0.7,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  mediaResolution: "MEDIA_RESOLUTION_HIGH",
  thinkingLevel: "HIGH",
  // thinkingBudget not needed for Gemini 3 Flash (uses thinkingLevel)
});

export const createDefaultChatConfig = (): GeminiConfig => ({
  id: DEFAULT_CHAT_CONFIG_ID,
  name: "Chat",
  model: "models/gemini-flash-latest",
  temperature: 1.0,
  systemPrompt: "",
  mediaResolution: "MEDIA_RESOLUTION_MEDIUM",
  // Gemini Flash uses thinkingBudget (0-24576)
  thinkingBudget: 24576,
});

export const saveGeminiConfigs = async (
  configs: GeminiConfig[]
): Promise<void> => {
  cacheService.setGeminiConfigs(configs);
};

export const getGeminiConfigs = async (): Promise<GeminiConfig[]> => {
  await cacheService.waitForInit();
  let configs = cacheService.getGeminiConfigs();

  // Ensure default chat config exists
  const hasChatConfig = configs.some((c) => c.id === DEFAULT_CHAT_CONFIG_ID);
  if (!hasChatConfig) {
    const chatConfig = createDefaultChatConfig();
    configs = [chatConfig, ...configs];
    cacheService.setGeminiConfigs(configs);
  }

  // Ensure at least one translation config exists
  const hasTranslationConfig = configs.some(
    (c) => c.id !== DEFAULT_CHAT_CONFIG_ID
  );
  if (!hasTranslationConfig) {
    const defaultConfig = createDefaultGeminiConfig();
    configs = [...configs, defaultConfig];
    cacheService.setGeminiConfigs(configs);
  }

  return configs;
};

// Translation config (for subtitle translation)
export const saveActiveTranslationConfigId = async (
  id: string
): Promise<void> => {
  cacheService.setActiveTranslationConfigId(id);
};

export const getActiveTranslationConfigId = async (): Promise<
  string | null
> => {
  await cacheService.waitForInit();
  return cacheService.getActiveTranslationConfigId();
};

export const getActiveTranslationConfig =
  async (): Promise<GeminiConfig | null> => {
    await cacheService.waitForInit();
    const configs = cacheService.getGeminiConfigs();
    const activeId = cacheService.getActiveTranslationConfigId();

    if (activeId) {
      const config = configs.find((c) => c.id === activeId);
      if (config && config.id !== DEFAULT_CHAT_CONFIG_ID) return config;
    }

    // Return first translation config (not chat config) as default
    const translationConfig = configs.find(
      (c) => c.id !== DEFAULT_CHAT_CONFIG_ID
    );
    return translationConfig || null;
  };

// Chat config
export const saveActiveChatConfigId = async (id: string): Promise<void> => {
  cacheService.setActiveChatConfigId(id);
};

export const getActiveChatConfigId = async (): Promise<string | null> => {
  await cacheService.waitForInit();
  return cacheService.getActiveChatConfigId();
};

export const getActiveChatConfig = async (): Promise<GeminiConfig | null> => {
  await cacheService.waitForInit();
  const configs = cacheService.getGeminiConfigs();
  const activeId = cacheService.getActiveChatConfigId();

  if (activeId) {
    const config = configs.find((c) => c.id === activeId);
    if (config) return config;
  }

  // Return default chat config
  const chatConfig = configs.find((c) => c.id === DEFAULT_CHAT_CONFIG_ID);
  return chatConfig || configs[0] || null;
};

// Legacy support - maps to translation config
export const saveActiveGeminiConfigId = saveActiveTranslationConfigId;
export const getActiveGeminiConfigId = getActiveTranslationConfigId;
export const getActiveGeminiConfig = getActiveTranslationConfig;
