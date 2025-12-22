/**
 * Background Service - Giữ app chạy khi ở background (Android)
 * Sử dụng react-native-background-actions để chạy foreground service thực sự
 */
import BackgroundService from "react-native-background-actions";
import { Platform, AppState, AppStateStatus } from "react-native";

// Flag để track trạng thái
let translationInProgress = false;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null =
  null;

// Background task options
const defaultOptions = {
  taskName: "TranslationTask",
  taskTitle: "Đang dịch phụ đề...",
  taskDesc: "Đang xử lý...",
  taskIcon: {
    name: "ic_launcher",
    type: "mipmap",
  },
  color: "#FF231F7C",
  linkingURI: "ziasub://",
  parameters: {
    delay: 1000,
  },
};

// Sleep function for background task
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Background task - chỉ cần giữ service chạy
const backgroundTask = async (taskData?: { delay?: number }) => {
  const delay = taskData?.delay ?? 1000;

  // Vòng lặp vô hạn để giữ service chạy
  // Service sẽ tự dừng khi gọi stop()
  while (BackgroundService.isRunning()) {
    await sleep(delay);
  }
};

class BackgroundServiceManager {
  private static instance: BackgroundServiceManager;
  private currentVideoTitle: string = "";

  private constructor() {}

  static getInstance(): BackgroundServiceManager {
    if (!BackgroundServiceManager.instance) {
      BackgroundServiceManager.instance = new BackgroundServiceManager();
    }
    return BackgroundServiceManager.instance;
  }

  /**
   * Khởi tạo service và lắng nghe app state
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== "android") return;

    // Lắng nghe app state changes
    if (!appStateSubscription) {
      appStateSubscription = AppState.addEventListener(
        "change",
        this.handleAppStateChange.bind(this)
      );
    }
  }

  /**
   * Xử lý khi app state thay đổi
   */
  private async handleAppStateChange(
    nextAppState: AppStateStatus
  ): Promise<void> {
    if (Platform.OS !== "android") return;

    if (nextAppState === "background" && translationInProgress) {
      // App vào background khi đang dịch -> start foreground service
      await this.startBackgroundService();
    } else if (nextAppState === "active") {
      // App quay lại foreground -> stop foreground service
      await this.stopBackgroundService();
    }
  }

  /**
   * Gọi khi bắt đầu dịch
   */
  async onTranslationStart(videoTitle?: string): Promise<void> {
    translationInProgress = true;
    this.currentVideoTitle = videoTitle || "Video";

    if (Platform.OS !== "android") return;

    // Nếu app đang ở background, start service ngay
    if (AppState.currentState !== "active") {
      await this.startBackgroundService();
    }
  }

  /**
   * Cập nhật progress trong notification
   */
  async updateProgress(
    currentBatch: number,
    totalBatches: number,
    videoTitle?: string
  ): Promise<void> {
    if (Platform.OS !== "android") return;
    if (!BackgroundService.isRunning()) return;

    const title = videoTitle || this.currentVideoTitle;

    try {
      await BackgroundService.updateNotification({
        taskTitle: `Đang dịch: ${currentBatch}/${totalBatches}`,
        taskDesc: title,
      });
    } catch (error) {
      console.error("[BackgroundService] Update progress error:", error);
    }
  }

  /**
   * Gọi khi dịch xong
   */
  async onTranslationComplete(): Promise<void> {
    translationInProgress = false;
    this.currentVideoTitle = "";
    await this.stopBackgroundService();
  }

  /**
   * Gọi khi dịch lỗi hoặc bị dừng
   */
  async onTranslationStop(): Promise<void> {
    translationInProgress = false;
    this.currentVideoTitle = "";
    await this.stopBackgroundService();
  }

  /**
   * Start background service
   */
  private async startBackgroundService(): Promise<void> {
    if (BackgroundService.isRunning()) return;

    try {
      await BackgroundService.start(backgroundTask, {
        ...defaultOptions,
        taskTitle: "Đang dịch phụ đề...",
        taskDesc: this.currentVideoTitle || "Đang xử lý...",
      });

      console.log("[BackgroundService] Started foreground service");
    } catch (error) {
      console.error("[BackgroundService] Start error:", error);
    }
  }

  /**
   * Stop background service
   */
  private async stopBackgroundService(): Promise<void> {
    if (!BackgroundService.isRunning()) return;

    try {
      await BackgroundService.stop();
      console.log("[BackgroundService] Stopped foreground service");
    } catch (error) {
      console.error("[BackgroundService] Stop error:", error);
    }
  }

  /**
   * Check if translation is in progress
   */
  isTranslating(): boolean {
    return translationInProgress;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
    this.stopBackgroundService();
  }
}

export const backgroundService = BackgroundServiceManager.getInstance();
