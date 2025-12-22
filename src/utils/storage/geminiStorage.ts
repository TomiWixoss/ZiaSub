/**
 * Gemini Config Storage - AI configuration persistence using AsyncStorage
 */
import { storageService } from "@services/storageService";
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
});

export const createDefaultChatConfig = (): GeminiConfig => ({
  id: DEFAULT_CHAT_CONFIG_ID,
  name: "Chat",
  model: "models/gemini-flash-latest",
  temperature: 1.0,
  systemPrompt: "",
  mediaResolution: "MEDIA_RESOLUTION_MEDIUM",
  thinkingBudget: 24576,
});

// Default presub config ID
export const DEFAULT_PRESUB_CONFIG_ID = "default-presub-config";

export const createDefaultPresubConfig = (): GeminiConfig => ({
  id: DEFAULT_PRESUB_CONFIG_ID,
  name: "Xem nhanh",
  model: "models/gemini-3-flash-preview",
  temperature: 0.7,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  mediaResolution: "MEDIA_RESOLUTION_MEDIUM",
  thinkingLevel: "MEDIUM",
});

export const saveGeminiConfigs = async (
  configs: GeminiConfig[]
): Promise<void> => {
  await storageService.setGeminiConfigs(configs);
};

export const getGeminiConfigs = async (): Promise<GeminiConfig[]> => {
  let configs = storageService.getGeminiConfigs();

  // Ensure default chat config exists
  const hasChatConfig = configs.some((c) => c.id === DEFAULT_CHAT_CONFIG_ID);
  if (!hasChatConfig) {
    const chatConfig = createDefaultChatConfig();
    configs = [chatConfig, ...configs];
  }

  // Ensure default presub config exists
  const hasPresubConfig = configs.some(
    (c) => c.id === DEFAULT_PRESUB_CONFIG_ID
  );
  if (!hasPresubConfig) {
    const presubConfig = createDefaultPresubConfig();
    configs = [...configs, presubConfig];
  }

  // Ensure at least one translation config exists (not chat or presub)
  const hasTranslationConfig = configs.some(
    (c) => c.id !== DEFAULT_CHAT_CONFIG_ID && c.id !== DEFAULT_PRESUB_CONFIG_ID
  );
  if (!hasTranslationConfig) {
    const defaultConfig = createDefaultGeminiConfig();
    configs = [...configs, defaultConfig];
  }

  // Save if any configs were added
  if (!hasChatConfig || !hasPresubConfig || !hasTranslationConfig) {
    await storageService.setGeminiConfigs(configs);
  }

  return configs;
};

// Translation config (for subtitle translation)
export const saveActiveTranslationConfigId = async (
  id: string
): Promise<void> => {
  await storageService.setActiveTranslationConfigId(id);
};

export const getActiveTranslationConfigId = async (): Promise<
  string | null
> => {
  return await storageService.getActiveTranslationConfigId();
};

export const getActiveTranslationConfig =
  async (): Promise<GeminiConfig | null> => {
    const configs = storageService.getGeminiConfigs();
    const activeId = await storageService.getActiveTranslationConfigId();

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
  await storageService.setActiveChatConfigId(id);
};

export const getActiveChatConfigId = async (): Promise<string | null> => {
  return await storageService.getActiveChatConfigId();
};

export const getActiveChatConfig = async (): Promise<GeminiConfig | null> => {
  const configs = storageService.getGeminiConfigs();
  const activeId = await storageService.getActiveChatConfigId();

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
