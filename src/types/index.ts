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

export type BatchStatus = "pending" | "completed" | "error";

export interface SavedTranslation {
  id: string;
  srtContent: string;
  createdAt: number;
  configName: string;
  // Partial translation support
  isPartial?: boolean;
  completedBatches?: number;
  totalBatches?: number;
  rangeStart?: number;
  rangeEnd?: number;
  videoDuration?: number;
  batchSettings?: Partial<BatchSettings>;
  // Batch status tracking - array of status for each batch index
  // e.g., ["completed", "completed", "pending"] means batch 0,1 done, batch 2 pending
  batchStatuses?: BatchStatus[];
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
  configId?: string;
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
  // Resume support
  videoDuration?: number;
  batchSettings?: BatchSettings;
  completedBatchRanges?: Array<{ start: number; end: number }>;
  // Track status of each batch
  batchStatuses?: BatchStatus[];
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

// Media Resolution options for video processing
export type MediaResolutionType =
  | "MEDIA_RESOLUTION_UNSPECIFIED"
  | "MEDIA_RESOLUTION_LOW"
  | "MEDIA_RESOLUTION_MEDIUM"
  | "MEDIA_RESOLUTION_HIGH";

// Thinking Level options for AI reasoning
export type ThinkingLevelType = "MINIMAL" | "LOW" | "MEDIUM" | "HIGH";

export interface GeminiConfig {
  id: string;
  name: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  mediaResolution?: MediaResolutionType;
  thinkingLevel?: ThinkingLevelType;
  presetId?: string; // ID of preset prompt to use instead of systemPrompt
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
  configId?: string;
  progress?: { completed: number; total: number };
  error?: string;
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
  // Resume support - partial translation data
  partialSrt?: string;
  completedBatches?: number;
  totalBatches?: number;
  completedBatchRanges?: Array<{ start: number; end: number }>;
  batchSettings?: BatchSettings;
}

// ============================================
// FLOATING UI SETTINGS
// ============================================
export type FloatingUIPosition = "left" | "right";
export type FloatingUILayout = "vertical" | "horizontal";

export interface FloatingUISettings {
  bottomOffset: number; // Khoảng cách từ đáy màn hình (px)
  bottomOffsetVideo: number; // Khoảng cách khi đang xem video
  sideOffset: number; // Khoảng cách từ cạnh trái/phải (px)
  position: FloatingUIPosition; // Vị trí: trái hoặc phải
  layout: FloatingUILayout; // Bố cục: dọc hoặc ngang
}

// ============================================
// APP SETTINGS TYPES
// ============================================
export interface AppSettings {
  subtitle: SubtitleSettings;
  batch: BatchSettings;
  apiKeys: ApiKeysSettings;
  tts: TTSSettings;
  floatingUI: FloatingUISettings;
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
  abortSignal?: AbortSignal;
  onBatchComplete?: (
    partialSrt: string,
    batchIndex: number,
    totalBatches: number,
    completedRanges: Array<{ start: number; end: number }>
  ) => void;
  // Resume support - skip already completed ranges
  skipRanges?: Array<{ start: number; end: number }>;
  // Existing partial SRT to merge with new results (for resume)
  existingPartialSrt?: string;
  // Skip automatic timestamp adjustment (caller will handle it)
  skipTimestampAdjust?: boolean;
}
