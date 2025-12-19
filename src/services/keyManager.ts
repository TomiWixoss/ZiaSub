/**
 * Gemini API Key Manager - Quản lý và xoay vòng API keys
 * Thử tất cả keys lần lượt cho đến khi thành công
 */
import { GoogleGenAI } from "@google/genai";

export type KeyStatusCallback = (status: {
  currentKey: number;
  totalKeys: number;
  message: string;
}) => void;

class GeminiKeyManager {
  private keys: string[] = [];
  private currentKeyIndex = 0;
  private aiInstances: Map<number, GoogleGenAI> = new Map();
  private statusCallback?: KeyStatusCallback;

  /**
   * Khởi tạo với danh sách keys
   */
  initialize(apiKeys: string[]): void {
    this.keys = apiKeys.filter((k) => k && k.trim());
    this.currentKeyIndex = 0;
    this.aiInstances.clear();

    if (this.keys.length > 0) {
      this.getOrCreateInstance(0);
    }

    console.log(`[KeyManager] Initialized with ${this.keys.length} API key(s)`);
  }

  /**
   * Set callback để UI nhận status updates
   */
  setStatusCallback(callback?: KeyStatusCallback): void {
    this.statusCallback = callback;
  }

  /**
   * Notify status change
   */
  private notifyStatus(message: string): void {
    this.statusCallback?.({
      currentKey: this.currentKeyIndex + 1,
      totalKeys: this.keys.length,
      message,
    });
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
   * Lấy AI instance theo index
   */
  getAIByIndex(index: number): GoogleGenAI | null {
    if (index < 0 || index >= this.keys.length) return null;
    return this.getOrCreateInstance(index);
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
    return this.keys.length > 0;
  }

  /**
   * Chuyển sang key tiếp theo
   */
  rotateToNextKey(): boolean {
    if (this.keys.length <= 1) {
      return false;
    }

    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    console.log(
      `[KeyManager] Rotated to key #${this.currentKeyIndex + 1}/${
        this.keys.length
      }`
    );
    this.notifyStatus(`Đang thử key ${this.currentKeyIndex + 1}...`);
    return true;
  }

  /**
   * Set key index trực tiếp
   */
  setKeyIndex(index: number): void {
    if (index >= 0 && index < this.keys.length) {
      this.currentKeyIndex = index;
    }
  }

  /**
   * Thực thi với retry qua tất cả keys
   * Thử từng key lần lượt cho đến khi thành công hoặc hết keys
   */
  async executeWithRetry<T>(
    operation: (ai: GoogleGenAI, keyIndex: number) => Promise<T>
  ): Promise<T> {
    if (this.keys.length === 0) {
      throw new Error("Thêm key trong Cài đặt trước nhé");
    }

    const startIndex = this.currentKeyIndex;
    let lastError: any = null;
    let triedKeys = 0;

    // Thử tất cả keys bắt đầu từ key hiện tại
    while (triedKeys < this.keys.length) {
      const ai = this.getOrCreateInstance(this.currentKeyIndex);
      if (!ai) {
        this.rotateToNextKey();
        triedKeys++;
        continue;
      }

      try {
        this.notifyStatus(
          triedKeys === 0
            ? `Đang dùng key ${this.currentKeyIndex + 1}...`
            : `Đang thử key ${this.currentKeyIndex + 1}/${this.keys.length}...`
        );

        const result = await operation(ai, this.currentKeyIndex);

        // Thành công
        if (triedKeys > 0) {
          console.log(
            `[KeyManager] ✅ Thành công với key #${
              this.currentKeyIndex + 1
            } sau ${triedKeys + 1} lần thử`
          );
          this.notifyStatus(`✅ Key ${this.currentKeyIndex + 1} hoạt động`);
        }

        return result;
      } catch (error: any) {
        lastError = error;
        const errorCode = error?.status || error?.code;
        const errorMsg = error?.message || "Unknown error";

        console.log(
          `[KeyManager] ❌ Key #${
            this.currentKeyIndex + 1
          } lỗi: ${errorCode} - ${errorMsg}`
        );

        // Nếu là lỗi có thể retry (429, 500, 503), thử key tiếp theo
        if (isRetryableError(error)) {
          triedKeys++;

          if (triedKeys < this.keys.length) {
            this.rotateToNextKey();
            // Delay nhẹ trước khi thử key tiếp
            await sleep(1000);
            continue;
          }
        }

        // Lỗi không thể retry (400, 401, etc.) hoặc đã thử hết keys
        break;
      }
    }

    // Đã thử hết tất cả keys
    if (triedKeys >= this.keys.length) {
      this.notifyStatus(`❌ Đã thử hết ${this.keys.length} key`);
      throw new Error(
        `Đã thử hết ${this.keys.length} key nhưng không được. Lỗi: ${
          lastError?.message || "Không rõ"
        }`
      );
    }

    throw lastError;
  }

  /**
   * Reset về key đầu tiên
   */
  reset(): void {
    this.currentKeyIndex = 0;
    console.log("[KeyManager] Reset to first key");
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Singleton instance
export const keyManager = new GeminiKeyManager();

/**
 * Check if error is retryable (rate limit, overload, etc.)
 */
export function isRetryableError(error: any): boolean {
  const status = error?.status || error?.code;
  // 429: Rate limit, 500: Server error, 503: Overloaded
  return [429, 500, 503].includes(status);
}
