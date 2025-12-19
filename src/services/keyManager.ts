/**
 * Gemini API Key Manager - Quản lý và xoay vòng API keys
 * Hỗ trợ nhiều key, tự động chuyển khi gặp lỗi 429 (rate limit)
 */
import { GoogleGenAI } from "@google/genai";

// Thời gian block theo loại rate limit
const RATE_LIMIT_MINUTE_MS = 120000; // 2 phút cho RPM
const RATE_LIMIT_DAY_MS = 86400000; // 24 giờ cho RPD

interface RateLimitInfo {
  blockedUntil: number;
  retryCount: number;
}

class GeminiKeyManager {
  private keys: string[] = [];
  private currentKeyIndex = 0;
  private aiInstances: Map<number, GoogleGenAI> = new Map();
  private rateLimitedKeys: Map<number, RateLimitInfo> = new Map();
  private onKeysChangeCallback?: () => void;

  /**
   * Khởi tạo với danh sách keys
   */
  initialize(apiKeys: string[]): void {
    this.keys = apiKeys.filter((k) => k && k.trim());
    this.currentKeyIndex = 0;
    this.aiInstances.clear();
    this.rateLimitedKeys.clear();

    if (this.keys.length > 0) {
      this.getOrCreateInstance(0);
    }

    console.log(`[KeyManager] Initialized with ${this.keys.length} API key(s)`);
  }

  /**
   * Set callback khi keys thay đổi (để UI update)
   */
  setOnKeysChange(callback: () => void): void {
    this.onKeysChangeCallback = callback;
  }

  /**
   * Check và unblock keys đã hết thời gian chờ
   */
  private checkBlockedKeys(): void {
    const now = Date.now();
    for (const [keyIndex, data] of this.rateLimitedKeys) {
      if (now >= data.blockedUntil) {
        this.rateLimitedKeys.delete(keyIndex);
        console.log(
          `[KeyManager] Key #${keyIndex + 1} unblocked (rate limit expired)`
        );
      }
    }
  }

  /**
   * Lấy hoặc tạo GoogleGenAI instance cho key index
   */
  private getOrCreateInstance(index: number): GoogleGenAI | null {
    if (index >= this.keys.length) return null;

    if (!this.aiInstances.has(index)) {
      const instance = new GoogleGenAI({ apiKey: this.keys[index] });
      this.aiInstances.set(index, instance);
    }
    return this.aiInstances.get(index)!;
  }

  /**
   * Lấy AI instance hiện tại
   */
  getCurrentAI(): GoogleGenAI | null {
    if (this.keys.length === 0) return null;
    return this.getOrCreateInstance(this.currentKeyIndex);
  }

  /**
   * Lấy key hiện tại (masked cho logging)
   */
  getCurrentKeyMasked(): string {
    if (this.keys.length === 0) return "No key";
    const key = this.keys[this.currentKeyIndex];
    if (key.length < 12) return "***";
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  }

  /**
   * Lấy index hiện tại (1-based cho display)
   */
  getCurrentKeyIndex(): number {
    return this.currentKeyIndex + 1;
  }

  /**
   * Tổng số keys
   */
  getTotalKeys(): number {
    return this.keys.length;
  }

  /**
   * Kiểm tra có key khả dụng không
   */
  hasAvailableKey(): boolean {
    if (this.keys.length === 0) return false;
    this.checkBlockedKeys();

    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const data = this.rateLimitedKeys.get(i);
      if (!data || now >= data.blockedUntil) {
        return true;
      }
    }
    return false;
  }

  /**
   * Đánh dấu key hiện tại bị rate limit
   */
  private markCurrentKeyRateLimited(): { duration: number; isDaily: boolean } {
    const existing = this.rateLimitedKeys.get(this.currentKeyIndex);
    const retryCount = (existing?.retryCount || 0) + 1;

    // Lần đầu: block 2 phút, lần 2+: block 24h
    const isDaily = retryCount > 1;
    const duration = isDaily ? RATE_LIMIT_DAY_MS : RATE_LIMIT_MINUTE_MS;
    const blockedUntil = Date.now() + duration;

    this.rateLimitedKeys.set(this.currentKeyIndex, {
      blockedUntil,
      retryCount,
    });

    const durationText = isDaily ? "24h (daily limit)" : "2 phút";
    console.log(
      `[KeyManager] Key #${
        this.currentKeyIndex + 1
      } blocked for ${durationText}`
    );

    return { duration, isDaily };
  }

  /**
   * Chuyển sang key tiếp theo (không bị rate limit)
   */
  rotateToNextKey(): boolean {
    this.checkBlockedKeys();

    if (this.keys.length <= 1) {
      return false;
    }

    const startIndex = this.currentKeyIndex;
    const now = Date.now();

    do {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;

      const data = this.rateLimitedKeys.get(this.currentKeyIndex);
      if (!data || now >= data.blockedUntil) {
        if (data && now >= data.blockedUntil) {
          this.rateLimitedKeys.delete(this.currentKeyIndex);
        }
        console.log(
          `[KeyManager] Rotated to key #${this.currentKeyIndex + 1}/${
            this.keys.length
          }`
        );
        this.onKeysChangeCallback?.();
        return true;
      }
    } while (this.currentKeyIndex !== startIndex);

    return false;
  }

  /**
   * Xử lý lỗi 429 (rate limit)
   */
  handleRateLimitError(): boolean {
    this.markCurrentKeyRateLimited();

    if (this.rotateToNextKey()) {
      return true;
    }

    console.log(`[KeyManager] All ${this.keys.length} keys are rate limited`);
    return false;
  }

  /**
   * Lấy thông tin status của tất cả keys
   */
  getStatus(): Array<{
    index: number;
    masked: string;
    available: boolean;
    blockedUntil?: Date;
  }> {
    const now = Date.now();
    return this.keys.map((key, index) => {
      const data = this.rateLimitedKeys.get(index);
      return {
        index: index + 1,
        masked:
          key.length >= 12
            ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}`
            : "***",
        available: !data || now >= data.blockedUntil,
        blockedUntil:
          data && now < data.blockedUntil
            ? new Date(data.blockedUntil)
            : undefined,
      };
    });
  }

  /**
   * Reset tất cả trạng thái
   */
  reset(): void {
    this.currentKeyIndex = 0;
    this.rateLimitedKeys.clear();
    console.log("[KeyManager] Reset all states");
  }
}

// Singleton instance
export const keyManager = new GeminiKeyManager();

/**
 * Check if error is a rate limit error (429)
 */
export function isRateLimitError(error: any): boolean {
  const status = error?.status || error?.code;
  return status === 429;
}

/**
 * Check if error is retryable (503, etc.)
 */
export function isRetryableError(error: any): boolean {
  const status = error?.status || error?.code;
  return [503, 500].includes(status);
}
