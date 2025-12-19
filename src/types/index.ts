// ============================================
// SUBTITLE TYPES
// ============================================
export interface SubtitleItem {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface SubtitleSettings {
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  portraitBottom: number;
  landscapeBottom: number;
}

// ============================================
// BATCH & TRANSLATION TYPES
// ============================================
export interface BatchSettings {
  maxVideoDuration: number;
  maxConcurrentBatches: number;
  batchOffset: number;
  streamingMode: boolean;
  presubMode: boolean;
  presubDuration: number;
}

export interface BatchProgress {
  totalBatches: number;
  completedBatches: number;
  currentBatch: number;
  status: "pending" | "processing" | "completed" | "error";
  batchStatuses: Array<"pending" | "processing" | "completed" | "error">;
}

export interface SavedTranslation {
  id: string;
  srtContent: string;
  createdAt: number;
  configName: string;
}

export interface VideoTranslations {
  videoUrl: string;
  translations: SavedTranslation[];
  activeTranslationId: string | null;
}

export interface TranslationJob {
  id: string;
  videoUrl: string;
  configName: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: BatchProgress | null;
  keyStatus: string | null;
  result: string | null;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
  partialResult: string | null;
  rangeStart?: number;
  rangeEnd?: number;
}

// ============================================
// TTS TYPES
// ============================================
export interface TTSSettings {
  enabled: boolean;
  rate: number;
  pitch: number;
  language: string;
  duckVideo: boolean;
  duckLevel: number;
  autoRate: boolean;
}

// ============================================
// API & GEMINI TYPES
// ============================================
export interface ApiKeysSettings {
  keys: string[];
}

export interface GeminiConfig {
  id: string;
  name: string;
  model: string;
  temperature: number;
  systemPrompt: string;
}

// ============================================
// CHAT TYPES
// ============================================
export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
  hasVideo?: boolean;
  videoTitle?: string;
}

export interface StoredChatMessage extends ChatMessage {
  videoUrl?: string;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: StoredChatMessage[];
  configId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ChatHistory {
  messages: StoredChatMessage[];
  lastConfigId: string | null;
  videoUrl: string | null;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

// ============================================
// QUEUE TYPES
// ============================================
export type QueueStatus = "pending" | "translating" | "completed" | "error";

export interface QueueItem {
  id: string;
  videoUrl: string;
  videoId: string;
  title: string;
  thumbnail: string;
  duration?: number;
  status: QueueStatus;
  configName?: string;
  progress?: { completed: number; total: number };
  error?: string;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
}

// ============================================
// APP SETTINGS TYPES
// ============================================
export interface AppSettings {
  subtitle: SubtitleSettings;
  batch: BatchSettings;
  apiKeys: ApiKeysSettings;
  tts: TTSSettings;
}

// ============================================
// VIDEO TRANSLATE OPTIONS
// ============================================
export type KeyStatusCallback = (status: {
  currentKey: number;
  totalKeys: number;
  message: string;
}) => void;

export interface VideoTranslateOptions {
  startOffset?: string;
  endOffset?: string;
  videoDuration?: number;
  batchSettings?: BatchSettings;
  onBatchProgress?: (progress: BatchProgress) => void;
  onKeyStatus?: KeyStatusCallback;
  rangeStart?: number;
  rangeEnd?: number;
  onBatchComplete?: (
    partialSrt: string,
    batchIndex: number,
    totalBatches: number
  ) => void;
}
