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
  presubConfigId?: string; // ID of Gemini config to use for presub (first batch)
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
  updatedAt?: number;
  configName: string;
  presetId?: string; // ID of preset prompt used for translation
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
  presetId?: string; // ID of preset prompt used
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
  // ID of existing translation to update (instead of creating new)
  existingTranslationId?: string;
  // Batch retranslation mode
  retranslateBatchIndex?: number;
  retranslateMode?: "single" | "fromHere";
  // Flag to indicate batch retranslation (don't save partial on abort)
  isBatchRetranslation?: boolean;
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

// Thinking Level options for AI reasoning (Gemini 3 Flash Preview, Gemini 3 Pro)
export type ThinkingLevelType = "MINIMAL" | "LOW" | "MEDIUM" | "HIGH";

// Model-specific thinking config types
export type ThinkingConfigType =
  | { type: "level"; level: ThinkingLevelType } // Gemini 3 Flash Preview (MINIMAL, LOW, MEDIUM, HIGH)
  | { type: "level_limited"; level: "LOW" | "HIGH" } // Gemini 3 Pro (only LOW, HIGH)
  | { type: "budget"; budget: number }; // Gemini 2.5 Pro (128-32768), Flash/Flash Lite (0-24576)

export interface GeminiConfig {
  id: string;
  name: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  mediaResolution?: MediaResolutionType;
  // Legacy field - kept for backward compatibility
  thinkingLevel?: ThinkingLevelType;
  // New model-specific thinking config
  thinkingBudget?: number; // For models using budget (Gemini 2.5 Pro, Flash, Flash Lite)
  presetId?: string; // ID of preset prompt to use instead of systemPrompt
}

// ============================================
// CHAT TYPES
// ============================================
export interface VideoTimeRange {
  startTime: number; // seconds
  endTime: number; // seconds
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
  hasVideo?: boolean;
  videoTitle?: string;
  videoTimeRange?: VideoTimeRange;
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
export type QueueStatus =
  | "pending"
  | "translating"
  | "paused"
  | "completed"
  | "error";

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
  presetId?: string; // ID of preset prompt used for translation
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
  // ID of saved translation to update when resuming (instead of creating new)
  savedTranslationId?: string;
  // Batch retranslation mode
  retranslateBatchIndex?: number; // Index of batch being retranslated
  retranslateMode?: "single" | "fromHere"; // single = only this batch, fromHere = this batch and all after
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
// NOTIFICATION SETTINGS
// ============================================
export interface NotificationSettings {
  enabled: boolean; // Bật/tắt thông báo chung
  // Nguồn thông báo
  fromQueue: boolean; // Thông báo từ Queue
  fromDirect: boolean; // Thông báo từ dịch trực tiếp (TranslationManager)
  // Loại thông báo
  onComplete: boolean; // Thông báo khi dịch xong
  onBatchComplete: boolean; // Thông báo khi dịch xong từng phần
  onError: boolean; // Thông báo khi lỗi
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
  notification: NotificationSettings;
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
  // Presub config - use different config for first batch (when presubMode is enabled)
  presubConfig?: GeminiConfig;
}
