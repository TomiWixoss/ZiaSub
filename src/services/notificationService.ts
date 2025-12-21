/**
 * Notification Service - Quản lý thông báo khi dịch xong
 */
import * as Notifications from "expo-notifications";
import { Platform, AppState, AppStateStatus } from "react-native";
import { cacheService } from "./cacheService";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@constants/defaults";

// Cấu hình cách hiển thị notification khi app đang mở
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  private hasPermission: boolean = false;
  private appState: AppStateStatus = "active";

  private constructor() {
    // Theo dõi trạng thái app
    AppState.addEventListener("change", (state) => {
      this.appState = state;
    });
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Khởi tạo và xin quyền notification
   */
  async initialize(): Promise<boolean> {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      this.hasPermission = finalStatus === "granted";

      // Cấu hình channel cho Android
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("translation", {
          name: "Dịch phụ đề",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          sound: "default",
        });
      }

      return this.hasPermission;
    } catch (error) {
      console.error("[NotificationService] Initialize error:", error);
      return false;
    }
  }

  /**
   * Kiểm tra xem có nên gửi notification không
   * Chỉ gửi khi app đang chạy nền và setting được bật
   */
  private shouldSendNotification(): boolean {
    // Kiểm tra setting
    const settings = cacheService.isInitialized()
      ? cacheService.getSettings()
      : null;
    const notificationEnabled =
      settings?.notification?.enabled ?? DEFAULT_NOTIFICATION_SETTINGS.enabled;

    if (!notificationEnabled) {
      return false;
    }

    // Kiểm tra quyền
    if (!this.hasPermission) {
      return false;
    }

    // Chỉ gửi khi app đang ở background hoặc inactive
    return this.appState !== "active";
  }

  /**
   * Gửi thông báo khi dịch xong một video
   */
  async notifyTranslationComplete(videoTitle: string): Promise<void> {
    if (!this.shouldSendNotification()) {
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Dịch xong! ✅",
          body: videoTitle,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Gửi ngay lập tức
      });
    } catch (error) {
      console.error("[NotificationService] Send notification error:", error);
    }
  }

  /**
   * Gửi thông báo khi dịch lỗi
   */
  async notifyTranslationError(
    videoTitle: string,
    error?: string
  ): Promise<void> {
    if (!this.shouldSendNotification()) {
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Dịch lỗi ❌",
          body: error ? `${videoTitle}: ${error}` : videoTitle,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (error) {
      console.error("[NotificationService] Send notification error:", error);
    }
  }

  /**
   * Gửi thông báo khi dịch xong tất cả video trong queue
   */
  async notifyQueueComplete(completedCount: number): Promise<void> {
    if (!this.shouldSendNotification()) {
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Dịch xong tất cả! 🎉",
          body: `Đã dịch xong ${completedCount} video`,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (error) {
      console.error("[NotificationService] Send notification error:", error);
    }
  }

  /**
   * Kiểm tra quyền notification
   */
  async checkPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    this.hasPermission = status === "granted";
    return this.hasPermission;
  }

  /**
   * Xin quyền notification
   */
  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    this.hasPermission = status === "granted";
    return this.hasPermission;
  }

  /**
   * Kiểm tra app có đang ở background không
   */
  isAppInBackground(): boolean {
    return this.appState !== "active";
  }
}

export const notificationService = NotificationService.getInstance();
