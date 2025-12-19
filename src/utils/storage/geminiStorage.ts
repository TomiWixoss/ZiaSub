/**
 * Gemini Config Storage - AI configuration persistence
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GeminiConfig } from "@src/types";
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_CHAT_CONFIG_ID,
} from "@constants/defaults";

const GEMINI_CONFIGS_KEY = "gemini_configs";
const ACTIVE_GEMINI_CONFIG_KEY = "active_gemini_config";

export const createDefaultGeminiConfig = (): GeminiConfig => ({
  id: Date.now().toString(),
  name: "Mặc định",
  model: "models/gemini-3-flash-preview",
  temperature: 0.7,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
});

export const createDefaultChatConfig = (): GeminiConfig => ({
  id: DEFAULT_CHAT_CONFIG_ID,
  name: "Chat",
  model: "models/gemini-flash-latest",
  temperature: 1.0,
  systemPrompt: "",
});

export const saveGeminiConfigs = async (
  configs: GeminiConfig[]
): Promise<void> => {
  try {
    await AsyncStorage.setItem(GEMINI_CONFIGS_KEY, JSON.stringify(configs));
  } catch (error) {
    console.error("Error saving Gemini configs:", error);
  }
};

export const getGeminiConfigs = async (): Promise<GeminiConfig[]> => {
  try {
    const data = await AsyncStorage.getItem(GEMINI_CONFIGS_KEY);
    let configs: GeminiConfig[] = data ? JSON.parse(data) : [];

    // Ensure default chat config exists
    const hasChatConfig = configs.some((c) => c.id === DEFAULT_CHAT_CONFIG_ID);
    if (!hasChatConfig) {
      const chatConfig = createDefaultChatConfig();
      configs = [chatConfig, ...configs];
      await saveGeminiConfigs(configs);
    }

    // Ensure at least one translation config exists
    const hasTranslationConfig = configs.some(
      (c) => c.id !== DEFAULT_CHAT_CONFIG_ID
    );
    if (!hasTranslationConfig) {
      const defaultConfig = createDefaultGeminiConfig();
      configs.push(defaultConfig);
      await saveGeminiConfigs(configs);
    }

    return configs;
  } catch (error) {
    console.error("Error getting Gemini configs:", error);
    return [createDefaultChatConfig(), createDefaultGeminiConfig()];
  }
};

export const saveActiveGeminiConfigId = async (id: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(ACTIVE_GEMINI_CONFIG_KEY, id);
  } catch (error) {
    console.error("Error saving active Gemini config:", error);
  }
};

export const getActiveGeminiConfigId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(ACTIVE_GEMINI_CONFIG_KEY);
  } catch (error) {
    console.error("Error getting active Gemini config:", error);
    return null;
  }
};

export const getActiveGeminiConfig = async (): Promise<GeminiConfig | null> => {
  try {
    const configs = await getGeminiConfigs();
    const activeId = await getActiveGeminiConfigId();

    if (activeId) {
      const config = configs.find((c) => c.id === activeId);
      if (config) return config;
    }

    return configs[0] || null;
  } catch (error) {
    console.error("Error getting active Gemini config:", error);
    return null;
  }
};
