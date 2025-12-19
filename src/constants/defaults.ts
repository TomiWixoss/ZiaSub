import type {
  SubtitleSettings,
  BatchSettings,
  TTSSettings,
  ApiKeysSettings,
  AppSettings,
} from "@src/types";

// ============================================
// DEFAULT SUBTITLE SETTINGS
// ============================================
export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  fontSize: 15,
  fontWeight: "bold",
  fontStyle: "normal",
  portraitBottom: 100,
  landscapeBottom: 8,
};

// ============================================
// DEFAULT BATCH SETTINGS
// ============================================
export const DEFAULT_BATCH_SETTINGS: BatchSettings = {
  maxVideoDuration: 600, // 10 minutes
  maxConcurrentBatches: 2,
  batchOffset: 60, // 1 minute tolerance
  streamingMode: false,
  presubMode: false,
  presubDuration: 120, // 2 minutes
};

// ============================================
// DEFAULT TTS SETTINGS
// ============================================
export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  enabled: false,
  rate: 1.0,
  pitch: 1.0,
  language: "vi-VN",
  duckVideo: false,
  duckLevel: 0.2,
  autoRate: true,
};

// ============================================
// DEFAULT API KEYS SETTINGS
// ============================================
export const DEFAULT_API_KEYS_SETTINGS: ApiKeysSettings = {
  keys: [],
};

// ============================================
// DEFAULT APP SETTINGS
// ============================================
export const DEFAULT_APP_SETTINGS: AppSettings = {
  subtitle: DEFAULT_SUBTITLE_SETTINGS,
  batch: DEFAULT_BATCH_SETTINGS,
  apiKeys: DEFAULT_API_KEYS_SETTINGS,
  tts: DEFAULT_TTS_SETTINGS,
};

// ============================================
// DEFAULT GEMINI SYSTEM PROMPT
// ============================================
export const DEFAULT_SYSTEM_PROMPT = `You are an expert translator and subtitler. Your task is to watch the video, listen to all spoken content, and create accurate Vietnamese SRT subtitles.

Critical Rules:
1. Natural Translation: Translate into natural, fluent Vietnamese that matches the video's tone and context.
2. Accuracy: Capture the meaning faithfully while adapting expressions to sound natural in Vietnamese.
3. Timing: Ensure subtitle timing matches the audio precisely.
4. Formatting: Use parentheses ( ) for non-dialogue elements like sound effects, music descriptions, or on-screen text.
5. Line Limit: Each subtitle block must have a maximum of 2 lines for readability.
6. Strict SRT Output: Output ONLY raw SRT content with no additional commentary or explanations.`;

// ============================================
// DEFAULT CHAT CONFIG ID
// ============================================
export const DEFAULT_CHAT_CONFIG_ID = "default-chat-config";
