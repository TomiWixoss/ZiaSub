import * as Speech from "expo-speech";

export interface TTSSettings {
  enabled: boolean;
  rate: number; // 0.5 - 2.0, default 1.0
  pitch: number; // 0.5 - 2.0, default 1.0
  language: string; // default 'vi-VN'
  duckVideo: boolean; // Reduce video volume when speaking
  duckLevel: number; // Video volume when speaking (0-1)
  autoRate: boolean; // Auto adjust rate based on subtitle duration
}

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  enabled: false,
  rate: 1.0,
  pitch: 1.0,
  language: "vi-VN",
  duckVideo: false,
  duckLevel: 0.2,
  autoRate: true,
};

type TTSSpeakingCallback = (isSpeaking: boolean) => void;

// Clean text for TTS - remove special characters, keep only letters, numbers, spaces and basic punctuation
const cleanTextForTTS = (text: string): string => {
  return (
    text
      // Remove all special characters except letters, numbers, spaces, and basic punctuation (. , ? !)
      .replace(/[^\p{L}\p{N}\s.,?!]/gu, "")
      // Remove multiple spaces
      .replace(/\s+/g, " ")
      // Trim
      .trim()
  );
};

// Estimate speaking duration based on text length and rate
// Vietnamese TTS: ~3 characters per second at rate 1.0 (conservative estimate)
const estimateSpeakingDuration = (text: string, rate: number): number => {
  const charsPerSecond = 3 * rate;
  return text.length / charsPerSecond;
};

// Calculate optimal rate to fit text within duration
const calculateOptimalRate = (
  text: string,
  availableDuration: number,
  baseRate: number
): number => {
  if (availableDuration <= 0) return baseRate;

  // Leave 0.3s buffer for natural pause
  const effectiveDuration = Math.max(0.5, availableDuration - 0.3);
  const estimatedDuration = estimateSpeakingDuration(text, baseRate);

  if (estimatedDuration <= effectiveDuration) {
    return baseRate;
  }

  // Need to speed up - but cap at 1.3x for comprehension
  const requiredRate = baseRate * (estimatedDuration / effectiveDuration);
  return Math.min(1.3, Math.max(0.8, requiredRate));
};

class TTSService {
  private static instance: TTSService;
  private settings: TTSSettings = DEFAULT_TTS_SETTINGS;
  private currentSubtitleId: string = "";
  private speakingCallback: TTSSpeakingCallback | null = null;
  private isSpeakingNow: boolean = false;

  private constructor() {}

  static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  setSettings(settings: TTSSettings) {
    this.settings = settings;
  }

  getSettings(): TTSSettings {
    return this.settings;
  }

  setSpeakingCallback(callback: TTSSpeakingCallback | null) {
    this.speakingCallback = callback;
  }

  private notifySpeaking(speaking: boolean) {
    if (this.isSpeakingNow === speaking) return;
    this.isSpeakingNow = speaking;
    console.log("[TTS] Speaking:", speaking);
    this.speakingCallback?.(speaking);
  }

  speakSubtitle(
    text: string,
    subtitleId: string,
    availableDuration?: number
  ): void {
    if (!this.settings.enabled || !text.trim()) {
      return;
    }

    // Skip if same subtitle ID - check SYNCHRONOUSLY before any async
    if (subtitleId === this.currentSubtitleId) {
      return;
    }

    // Set ID IMMEDIATELY to prevent duplicate calls (race condition fix)
    this.currentSubtitleId = subtitleId;

    console.log(
      "[TTS] New subtitle:",
      subtitleId,
      "text:",
      text.substring(0, 30)
    );

    // Do the actual speaking asynchronously
    this.doSpeak(text, subtitleId, availableDuration);
  }

  private async doSpeak(
    text: string,
    subtitleId: string,
    availableDuration?: number
  ): Promise<void> {
    // Clean text for TTS
    const cleanedText = cleanTextForTTS(text);
    if (!cleanedText) {
      return;
    }

    // Stop current speech
    const wasSpeaking = await Speech.isSpeakingAsync();
    if (wasSpeaking) {
      await Speech.stop();
    }

    // Check if subtitle changed while we were stopping
    if (this.currentSubtitleId !== subtitleId) {
      return;
    }

    // Calculate rate
    let rate = this.settings.rate;
    if (this.settings.autoRate && availableDuration && availableDuration > 0) {
      rate = calculateOptimalRate(
        cleanedText,
        availableDuration,
        this.settings.rate
      );
      console.log(
        "[TTS] Auto rate:",
        rate.toFixed(2),
        "for duration:",
        availableDuration.toFixed(1)
      );
    }

    // Notify speaking started
    if (this.settings.duckVideo) {
      this.notifySpeaking(true);
    }

    Speech.speak(cleanedText, {
      language: this.settings.language,
      rate: rate,
      pitch: this.settings.pitch,
      onDone: () => {
        console.log("[TTS] Done speaking");
        if (this.settings.duckVideo) {
          this.notifySpeaking(false);
        }
      },
      onError: (error) => {
        console.log("[TTS] Error:", error);
        if (this.settings.duckVideo) {
          this.notifySpeaking(false);
        }
      },
      onStopped: () => {
        console.log("[TTS] Stopped (interrupted)");
        // Don't restore volume - new speech will handle it
      },
    });
  }

  async stop(): Promise<void> {
    const speaking = await Speech.isSpeakingAsync();
    if (speaking) {
      await Speech.stop();
    }
    if (this.settings.duckVideo) {
      this.notifySpeaking(false);
    }
  }

  async isSpeakingAsync(): Promise<boolean> {
    return Speech.isSpeakingAsync();
  }

  resetLastSpoken() {
    this.currentSubtitleId = "";
  }

  async getAvailableVoices() {
    return Speech.getAvailableVoicesAsync();
  }
}

export const ttsService = TTSService.getInstance();
