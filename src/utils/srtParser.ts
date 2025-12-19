export interface SubtitleItem {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * Parses SRT string into an array of subtitle objects.
 * @param {string} data - The raw SRT string.
 * @returns {Array} - Array of { id, startTime, endTime, text }
 */
export const parseSRT = (data: string): SubtitleItem[] => {
  if (!data) return [];

  // 1. Auto-fix format before parsing
  const { fixedData } = fixSRT(data);
  data = fixedData;

  // Chuẩn hóa dòng mới
  data = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const regex =
    /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n|\n*$)/g;
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

/**
 * Fixes common SRT time format errors.
 */
export const fixSRT = (
  data: string
): { fixedData: string; fixCount: number } => {
  if (!data) return { fixedData: "", fixCount: 0 };

  const lines = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const fixedLines: string[] = [];
  let fixCount = 0;

  const timePattern = /^(.+?)\s*-->\s*(.+?)$/;

  for (let line of lines) {
    const match = line.match(timePattern);
    if (match) {
      const start = match[1].trim();
      const end = match[2].trim();

      const fixedStart = fixTimeFormat(start);
      const fixedEnd = fixTimeFormat(end);

      if (fixedStart !== start || fixedEnd !== end) {
        fixCount++;
        fixedLines.push(`${fixedStart} --> ${fixedEnd}`);
      } else {
        fixedLines.push(line);
      }
    } else {
      fixedLines.push(line);
    }
  }

  return { fixedData: fixedLines.join("\n"), fixCount };
};

const fixTimeFormat = (timeStr: string): string => {
  timeStr = timeStr.trim();

  const patterns = [
    // 1. MM:SS,mmm -> 00:MM:SS,mmm
    {
      regex: /^(\d{1,2}):(\d{2}),(\d{3})$/,
      replace: (_: string, m1: string, m2: string, m3: string) =>
        `00:${m1.padStart(2, "0")}:${m2},${m3}`,
    },
    // 2. H:MM:mmm -> 0H:MM,mmm
    {
      regex: /^(\d):(\d{2}):(\d{3})$/,
      replace: (_: string, m1: string, m2: string, m3: string) =>
        `00:0${m1}:${m2},${m3}`,
    },
    // 3. HH:MM:mmm -> 00:HH:MM,mmm (Wait, logic in python was 00:HH:MM,mmm for HH:MM:mmm input?)
    // Python Pattern 3: r'^(\d{2}):(\d{2}):(\d{3})$' -> f'00:{m.group(1)}:{m.group(2)},{m.group(3)}'
    // This interprets input HH:MM:mmm as MM:SS:mmm? No, Python code says "HH:MM:mmm".
    // If input is 12:34:567. Output 00:12:34,567. So it treats input HH as MM?
    // Let's stick to Python logic: Input 2 parts separated by colon + 3 digits.
    {
      regex: /^(\d{2}):(\d{2}):(\d{3})$/,
      replace: (_: string, m1: string, m2: string, m3: string) =>
        `00:${m1}:${m2},${m3}`,
    },

    // 4. H:MM,mmm -> 00:0H:MM,mmm
    {
      regex: /^(\d):(\d{2}),(\d{3})$/,
      replace: (_: string, m1: string, m2: string, m3: string) =>
        `00:0${m1}:${m2},${m3}`,
    },

    // 5. 00:0MM,mmm -> 00:MM,mmm
    {
      regex: /^(\d{2}):0(\d{1}),(\d{3})$/,
      replace: (_: string, m1: string, m2: string, m3: string) =>
        `${m1}:0${m2},${m3}`,
    },

    // 6. 00:0MM:mmm -> 00:MM,mmm
    {
      regex: /^(\d{2}):0(\d{1}):(\d{3})$/,
      replace: (_: string, m1: string, m2: string, m3: string) =>
        `${m1}:0${m2},${m3}`,
    },

    // 7. 00:MMM,mmm -> 00:0M:MM,mmm
    {
      regex: /^(\d{2}):(\d{3}),(\d{3})$/,
      replace: (_: string, m1: string, m2: string, m3: string) =>
        `${m1}:0${m2[0]}:${m2.slice(1)},${m3}`,
    },

    // 8. 00:MMM:mmm -> 00:0M:MM,mmm
    {
      regex: /^(\d{2}):(\d{3}):(\d{3})$/,
      replace: (_: string, m1: string, m2: string, m3: string) =>
        `${m1}:0${m2[0]}:${m2.slice(1)},${m3}`,
    },
  ];

  for (let { regex, replace } of patterns) {
    if (regex.test(timeStr)) {
      const fixed = timeStr.replace(regex, replace as any);
      if (validateTimeFormat(fixed)) return fixed;
    }
  }

  if (validateTimeFormat(timeStr)) return timeStr;
  return timeStr;
};

const validateTimeFormat = (timeStr: string): boolean => {
  // HH:MM:SS,mmm
  const regex = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/;
  const match = timeStr.match(regex);
  if (!match) return false;

  // match[0] is full string
  // Actually map(Number) on match array works but index 0 is string.
  // Let's parse manually to be safe
  const hNum = parseInt(match[1], 10);
  const mNum = parseInt(match[2], 10);
  const sNum = parseInt(match[3], 10);
  const msNum = parseInt(match[4], 10);

  return hNum <= 99 && mNum <= 59 && sNum <= 59 && msNum <= 999;
};

/**
 * Converts SRT timestamp (00:00:00,000) to seconds.
 */
const timeToSeconds = (timeString: string): number => {
  const parts = timeString.split(":");
  const secondsParts = parts[2].split(",");

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = parseInt(secondsParts[1], 10);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};
