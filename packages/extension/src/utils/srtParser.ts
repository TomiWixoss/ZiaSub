// Simplified SRT parser for extension (standalone, no external deps)
export interface SubtitleItem {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * Converts SRT timestamp (00:00:00,000) to seconds.
 */
export const timeToSeconds = (timeString: string): number => {
  const parts = timeString.split(":");
  const secondsParts = parts[2].split(/[,\.]/);

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = parseInt(secondsParts[1], 10);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

/**
 * Parses SRT string into an array of subtitle objects.
 */
export const parseSRT = (data: string): SubtitleItem[] => {
  if (!data) return [];

  // Normalize line endings
  data = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const regex =
    /(\d+)\n(\d{2}:\d{2}:\d{2}[,\.]\d{3}) --> (\d{2}:\d{2}:\d{2}[,\.]\d{3})\n([\s\S]*?)(?=\n\n|\n*$)/g;
  const items: SubtitleItem[] = [];
  let match;

  while ((match = regex.exec(data)) !== null) {
    items.push({
      id: match[1],
      startTime: timeToSeconds(match[2]),
      endTime: timeToSeconds(match[3]),
      text: match[4].trim(),
    });
  }

  return items;
};
