import { GoogleGenAI } from "@google/genai";
import { GeminiConfig } from "@utils/storage";

export const translateWithGemini = async (
  srtContent: string,
  config: GeminiConfig,
  onChunk?: (text: string) => void
): Promise<string> => {
  if (!config.apiKey) {
    throw new Error("Vui lòng cấu hình API Key trong cài đặt");
  }

  const ai = new GoogleGenAI({
    apiKey: config.apiKey,
  });

  const response = await ai.models.generateContentStream({
    model: config.model,
    contents: srtContent,
    config: {
      temperature: config.temperature,
      systemInstruction: config.systemPrompt,
    },
  });

  let fullText = "";

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) {
      fullText += text;
      onChunk?.(fullText);
    }
  }

  return fullText;
};

// Non-streaming version
export const translateWithGeminiSimple = async (
  srtContent: string,
  config: GeminiConfig
): Promise<string> => {
  if (!config.apiKey) {
    throw new Error("Vui lòng cấu hình API Key trong cài đặt");
  }

  const ai = new GoogleGenAI({
    apiKey: config.apiKey,
  });

  const response = await ai.models.generateContent({
    model: config.model,
    contents: srtContent,
    config: {
      temperature: config.temperature,
      systemInstruction: config.systemPrompt,
    },
  });

  return response.text || "";
};

// Translate video directly from YouTube URL
export const translateVideoWithGemini = async (
  videoUrl: string,
  config: GeminiConfig,
  onChunk?: (text: string) => void
): Promise<string> => {
  if (!config.apiKey) {
    throw new Error("Vui lòng cấu hình API Key trong cài đặt");
  }

  const ai = new GoogleGenAI({
    apiKey: config.apiKey,
  });

  const response = await ai.models.generateContentStream({
    model: config.model,
    contents: [
      {
        role: "user",
        parts: [
          {
            fileData: {
              fileUri: videoUrl,
              mimeType: "video/*",
            },
          },
          {
            text: "Hãy tạo phụ đề SRT cho video này.",
          },
        ],
      },
    ],
    config: {
      temperature: config.temperature,
      systemInstruction: config.systemPrompt,
    },
  });

  let fullText = "";

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) {
      fullText += text;
      onChunk?.(fullText);
    }
  }

  return fullText;
};
