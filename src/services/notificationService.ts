/**
 * Notification Service - Quản lý thông báo khi dịch xong
 */
import * as Notifications from "expo-notifications";
import { Platform, AppState, AppStateStatus } from "react-native";
import { storageService } from "./storageService";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@constants/defaults";
import type { NotificationSettings } from "@src/types";

// Nguồn gửi notification
export type NotificationSource = "queue" | "direct";

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
  private appState: AppStateStatus = AppState.currentState;
  private listenerSubscription: ReturnType<
    typeof AppState.addEventListener
  > | null = null;

  private constructor() {
    this.listenerSubscription = AppState.addEventListener("change", (state) => {
      this.appState = state;
    });
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

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

  private getSettings(): NotificationSettings {
    if (storageService.isInitialized()) {
      return (
        storageService.getSettings()?.notification ??
        DEFAULT_NOTIFICATION_SETTINGS
      );
    }
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  private shouldSendNotification(
    source: NotificationSource,
    type: "complete" | "batchComplete" | "error"
  ): boolean {
    const settings = this.getSettings();

    // Kiểm tra bật/tắt chung
    if (!settings.enabled) return false;

    // Kiểm tra quyền
    if (!this.hasPermission) return false;

    // Kiểm tra nguồn
    if (source === "queue" && !settings.fromQueue) return false;
    if (source === "direct" && !settings.fromDirect) return false;

    // Kiểm tra loại thông báo
    if (type === "complete" && !settings.onComplete) return false;
    if (type === "batchComplete" && !settings.onBatchComplete) return false;
    if (type === "error" && !settings.onError) return false;

    // Chỉ gửi khi app ở background
    return AppState.currentState !== "active";
  }

  async notifyTranslationComplete(
    videoTitle: string,
    source: NotificationSource = "direct"
  ): Promise<void> {
    if (!this.shouldSendNotification(source, "complete")) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Dịch xong! ✅",
          body: videoTitle,
          sound: "default",
        },
        trigger:
          Platform.OS === "android" ? { channelId: "translation" } : null,
      });
    } catch (error) {
      console.error("[NotificationService] Send notification error:", error);
    }
  }

  async notifyBatchComplete(
    configName: string,
    currentBatch: number,
    totalBatches: number,
    source: NotificationSource = "direct"
  ): Promise<void> {
    if (!this.shouldSendNotification(source, "batchComplete")) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Dịch xong phần ${currentBatch}/${totalBatches} ✅`,
          body: configName,
          sound: "default",
        },
        trigger:
          Platform.OS === "android" ? { channelId: "translation" } : null,
      });
    } catch (error) {
      console.error("[NotificationService] Send notification error:", error);
    }
  }

  async notifyTranslationError(
    videoTitle: string,
    errorMsg?: string,
    source: NotificationSource = "direct"
  ): Promise<void> {
    if (!this.shouldSendNotification(source, "error")) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Dịch lỗi ❌",
          body: errorMsg ? `${videoTitle}: ${errorMsg}` : videoTitle,
          sound: "default",
        },
        trigger:
          Platform.OS === "android" ? { channelId: "translation" } : null,
      });
    } catch (error) {
      console.error("[NotificationService] Send notification error:", error);
    }
  }

  async notifyQueueComplete(completedCount: number): Promise<void> {
    if (!this.shouldSendNotification("queue", "complete")) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Dịch xong tất cả! 🎉",
          body: `Đã dịch xong ${completedCount} video`,
          sound: "default",
        },
        trigger:
          Platform.OS === "android" ? { channelId: "translation" } : null,
      });
    } catch (error) {
      console.error("[NotificationService] Send notification error:", error);
    }
  }

  async checkPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    this.hasPermission = status === "granted";
    return this.hasPermission;
  }

  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    this.hasPermission = status === "granted";
    return this.hasPermission;
  }

  isAppInBackground(): boolean {
    return AppState.currentState !== "active";
  }
}

export const notificationService = NotificationService.getInstance();
