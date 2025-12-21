import { ThinkingLevel, MediaResolution } from "@google/genai";
import type {
  GeminiConfig,
  ChatMessage,
  StreamCallbacks,
  VideoTimeRange,
} from "@src/types";
import { normalizeYouTubeUrl } from "@utils/videoUtils";
import { keyManager } from "./keyManager";

// Model IDs for reference
const MODEL_GEMINI_3_FLASH = "models/gemini-3-flash-preview";
const MODEL_GEMINI_3_PRO = "models/gemini-3-pro-preview";
const MODEL_GEMINI_25_PRO = "models/gemini-2.5-pro";
const MODEL_GEMINI_FLASH = "models/gemini-flash-latest";
const MODEL_GEMINI_FLASH_LITE = "models/gemini-flash-lite-latest";

// Map config string to ThinkingLevel enum (for Gemini 3 Flash Preview)
const getThinkingLevel = (level?: string): ThinkingLevel => {
  switch (level) {
    case "MINIMAL":
      return ThinkingLevel.MINIMAL;
    case "LOW":
      return ThinkingLevel.LOW;
    case "MEDIUM":
      return ThinkingLevel.MEDIUM;
    case "HIGH":
    default:
      return ThinkingLevel.HIGH;
  }
};

// Get thinking config based on model type
const getThinkingConfig = (
  model: string,
  thinkingLevel?: string,
  thinkingBudget?: number
): { thinkingLevel?: ThinkingLevel; thinkingBudget?: number } | undefined => {
  // Gemini 3 Flash Preview - uses ThinkingLevel (MINIMAL, LOW, MEDIUM, HIGH)
  if (model === MODEL_GEMINI_3_FLASH) {
    return { thinkingLevel: getThinkingLevel(thinkingLevel) };
  }

  // Gemini 3 Pro Preview - only LOW and HIGH
  if (model === MODEL_GEMINI_3_PRO) {
    const level =
      thinkingLevel === "LOW" ? ThinkingLevel.LOW : ThinkingLevel.HIGH;
    return { thinkingLevel: level };
  }

  // Gemini 2.5 Pro - uses thinkingBudget (128-32768)
  if (model === MODEL_GEMINI_25_PRO) {
    const budget = Math.max(128, Math.min(32768, thinkingBudget ?? 32768));
    return { thinkingBudget: budget };
  }

  // Gemini Flash Latest - uses thinkingBudget (0-24576)
  if (model === MODEL_GEMINI_FLASH) {
    const budget = Math.max(0, Math.min(24576, thinkingBudget ?? 24576));
    return { thinkingBudget: budget };
  }

  // Gemini Flash Lite Latest - uses thinkingBudget (0-24576), NO mediaResolution
  if (model === MODEL_GEMINI_FLASH_LITE) {
    const budget = Math.max(0, Math.min(24576, thinkingBudget ?? 24576));
    return { thinkingBudget: budget };
  }

  // Default fallback - use ThinkingLevel
  return { thinkingLevel: getThinkingLevel(thinkingLevel) };
};

// Check if model supports mediaResolution
const supportsMediaResolution = (model: string): boolean => {
  // Gemini Flash Lite does NOT support mediaResolution
  return model !== MODEL_GEMINI_FLASH_LITE;
};

// Map config string to MediaResolution enum
const getMediaResolution = (resolution?: string): MediaResolution => {
  switch (resolution) {
    case "MEDIA_RESOLUTION_LOW":
      return MediaResolution.MEDIA_RESOLUTION_LOW;
    case "MEDIA_RESOLUTION_MEDIUM":
      return MediaResolution.MEDIA_RESOLUTION_MEDIUM;
    case "MEDIA_RESOLUTION_HIGH":
      return MediaResolution.MEDIA_RESOLUTION_HIGH;
    case "MEDIA_RESOLUTION_UNSPECIFIED":
    default:
      return MediaResolution.MEDIA_RESOLUTION_MEDIUM;
  }
};

// Send message with streaming response (multi-turn)
export const sendChatMessage = async (
  messages: ChatMessage[],
  config: GeminiConfig,
  callbacks: StreamCallbacks,
  videoUrl?: string, // Video URL để nhét vào tin nhắn đầu tiên của user
  videoTimeRange?: VideoTimeRange // Khoảng thời gian video (x-y)
): Promise<void> => {
  if (!keyManager.hasAvailableKey()) {
    callbacks.onError(new Error("Thêm API key trong Cài đặt trước nhé"));
    return;
  }

  const ai = keyManager.getCurrentAI();
  if (!ai) {
    callbacks.onError(new Error("Không tìm thấy API key"));
    return;
  }

  // Build full conversation history for multi-turn
  const contents: Array<{
    role: "user" | "model";
    parts: Array<
      | { text: string }
      | {
          fileData: { fileUri: string; mimeType: string };
          videoMetadata?: { startOffset?: string; endOffset?: string };
        }
    >;
  }> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const parts: Array<
      | { text: string }
      | {
          fileData: { fileUri: string; mimeType: string };
          videoMetadata?: { startOffset?: string; endOffset?: string };
        }
    > = [];

    // Nếu là tin nhắn user và có video, nhét video vào
    if (msg.role === "user" && msg.hasVideo && videoUrl) {
      const normalizedUrl = normalizeYouTubeUrl(videoUrl);

      // Get time range from message or from parameter (for current message)
      const msgTimeRange =
        msg.videoTimeRange ||
        (i === messages.length - 1 ? videoTimeRange : undefined);

      // Build video part with optional time range (like geminiService)
      const videoPart: {
        fileData: { fileUri: string; mimeType: string };
        videoMetadata?: { startOffset?: string; endOffset?: string };
      } = {
        fileData: { fileUri: normalizedUrl, mimeType: "video/*" },
      };

      // Add videoMetadata if time range is specified
      if (msgTimeRange) {
        videoPart.videoMetadata = {
          startOffset: `${msgTimeRange.startTime}s`,
          endOffset: `${msgTimeRange.endTime}s`,
        };
      }

      parts.push(videoPart);
    }

    parts.push({ text: msg.content });

    contents.push({
      role: msg.role,
      parts,
    });
  }

  try {
    // Build config based on model capabilities
    const chatConfig: any = {
      temperature: config.temperature,
      systemInstruction: config.systemPrompt,
      thinkingConfig: getThinkingConfig(
        config.model,
        config.thinkingLevel,
        (config as any).thinkingBudget
      ),
    };

    // Only add mediaResolution if model supports it
    if (supportsMediaResolution(config.model)) {
      chatConfig.mediaResolution = getMediaResolution(config.mediaResolution);
    }

    // Dùng chats.create với sendMessage (non-streaming) theo docs
    const chat = ai.chats.create({
      model: config.model,
      config: chatConfig,
      history: contents.slice(0, -1), // Tất cả messages trừ cái cuối
    });

    // Lấy message cuối cùng để gửi
    const lastMessage = contents[contents.length - 1];

    const response = await chat.sendMessage({
      message: lastMessage.parts,
    });

    const fullText = response.text ?? "";

    if (fullText) {
      callbacks.onChunk(fullText);
      callbacks.onComplete(fullText);
    } else {
      callbacks.onError(new Error("Không nhận được phản hồi từ AI"));
    }
  } catch (error: any) {
    console.error("[ChatService] Error:", error);
    callbacks.onError(error);
  }
};
