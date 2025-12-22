// Message types for extension communication
import type { SubtitleItem } from "@ziasub/shared";

export type MessageType =
  | { type: "SET_SUBTITLES"; subtitles: SubtitleItem[] }
  | { type: "CLEAR_SUBTITLES" }
  | { type: "GET_SUBTITLES" };

export interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}
