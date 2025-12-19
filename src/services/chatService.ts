import { GoogleGenAI } from "@google/genai";
import { GeminiConfig } from "@utils/storage";
import { keyManager } from "./keyManager";

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
  hasVideo?: boolean; // Flag nếu tin nhắn có kèm video
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

// Normalize YouTube URL
const normalizeYouTubeUrl = (url: string): string => {
  let videoId = "";
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) videoId = shortMatch[1];
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) videoId = watchMatch[1];
  const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) videoId = shortsMatch[1];
  if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  return url;
};

// Send message with streaming response (multi-turn)
export const sendChatMessage = async (
  messages: ChatMessage[],
  config: GeminiConfig,
  callbacks: StreamCallbacks,
  videoUrl?: string // Video URL để nhét vào tin nhắn đầu tiên của user
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
      { text: string } | { fileData: { fileUri: string; mimeType: string } }
    >;
  }> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const parts: Array<
      { text: string } | { fileData: { fileUri: string; mimeType: string } }
    > = [];

    // Nếu là tin nhắn user đầu tiên và có video, nhét video vào
    if (msg.role === "user" && msg.hasVideo && videoUrl) {
      const normalizedUrl = normalizeYouTubeUrl(videoUrl);
      parts.push({
        fileData: { fileUri: normalizedUrl, mimeType: "video/*" },
      });
    }

    parts.push({ text: msg.content });

    contents.push({
      role: msg.role,
      parts,
    });
  }

  try {
    const response = await ai.models.generateContentStream({
      model: config.model,
      contents,
      config: {
        temperature: config.temperature,
        systemInstruction: config.systemPrompt,
      },
    });

    let fullText = "";
    for await (const chunk of response) {
      const text = chunk.text || "";
      fullText += text;
      callbacks.onChunk(fullText);
    }
    callbacks.onComplete(fullText);
  } catch (error: any) {
    console.error("[ChatService] Error:", error);
    callbacks.onError(error);
  }
};
