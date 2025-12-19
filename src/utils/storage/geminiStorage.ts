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
const ACTIVE_TRANSLATION_CONFIG_KEY = "active_translation_config";
const ACTIVE_CHAT_CONFIG_KEY = "active_chat_config";

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

// Translation config (for subtitle translation)
export const saveActiveTranslationConfigId = async (
  id: string
): Promise<void> => {
  try {
    await AsyncStorage.setItem(ACTIVE_TRANSLATION_CONFIG_KEY, id);
  } catch (error) {
    console.error("Error saving active translation config:", error);
  }
};

export const getActiveTranslationConfigId = async (): Promise<
  string | null
> => {
  try {
    return await AsyncStorage.getItem(ACTIVE_TRANSLATION_CONFIG_KEY);
  } catch (error) {
    console.error("Error getting active translation config:", error);
    return null;
  }
};

export const getActiveTranslationConfig =
  async (): Promise<GeminiConfig | null> => {
    try {
      const configs = await getGeminiConfigs();
      const activeId = await getActiveTranslationConfigId();

      if (activeId) {
        const config = configs.find((c) => c.id === activeId);
        if (config && config.id !== DEFAULT_CHAT_CONFIG_ID) return config;
      }

      // Return first translation config (not chat config) as default
      const translationConfig = configs.find(
        (c) => c.id !== DEFAULT_CHAT_CONFIG_ID
      );
      return translationConfig || null;
    } catch (error) {
      console.error("Error getting active translation config:", error);
      return null;
    }
  };

// Chat config
export const saveActiveChatConfigId = async (id: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(ACTIVE_CHAT_CONFIG_KEY, id);
  } catch (error) {
    console.error("Error saving active chat config:", error);
  }
};

export const getActiveChatConfigId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(ACTIVE_CHAT_CONFIG_KEY);
  } catch (error) {
    console.error("Error getting active chat config:", error);
    return null;
  }
};

export const getActiveChatConfig = async (): Promise<GeminiConfig | null> => {
  try {
    const configs = await getGeminiConfigs();
    const activeId = await getActiveChatConfigId();

    if (activeId) {
      const config = configs.find((c) => c.id === activeId);
      if (config) return config;
    }

    // Return default chat config
    const chatConfig = configs.find((c) => c.id === DEFAULT_CHAT_CONFIG_ID);
    return chatConfig || configs[0] || null;
  } catch (error) {
    console.error("Error getting active chat config:", error);
    return null;
  }
};

// Legacy support - maps to translation config
export const saveActiveGeminiConfigId = saveActiveTranslationConfigId;
export const getActiveGeminiConfigId = getActiveTranslationConfigId;
export const getActiveGeminiConfig = getActiveTranslationConfig;
