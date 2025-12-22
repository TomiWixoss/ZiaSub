// Message types for extension communication
export interface SubtitleData {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export type MessageType =
  | { type: "SET_SUBTITLES"; subtitles: SubtitleData[] }
  | { type: "CLEAR_SUBTITLES" }
  | { type: "GET_SUBTITLES" }
  | { type: "SUBTITLES_LOADED"; count: number };

export interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}
