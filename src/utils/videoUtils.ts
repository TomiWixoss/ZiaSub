/**
 * Video utility functions
 */

/**
 * Extract video ID from various YouTube URL formats
 */
export const extractVideoId = (url: string): string | null => {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /[?&]v=([a-zA-Z0-9_-]+)/,
    /\/shorts\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

/**
 * Normalize YouTube URL to standard watch format
 */
export const normalizeYouTubeUrl = (url: string): string => {
  const videoId = extractVideoId(url);
  if (videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  return url;
};

/**
 * Get thumbnail URL from video ID
 */
export const getThumbnailUrl = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};

/**
 * Format duration in seconds to mm:ss
 */
export const formatDuration = (seconds?: number): string => {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/**
 * Format timestamp to readable date
 */
export const formatDate = (timestamp?: number): string => {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

/**
 * Parse time string (mm:ss) to seconds
 */
export const parseTime = (timeStr: string): number | null => {
  const parts = timeStr.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1 && !isNaN(parts[0])) {
    return parts[0];
  }
  return null;
};

/**
 * Check if URL is a YouTube watch/shorts page
 */
export const isVideoPage = (url: string): boolean => {
  return url.includes("/watch") || url.includes("/shorts/");
};
