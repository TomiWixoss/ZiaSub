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
export const timeToSeconds = (timeString: string): number => {
  const parts = timeString.split(":");
  const secondsParts = parts[2].split(",");

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = parseInt(secondsParts[1], 10);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

/**
 * Converts seconds to SRT timestamp (00:00:00,000).
 */
export const secondsToSrtTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
};

/**
 * Fix malformed SRT from Gemini (missing newlines between entries).
 */
const fixMalformedSrt = (content: string): string => {
  if (!content) return "";

  // Pattern: number followed immediately by timestamp (no newline)
  // e.g., "1000:10:13,400" should be "100\n00:10:13,400"
  // Match: digit(s) followed by HH:MM:SS pattern
  let fixed = content.replace(
    /(\d+)((?:\d{2}):(?:\d{2}):(?:\d{2})[,.](?:\d{3})\s*-->)/g,
    "$1\n$2"
  );

  // Also fix timestamp followed immediately by next entry number
  // e.g., "00:10:14,900Text here200:10:15" -> add newlines
  fixed = fixed.replace(
    /((?:\d{2}):(?:\d{2}):(?:\d{2})[,.](?:\d{3}))\s*(\d+)((?:\d{2}):(?:\d{2}):(?:\d{2})[,.](?:\d{3}))/g,
    "$1\n\n$2\n$3"
  );

  return fixed;
};

/**
 * Parse SRT content into raw subtitle entries (for merging).
 */
export const parseSrtRaw = (
  content: string
): Array<{ start: number; end: number; text: string }> => {
  const subtitles: Array<{ start: number; end: number; text: string }> = [];
  if (!content) return subtitles;

  // First fix malformed SRT and apply standard fixes
  let fixedContent = fixMalformedSrt(content);
  const { fixedData } = fixSRT(fixedContent);
  fixedContent = fixedData;

  const lines = fixedContent.trim().split("\n");
  let i = 0;

  while (i < lines.length) {
    if (!lines[i]?.trim()) {
      i++;
      continue;
    }

    if (/^\d+$/.test(lines[i].trim())) {
      const timestampLine = lines[i + 1];
      if (!timestampLine) {
        i++;
        continue;
      }

      const timestampMatch = timestampLine.match(
        /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
      );

      if (timestampMatch) {
        const start = timeToSeconds(timestampMatch[1]);
        const end = timeToSeconds(timestampMatch[2]);

        const textLines: string[] = [];
        i += 2;
        while (
          i < lines.length &&
          lines[i]?.trim() &&
          !/^\d+$/.test(lines[i].trim())
        ) {
          textLines.push(lines[i]);
          i++;
        }

        subtitles.push({ start, end, text: textLines.join("\n") });
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return subtitles;
};

/**
 * Detect if SRT timestamps are relative (starting from 0) or absolute.
 */
export const detectTimestampMode = (
  subtitles: Array<{ start: number; end: number; text: string }>,
  expectedOffset: number
): "relative" | "absolute" => {
  if (subtitles.length === 0) return "relative";

  const firstStart = subtitles[0].start;
  const tolerance = 30;

  if (firstStart < tolerance) return "relative";
  if (Math.abs(firstStart - expectedOffset) < tolerance) return "absolute";

  return "relative";
};

/**
 * Adjust SRT timestamps if they start from 0 instead of expected offset.
 * Used when AI returns relative timestamps for a custom range translation.
 */
export const adjustSrtTimestamps = (
  content: string,
  expectedOffset: number
): string => {
  if (!content || expectedOffset <= 0) return content;

  const subtitles = parseSrtRaw(content);
  if (subtitles.length === 0) return content;

  const mode = detectTimestampMode(subtitles, expectedOffset);
  console.log(
    `[SRT] Adjust timestamps: expectedOffset=${expectedOffset}s, mode=${mode}, subtitles=${subtitles.length}`
  );

  // If already absolute (timestamps match expected offset), return as-is
  if (mode === "absolute") return content;

  // Timestamps are relative (starting from 0), need to add offset
  const lines: string[] = [];
  subtitles.forEach((sub, index) => {
    lines.push((index + 1).toString());
    lines.push(
      `${secondsToSrtTime(sub.start + expectedOffset)} --> ${secondsToSrtTime(
        sub.end + expectedOffset
      )}`
    );
    lines.push(sub.text);
    lines.push("");
  });

  return lines.join("\n");
};

/**
 * Merge multiple SRT contents with smart time offset adjustment.
 * If offsetSeconds is -1, the content already has absolute timestamps and should not be adjusted.
 */
export const mergeSrtContents = (
  srtParts: { content: string; offsetSeconds: number }[]
): string => {
  const allSubtitles: Array<{ start: number; end: number; text: string }> = [];

  for (const part of srtParts) {
    const subtitles = parseSrtRaw(part.content);

    // offsetSeconds === -1 means content already has absolute timestamps (e.g., from resume)
    if (part.offsetSeconds === -1) {
      console.log(
        `[Merge] Part with absolute timestamps (resume), subtitles=${subtitles.length}`
      );
      for (const sub of subtitles) {
        allSubtitles.push(sub);
      }
      continue;
    }

    const mode = detectTimestampMode(subtitles, part.offsetSeconds);

    console.log(
      `[Merge] Part offset=${part.offsetSeconds}s, mode=${mode}, subtitles=${subtitles.length}`
    );

    for (const sub of subtitles) {
      if (mode === "relative") {
        allSubtitles.push({
          start: sub.start + part.offsetSeconds,
          end: sub.end + part.offsetSeconds,
          text: sub.text,
        });
      } else {
        allSubtitles.push(sub);
      }
    }
  }

  allSubtitles.sort((a, b) => a.start - b.start);

  // Remove duplicates
  const uniqueSubtitles: typeof allSubtitles = [];
  for (const sub of allSubtitles) {
    const isDuplicate = uniqueSubtitles.some(
      (existing) =>
        Math.abs(existing.start - sub.start) < 0.5 &&
        existing.text.trim() === sub.text.trim()
    );
    if (!isDuplicate) {
      uniqueSubtitles.push(sub);
    }
  }

  // Build final SRT
  const lines: string[] = [];
  uniqueSubtitles.forEach((sub, index) => {
    lines.push((index + 1).toString());
    lines.push(
      `${secondsToSrtTime(sub.start)} --> ${secondsToSrtTime(sub.end)}`
    );
    lines.push(sub.text);
    lines.push("");
  });

  return lines.join("\n");
};
