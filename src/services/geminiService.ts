import { GoogleGenAI } from "@google/genai";
import { GeminiConfig } from "@utils/storage";

// Translate SRT content
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

// Extract video ID and convert to standard YouTube URL
const normalizeYouTubeUrl = (url: string): string => {
  let videoId = "";

  // Handle youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }

  // Handle youtube.com/watch?v=VIDEO_ID or m.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }

  // Handle youtube.com/shorts/VIDEO_ID
  const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) {
    videoId = shortsMatch[1];
  }

  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  // Return original if can't parse
  return url;
};

// Options for video translation
export interface VideoTranslateOptions {
  startOffset?: string; // e.g., "60s" or "1250s"
  endOffset?: string; // e.g., "120s" or "1570s"
}

// Translate video directly from YouTube URL
export const translateVideoWithGemini = async (
  videoUrl: string,
  config: GeminiConfig,
  onChunk?: (text: string) => void,
  options?: VideoTranslateOptions
): Promise<string> => {
  if (!config.apiKey) {
    throw new Error("Vui lòng cấu hình API Key trong cài đặt");
  }

  // Normalize YouTube URL
  const normalizedUrl = normalizeYouTubeUrl(videoUrl);

  console.log("[Gemini] Starting video translation...");
  console.log("[Gemini] Original URL:", videoUrl);
  console.log("[Gemini] Normalized URL:", normalizedUrl);
  console.log("[Gemini] Model:", config.model);

  const ai = new GoogleGenAI({
    apiKey: config.apiKey,
  });

  // Build video part with optional clipping metadata
  // As per Gemini docs: videoMetadata supports startOffset, endOffset for clipping
  const videoPart: any = {
    fileData: {
      fileUri: normalizedUrl,
      mimeType: "video/*",
    },
  };

  // Add video clipping if specified
  if (options?.startOffset || options?.endOffset) {
    videoPart.videoMetadata = {};
    if (options.startOffset) {
      videoPart.videoMetadata.startOffset = options.startOffset;
    }
    if (options.endOffset) {
      videoPart.videoMetadata.endOffset = options.endOffset;
    }
    console.log("[Gemini] Video clipping:", videoPart.videoMetadata);
  }

  // Use fileData with fileUri for YouTube URLs (as per Gemini docs)
  // Note: For YouTube URLs, mimeType should be "video/*"
  // Text prompt should be placed AFTER the video part for optimal results
  const contents = [
    {
      role: "user" as const,
      parts: [
        videoPart,
        {
          text: "Hãy tạo phụ đề SRT tiếng Việt cho video này.",
        },
      ],
    },
  ];

  console.log("[Gemini] Request contents:", JSON.stringify(contents, null, 2));

  try {
    // Try non-streaming first for debugging
    const response = await ai.models.generateContent({
      model: config.model,
      contents,
      config: {
        temperature: config.temperature,
        systemInstruction: config.systemPrompt,
      },
    });

    console.log("[Gemini] Response:", response);
    console.log("[Gemini] Response text:", response.text);

    const result = response.text || "";
    onChunk?.(result);
    return result;
  } catch (error: any) {
    console.error("[Gemini] Error:", error);
    console.error("[Gemini] Error message:", error.message);
    if (error.response) {
      console.error("[Gemini] Error response:", error.response);
    }
    throw error;
  }
};
