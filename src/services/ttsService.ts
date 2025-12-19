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
  duckVideo: true,
  duckLevel: 0.2,
  autoRate: true,
};

type TTSStatusCallback = (isSpeaking: boolean) => void;
type TTSSpeakingCallback = (isSpeaking: boolean) => void;

// Estimate speaking duration based on text length and rate
// Vietnamese: ~4-5 characters per second at rate 1.0
const estimateSpeakingDuration = (text: string, rate: number): number => {
  const charsPerSecond = 5 * rate;
  return text.length / charsPerSecond;
};

// Calculate optimal rate to fit text within duration
const calculateOptimalRate = (
  text: string,
  availableDuration: number,
  baseRate: number
): number => {
  if (availableDuration <= 0) return baseRate;

  const estimatedDuration = estimateSpeakingDuration(text, baseRate);

  if (estimatedDuration <= availableDuration) {
    // Text fits within time, use base rate
    return baseRate;
  }

  // Need to speed up - calculate required rate
  // rate = baseRate * (estimatedDuration / availableDuration)
  const requiredRate = baseRate * (estimatedDuration / availableDuration);

  // Clamp between 0.8 and 2.0 (don't go too slow or too fast)
  return Math.min(2.0, Math.max(0.8, requiredRate));
};

class TTSService {
  private static instance: TTSService;
  private settings: TTSSettings = DEFAULT_TTS_SETTINGS;
  private lastSpokenText: string = "";
  private currentSubtitleId: string = ""; // Track current subtitle to avoid re-speaking
  private statusCallback: TTSStatusCallback | null = null;
  private speakingCallback: TTSSpeakingCallback | null = null;
  private isSpeaking: boolean = false;

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

  setStatusCallback(callback: TTSStatusCallback | null) {
    this.statusCallback = callback;
  }

  // Callback for when TTS starts/stops speaking (for video ducking)
  setSpeakingCallback(callback: TTSSpeakingCallback | null) {
    this.speakingCallback = callback;
  }

  private updateStatus(speaking: boolean) {
    this.isSpeaking = speaking;
    this.statusCallback?.(speaking);
    // Notify for video ducking
    if (this.settings.duckVideo) {
      this.speakingCallback?.(speaking);
    }
  }

  // Speak with subtitle timing info for auto rate adjustment
  async speakSubtitle(
    text: string,
    subtitleId: string, // Unique ID for this subtitle (e.g., startTime-endTime)
    availableDuration?: number // Time available before next subtitle (seconds)
  ): Promise<void> {
    if (!this.settings.enabled || !text.trim()) {
      return;
    }

    // Skip if same subtitle (using ID instead of text to handle repeated text)
    if (subtitleId === this.currentSubtitleId) {
      return;
    }

    // Stop current speech before starting new one
    await this.stop();

    this.currentSubtitleId = subtitleId;
    this.lastSpokenText = text;
    this.updateStatus(true);

    // Calculate rate
    let rate = this.settings.rate;
    if (this.settings.autoRate && availableDuration && availableDuration > 0) {
      rate = calculateOptimalRate(text, availableDuration, this.settings.rate);
    }

    return new Promise((resolve) => {
      Speech.speak(text, {
        language: this.settings.language,
        rate: rate,
        pitch: this.settings.pitch,
        onDone: () => {
          this.updateStatus(false);
          resolve();
        },
        onError: () => {
          this.updateStatus(false);
          resolve();
        },
        onStopped: () => {
          this.updateStatus(false);
          resolve();
        },
      });
    });
  }

  // Legacy speak method (without timing)
  async speak(text: string): Promise<void> {
    return this.speakSubtitle(text, text);
  }

  async stop(): Promise<void> {
    const speaking = await Speech.isSpeakingAsync();
    if (speaking) {
      await Speech.stop();
    }
    this.updateStatus(false);
  }

  async isSpeakingAsync(): Promise<boolean> {
    return Speech.isSpeakingAsync();
  }

  resetLastSpoken() {
    this.lastSpokenText = "";
    this.currentSubtitleId = "";
  }

  // Get available voices for language selection
  async getAvailableVoices() {
    return Speech.getAvailableVoicesAsync();
  }
}

export const ttsService = TTSService.getInstance();
