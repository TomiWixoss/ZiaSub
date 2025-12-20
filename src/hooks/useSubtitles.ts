/**
 * Hook for managing subtitles
 */
import { useState, useCallback, useRef, useEffect } from "react";
import type { SubtitleItem, TTSSettings } from "@src/types";
import { parseSRT, fixSRT } from "@utils/srtParser";
import {
  saveSRT,
  getSRT,
  removeSRT,
  getActiveTranslation,
} from "@utils/storage";
import { ttsService } from "@services/ttsService";
import { WebView } from "react-native-webview";

interface UseSubtitlesOptions {
  webViewRef: React.RefObject<WebView | null>;
  ttsSettings: TTSSettings;
}

export const useSubtitles = ({
  webViewRef,
  ttsSettings,
}: UseSubtitlesOptions) => {
  const [srtContent, setSrtContent] = useState("");
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const lastSentSubtitleRef = useRef<string>("");

  // Load saved SRT for a video URL
  const loadSavedSRT = useCallback(
    async (url: string) => {
      if (!url) {
        setSrtContent("");
        setSubtitles([]);
        setCurrentSubtitle("");
        lastSentSubtitleRef.current = "";
        if (webViewRef.current) {
          webViewRef.current.postMessage(
            JSON.stringify({ type: "setSubtitle", payload: "" })
          );
        }
        return;
      }

      // First check manual SRT
      let srt = await getSRT(url);

      // If no manual SRT, check for active translation
      if (!srt) {
        const activeTranslation = await getActiveTranslation(url);
        if (activeTranslation) {
          srt = activeTranslation.srtContent;
        }
      }

      if (srt) {
        setSrtContent(srt);
        const { fixedData } = fixSRT(srt);
        const parsed = parseSRT(fixedData);
        setSubtitles(parsed);
        lastSentSubtitleRef.current = "";
        // Auto-apply subtitles when loaded
        if (webViewRef.current && parsed.length > 0) {
          // Subtitles will be shown when video plays and findSubtitle is called
        }
      } else {
        setSrtContent("");
        setSubtitles([]);
        setCurrentSubtitle("");
        lastSentSubtitleRef.current = "";
        if (webViewRef.current) {
          webViewRef.current.postMessage(
            JSON.stringify({ type: "setSubtitle", payload: "" })
          );
        }
      }
    },
    [webViewRef]
  );

  // Apply SRT content and save
  const applySrtContent = useCallback(
    async (content: string, videoUrl: string) => {
      const { fixedData, fixCount } = fixSRT(content);
      const parsed = parseSRT(fixedData);
      setSubtitles(parsed);
      setSrtContent(fixedData);
      lastSentSubtitleRef.current = "";

      if (videoUrl) {
        if (fixedData) {
          await saveSRT(videoUrl, fixedData);
        } else {
          await removeSRT(videoUrl);
        }
      }

      return { fixCount, parsed };
    },
    []
  );

  // Find and display subtitle for current time
  const findSubtitle = useCallback(
    (seconds: number) => {
      const sub = subtitles.find(
        (s) => seconds >= s.startTime && seconds <= s.endTime
      );
      const text = sub ? sub.text : "";
      const subtitleId = sub ? `${sub.startTime}-${sub.endTime}` : "";

      const shouldSend =
        text !== currentSubtitle ||
        (subtitles.length > 0 && text && lastSentSubtitleRef.current !== text);

      if (shouldSend) {
        setCurrentSubtitle(text);
        lastSentSubtitleRef.current = text;

        // TTS: Speak the subtitle if enabled
        if (ttsSettings.enabled && text && sub) {
          const availableDuration = sub.endTime - seconds;
          ttsService.speakSubtitle(text, subtitleId, availableDuration);
        }

        // Send subtitle to WebView (hide text if TTS enabled)
        if (webViewRef.current) {
          webViewRef.current.postMessage(
            JSON.stringify({
              type: "setSubtitle",
              payload: ttsSettings.enabled ? "" : text,
            })
          );
        }
      }
    },
    [subtitles, currentSubtitle, ttsSettings.enabled, webViewRef]
  );

  // Update subtitles from translation result
  const updateFromTranslation = useCallback((srt: string) => {
    setSrtContent(srt);
    const { fixedData } = fixSRT(srt);
    const parsed = parseSRT(fixedData);
    setSubtitles(parsed);
    lastSentSubtitleRef.current = "";
  }, []);

  return {
    srtContent,
    setSrtContent,
    subtitles,
    currentSubtitle,
    loadSavedSRT,
    applySrtContent,
    findSubtitle,
    updateFromTranslation,
    hasSubtitles: subtitles.length > 0,
  };
};
