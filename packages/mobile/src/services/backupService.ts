/**
 * Backup Service - Handles backup/restore to file system
 * File system is only used for backup, not primary storage
 */
import * as FileSystem from "expo-file-system/legacy";
import { storageService } from "./storageService";

const BACKUP_FILENAME = "ziasub_backup.json";
const DATA_MARKER_FILE = ".ziasub_data";

type BackupType = "local" | "saf";

interface BackupData {
  version: string;
  createdAt: number;
  settings: any;
  geminiConfigs: any[];
  chatSessions: any[];
  translations: Record<string, any>;
  srtFiles: Record<string, string>;
  activeTranslationConfigId: string | null;
  activeChatConfigId: string | null;
  activeChatSessionId: string | null;
  translationQueue?: any[];
}

interface BackupInfo {
  hasBackup: boolean;
  createdAt?: number;
  version?: string;
  chatCount?: number;
  translationCount?: number;
  queueCount?: number;
}

class BackupService {
  private static instance: BackupService;

  private constructor() {}

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Check if path is SAF URI
   */
  private isSafUri(path: string): boolean {
    return path.startsWith("content://");
  }

  /**
   * Get default backup path
   */
  getDefaultBackupPath(): string {
    return `${FileSystem.documentDirectory}ziasub_backup`;
  }

  /**
   * Check if backup exists at path
   */
  async getBackupInfo(path: string): Promise<BackupInfo> {
    try {
      if (this.isSafUri(path)) {
        return await this.getBackupInfoSaf(path);
      }

      const backupPath = `${path}/${BACKUP_FILENAME}`;
      const info = await FileSystem.getInfoAsync(backupPath);

      if (!info.exists) {
        return { hasBackup: false };
      }

      const content = await FileSystem.readAsStringAsync(backupPath);
      const data = JSON.parse(content) as BackupData;

      return {
        hasBackup: true,
        createdAt: data.createdAt,
        version: data.version,
        chatCount: data.chatSessions?.length || 0,
        translationCount: Object.keys(data.translations || {}).length,
        queueCount: data.translationQueue?.length || 0,
      };
    } catch {
      return { hasBackup: false };
    }
  }

  private async getBackupInfoSaf(directoryUri: string): Promise<BackupInfo> {
    try {
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
        directoryUri
      );

      const backupFile = this.findSafFile(files, BACKUP_FILENAME);
      if (!backupFile) {
        return { hasBackup: false };
      }

      const content = await FileSystem.StorageAccessFramework.readAsStringAsync(
        backupFile
      );
      const data = JSON.parse(content) as BackupData;

      return {
        hasBackup: true,
        createdAt: data.createdAt,
        version: data.version,
        chatCount: data.chatSessions?.length || 0,
        translationCount: Object.keys(data.translations || {}).length,
        queueCount: data.translationQueue?.length || 0,
      };
    } catch {
      return { hasBackup: false };
    }
  }

  /**
   * Create backup to file system
   */
  async createBackup(path?: string): Promise<void> {
    const backupPath = path || (await storageService.getBackupPath());
    if (!backupPath) {
      throw new Error("No backup path configured");
    }

    const exportedData = await storageService.exportAllData();

    const backupData: BackupData = {
      version: "2.0",
      createdAt: Date.now(),
      ...exportedData,
    };

    const content = JSON.stringify(backupData, null, 2);

    if (this.isSafUri(backupPath)) {
      await this.writeBackupSaf(backupPath, content);
    } else {
      await this.writeBackupLocal(backupPath, content);
    }

    await storageService.setLastBackupTime(Date.now());
    console.log("[BackupService] Backup created successfully");
  }

  private async writeBackupLocal(
    basePath: string,
    content: string
  ): Promise<void> {
    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(basePath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(basePath, { intermediates: true });
    }

    // Write backup file
    const backupPath = `${basePath}/${BACKUP_FILENAME}`;
    await FileSystem.writeAsStringAsync(backupPath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Write marker file
    const markerPath = `${basePath}/${DATA_MARKER_FILE}`;
    await FileSystem.writeAsStringAsync(
      markerPath,
      JSON.stringify({ createdAt: Date.now(), version: "2.0" })
    );
  }

  private async writeBackupSaf(
    directoryUri: string,
    content: string
  ): Promise<void> {
    const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
      directoryUri
    );

    // Find or create backup file
    let backupFileUri = this.findSafFile(files, BACKUP_FILENAME);

    if (backupFileUri) {
      await FileSystem.StorageAccessFramework.writeAsStringAsync(
        backupFileUri,
        content
      );
    } else {
      backupFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        directoryUri,
        BACKUP_FILENAME,
        "application/json"
      );
      await FileSystem.StorageAccessFramework.writeAsStringAsync(
        backupFileUri,
        content
      );
    }

    // Write marker file
    let markerUri = this.findSafFile(files, DATA_MARKER_FILE);
    const markerContent = JSON.stringify({
      createdAt: Date.now(),
      version: "2.0",
    });

    if (markerUri) {
      await FileSystem.StorageAccessFramework.writeAsStringAsync(
        markerUri,
        markerContent
      );
    } else {
      markerUri = await FileSystem.StorageAccessFramework.createFileAsync(
        directoryUri,
        DATA_MARKER_FILE,
        "application/json"
      );
      await FileSystem.StorageAccessFramework.writeAsStringAsync(
        markerUri,
        markerContent
      );
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(path?: string): Promise<void> {
    const backupPath = path || (await storageService.getBackupPath());
    if (!backupPath) {
      throw new Error("No backup path configured");
    }

    let content: string;

    if (this.isSafUri(backupPath)) {
      content = await this.readBackupSaf(backupPath);
    } else {
      content = await this.readBackupLocal(backupPath);
    }

    const backupData = JSON.parse(content) as BackupData;

    // Import data
    await storageService.importAllData({
      settings: backupData.settings,
      geminiConfigs: backupData.geminiConfigs,
      chatSessions: backupData.chatSessions,
      translations: backupData.translations,
      srtFiles: backupData.srtFiles,
      activeTranslationConfigId: backupData.activeTranslationConfigId,
      activeChatConfigId: backupData.activeChatConfigId,
      activeChatSessionId: backupData.activeChatSessionId,
      translationQueue: backupData.translationQueue,
    });

    console.log("[BackupService] Backup restored successfully");
  }

  private async readBackupLocal(basePath: string): Promise<string> {
    const backupPath = `${basePath}/${BACKUP_FILENAME}`;
    return await FileSystem.readAsStringAsync(backupPath, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  private async readBackupSaf(directoryUri: string): Promise<string> {
    const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
      directoryUri
    );

    const backupFile = this.findSafFile(files, BACKUP_FILENAME);
    if (!backupFile) {
      throw new Error("Backup file not found");
    }

    return await FileSystem.StorageAccessFramework.readAsStringAsync(
      backupFile
    );
  }

  /**
   * Setup backup path (called during onboarding)
   */
  async setupBackupPath(path: string): Promise<void> {
    const isSaf = this.isSafUri(path);

    await storageService.setBackupPath(path);
    await storageService.setBackupType(isSaf ? "saf" : "local");

    // Create directory if local
    if (!isSaf) {
      const dirInfo = await FileSystem.getInfoAsync(path);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(path, { intermediates: true });
      }
    }
  }

  /**
   * Helper to find file in SAF directory
   */
  private findSafFile(files: string[], filename: string): string | undefined {
    const encodedFilename = encodeURIComponent(filename);
    return files.find((f) => {
      const decodedUri = decodeURIComponent(f);
      const lastSegment = f.split("/").pop() || "";
      const decodedLastSegment = decodeURIComponent(lastSegment);

      return (
        f.endsWith(`/${filename}`) ||
        f.endsWith(`/${encodedFilename}`) ||
        decodedUri.endsWith(`/${filename}`) ||
        lastSegment === filename ||
        lastSegment === encodedFilename ||
        decodedLastSegment === filename
      );
    });
  }

  /**
   * Migrate from old file-based storage to new AsyncStorage
   * Call this once during app upgrade
   */
  async migrateFromFileStorage(oldPath: string): Promise<boolean> {
    try {
      console.log("[BackupService] Starting migration from file storage...");

      // Check if old data exists
      const backupInfo = await this.getBackupInfo(oldPath);

      // Also check for old format data (individual files)
      const hasOldData = await this.checkOldFormatData(oldPath);

      if (!backupInfo.hasBackup && !hasOldData) {
        console.log("[BackupService] No old data to migrate");
        return false;
      }

      if (backupInfo.hasBackup) {
        // Restore from backup format
        await this.restoreBackup(oldPath);
      } else if (hasOldData) {
        // Migrate from old individual files format
        await this.migrateOldFormat(oldPath);
      }

      // Set backup path for future backups
      await this.setupBackupPath(oldPath);

      console.log("[BackupService] Migration completed");
      return true;
    } catch (error) {
      console.error("[BackupService] Migration error:", error);
      return false;
    }
  }

  private async checkOldFormatData(path: string): Promise<boolean> {
    try {
      if (this.isSafUri(path)) {
        const files =
          await FileSystem.StorageAccessFramework.readDirectoryAsync(path);
        return files.some(
          (f) =>
            f.includes("settings.json") ||
            f.includes("gemini_configs.json") ||
            f.includes("chat_sessions.json")
        );
      } else {
        const settingsPath = `${path}/settings.json`;
        const info = await FileSystem.getInfoAsync(settingsPath);
        return info.exists;
      }
    } catch {
      return false;
    }
  }

  private async migrateOldFormat(path: string): Promise<void> {
    // Read old format files and import
    const data: any = {};

    if (this.isSafUri(path)) {
      await this.migrateOldFormatSaf(path, data);
    } else {
      await this.migrateOldFormatLocal(path, data);
    }

    await storageService.importAllData(data);
  }

  private async migrateOldFormatLocal(
    basePath: string,
    data: any
  ): Promise<void> {
    // Settings
    try {
      const content = await FileSystem.readAsStringAsync(
        `${basePath}/settings.json`
      );
      data.settings = JSON.parse(content);
    } catch {}

    // Gemini configs
    try {
      const content = await FileSystem.readAsStringAsync(
        `${basePath}/gemini_configs.json`
      );
      data.geminiConfigs = JSON.parse(content);
    } catch {}

    // Chat sessions
    try {
      const content = await FileSystem.readAsStringAsync(
        `${basePath}/chat_sessions.json`
      );
      data.chatSessions = JSON.parse(content);
    } catch {}

    // Translations
    try {
      const translationsDir = `${basePath}/translations`;
      const dirInfo = await FileSystem.getInfoAsync(translationsDir);
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(translationsDir);
        data.translations = {};
        for (const file of files) {
          if (file.endsWith(".json")) {
            const videoId = file.replace(".json", "");
            const content = await FileSystem.readAsStringAsync(
              `${translationsDir}/${file}`
            );
            data.translations[videoId] = JSON.parse(content);
          }
        }
      }
    } catch {}

    // Active config IDs
    try {
      const content = await FileSystem.readAsStringAsync(
        `${basePath}/active_translation_config.json`
      );
      const parsed = JSON.parse(content);
      data.activeTranslationConfigId = parsed.id;
    } catch {}

    try {
      const content = await FileSystem.readAsStringAsync(
        `${basePath}/active_chat_config.json`
      );
      const parsed = JSON.parse(content);
      data.activeChatConfigId = parsed.id;
    } catch {}
  }

  private async migrateOldFormatSaf(
    directoryUri: string,
    data: any
  ): Promise<void> {
    const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
      directoryUri
    );

    // Settings
    const settingsFile = this.findSafFile(files, "settings.json");
    if (settingsFile) {
      try {
        const content =
          await FileSystem.StorageAccessFramework.readAsStringAsync(
            settingsFile
          );
        data.settings = JSON.parse(content);
      } catch {}
    }

    // Gemini configs
    const configsFile = this.findSafFile(files, "gemini_configs.json");
    if (configsFile) {
      try {
        const content =
          await FileSystem.StorageAccessFramework.readAsStringAsync(
            configsFile
          );
        data.geminiConfigs = JSON.parse(content);
      } catch {}
    }

    // Chat sessions
    const sessionsFile = this.findSafFile(files, "chat_sessions.json");
    if (sessionsFile) {
      try {
        const content =
          await FileSystem.StorageAccessFramework.readAsStringAsync(
            sessionsFile
          );
        data.chatSessions = JSON.parse(content);
      } catch {}
    }

    // Translations directory
    const translationsDir = files.find((f) => f.includes("translations"));
    if (translationsDir) {
      try {
        const translationFiles =
          await FileSystem.StorageAccessFramework.readDirectoryAsync(
            translationsDir
          );
        data.translations = {};
        for (const file of translationFiles) {
          if (file.includes(".json")) {
            const content =
              await FileSystem.StorageAccessFramework.readAsStringAsync(file);
            const videoId = decodeURIComponent(
              file.split("/").pop() || ""
            ).replace(".json", "");
            data.translations[videoId] = JSON.parse(content);
          }
        }
      } catch {}
    }
  }
}

export const backupService = BackupService.getInstance();
