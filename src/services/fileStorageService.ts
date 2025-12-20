/**
 * File Storage Service - Manages all app data storage using file system
 * Supports both local storage and SAF (Storage Access Framework) for Android
 */
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage path key in AsyncStorage (only stores the path, not data)
const STORAGE_PATH_KEY = "@app_storage_path";
const STORAGE_TYPE_KEY = "@app_storage_type"; // "local" or "saf"
const DATA_MARKER_FILE = ".ziasub_data";

// Data file names
const FILES = {
  settings: "settings.json",
  geminiConfigs: "gemini_configs.json",
  chatSessions: "chat_sessions.json",
  translations: "translations",
  srt: "srt",
  queue: "queue.json",
  marker: DATA_MARKER_FILE,
};

type StorageType = "local" | "saf";

class FileStorageService {
  private storagePath: string | null = null;
  private storageType: StorageType = "local";
  private initialized: boolean = false;

  /**
   * Check if path is a SAF URI
   */
  private isSafUri(path: string): boolean {
    return path.startsWith("content://");
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<boolean> {
    if (this.initialized && this.storagePath) return true;

    try {
      const [savedPath, savedType] = await Promise.all([
        AsyncStorage.getItem(STORAGE_PATH_KEY),
        AsyncStorage.getItem(STORAGE_TYPE_KEY),
      ]);

      if (savedPath) {
        this.storageType = (savedType as StorageType) || "local";

        if (this.storageType === "saf") {
          // For SAF, just check if we have the URI saved
          this.storagePath = savedPath;
          this.initialized = true;
          return true;
        } else {
          // For local storage, verify directory exists
          const dirInfo = await FileSystem.getInfoAsync(savedPath);
          if (dirInfo.exists && dirInfo.isDirectory) {
            this.storagePath = savedPath;
            this.initialized = true;
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Error initializing storage:", error);
      return false;
    }
  }

  /**
   * Check if storage is configured
   */
  isConfigured(): boolean {
    return this.initialized && this.storagePath !== null;
  }

  /**
   * Get current storage path
   */
  getStoragePath(): string | null {
    return this.storagePath;
  }

  /**
   * Get storage type
   */
  getStorageType(): StorageType {
    return this.storageType;
  }

  /**
   * Set storage path and create necessary structure
   */
  async setStoragePath(path: string): Promise<void> {
    try {
      const isSaf = this.isSafUri(path);
      this.storageType = isSaf ? "saf" : "local";

      if (isSaf) {
        // SAF storage - create files using SAF API
        await this.ensureDirectoriesSaf(path);
        await this.writeFileSaf(
          path,
          FILES.marker,
          JSON.stringify({ createdAt: Date.now(), version: "1.0" })
        );
      } else {
        // Local storage
        const dirInfo = await FileSystem.getInfoAsync(path);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(path, { intermediates: true });
        }
        await this.ensureDirectories(path);
        await this.writeFile(
          path,
          FILES.marker,
          JSON.stringify({ createdAt: Date.now(), version: "1.0" })
        );
      }

      // Save path and type to AsyncStorage
      await Promise.all([
        AsyncStorage.setItem(STORAGE_PATH_KEY, path),
        AsyncStorage.setItem(STORAGE_TYPE_KEY, this.storageType),
      ]);

      this.storagePath = path;
      this.initialized = true;
    } catch (error) {
      console.error("Error setting storage path:", error);
      throw error;
    }
  }

  /**
   * Check if a directory contains app data
   */
  async hasExistingData(path: string): Promise<boolean> {
    try {
      if (this.isSafUri(path)) {
        return await this.hasExistingDataSaf(path);
      }
      const markerPath = `${path}/${FILES.marker}`;
      const info = await FileSystem.getInfoAsync(markerPath);
      return info.exists;
    } catch {
      return false;
    }
  }

  /**
   * Check for existing data in SAF directory
   */
  private async hasExistingDataSaf(directoryUri: string): Promise<boolean> {
    try {
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
        directoryUri
      );
      return files.some((f) => f.includes(FILES.marker));
    } catch {
      return false;
    }
  }

  /**
   * Get data info from a directory
   */
  async getDataInfo(path: string): Promise<{
    hasData: boolean;
    createdAt?: number;
    settingsExists?: boolean;
    chatCount?: number;
    translationCount?: number;
  }> {
    try {
      const hasData = await this.hasExistingData(path);
      if (!hasData) return { hasData: false };

      if (this.isSafUri(path)) {
        return await this.getDataInfoSaf(path);
      }

      const markerContent = await this.readFile(path, FILES.marker);
      const marker = markerContent ? JSON.parse(markerContent) : {};

      let chatCount = 0;
      try {
        const chatContent = await this.readFile(path, FILES.chatSessions);
        if (chatContent) {
          const sessions = JSON.parse(chatContent);
          chatCount = Array.isArray(sessions) ? sessions.length : 0;
        }
      } catch {}

      let translationCount = 0;
      try {
        const translationsDir = `${path}/${FILES.translations}`;
        const dirInfo = await FileSystem.getInfoAsync(translationsDir);
        if (dirInfo.exists) {
          const files = await FileSystem.readDirectoryAsync(translationsDir);
          translationCount = files.filter((f) => f.endsWith(".json")).length;
        }
      } catch {}

      const settingsInfo = await FileSystem.getInfoAsync(
        `${path}/${FILES.settings}`
      );

      return {
        hasData: true,
        createdAt: marker.createdAt,
        settingsExists: settingsInfo.exists,
        chatCount,
        translationCount,
      };
    } catch {
      return { hasData: false };
    }
  }

  /**
   * Get data info from SAF directory
   */
  private async getDataInfoSaf(directoryUri: string): Promise<{
    hasData: boolean;
    createdAt?: number;
    chatCount?: number;
    translationCount?: number;
  }> {
    try {
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
        directoryUri
      );

      let createdAt: number | undefined;
      let chatCount = 0;
      let translationCount = 0;

      const markerFile = this.findSafFile(files, FILES.marker);
      if (markerFile) {
        try {
          const content =
            await FileSystem.StorageAccessFramework.readAsStringAsync(
              markerFile
            );
          const marker = JSON.parse(content);
          createdAt = marker.createdAt;
        } catch {}
      }

      const chatFile = this.findSafFile(files, FILES.chatSessions);
      if (chatFile) {
        try {
          const content =
            await FileSystem.StorageAccessFramework.readAsStringAsync(chatFile);
          const sessions = JSON.parse(content);
          chatCount = Array.isArray(sessions) ? sessions.length : 0;
        } catch {}
      }

      const translationsDir = this.findSafDir(files, FILES.translations);
      if (translationsDir) {
        try {
          const translationFiles =
            await FileSystem.StorageAccessFramework.readDirectoryAsync(
              translationsDir
            );
          translationCount = translationFiles.filter((f) =>
            f.endsWith(".json")
          ).length;
        } catch {}
      }

      return { hasData: true, createdAt, chatCount, translationCount };
    } catch {
      return { hasData: false };
    }
  }

  /**
   * Clear all data in storage
   */
  async clearAllData(): Promise<void> {
    if (!this.storagePath) throw new Error("Storage not configured");

    try {
      if (this.storageType === "saf") {
        await this.clearAllDataSaf();
      } else {
        const items = await FileSystem.readDirectoryAsync(this.storagePath);
        for (const item of items) {
          const itemPath = `${this.storagePath}/${item}`;
          await FileSystem.deleteAsync(itemPath, { idempotent: true });
        }
        await this.ensureDirectories(this.storagePath);
        await this.writeFile(
          this.storagePath,
          FILES.marker,
          JSON.stringify({ createdAt: Date.now(), version: "1.0" })
        );
      }
    } catch (error) {
      console.error("Error clearing data:", error);
      throw error;
    }
  }

  /**
   * Clear all data in SAF storage
   */
  private async clearAllDataSaf(): Promise<void> {
    if (!this.storagePath) return;

    try {
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
        this.storagePath
      );
      for (const fileUri of files) {
        try {
          await FileSystem.StorageAccessFramework.deleteAsync(fileUri);
        } catch {}
      }

      await this.ensureDirectoriesSaf(this.storagePath);
      await this.writeFileSaf(
        this.storagePath,
        FILES.marker,
        JSON.stringify({ createdAt: Date.now(), version: "1.0" })
      );
    } catch (error) {
      console.error("Error clearing SAF data:", error);
      throw error;
    }
  }

  /**
   * Reset storage (clear path, requires re-onboarding)
   */
  async resetStorage(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_PATH_KEY),
      AsyncStorage.removeItem(STORAGE_TYPE_KEY),
    ]);
    this.storagePath = null;
    this.storageType = "local";
    this.initialized = false;
  }

  /**
   * Ensure all necessary directories exist (local)
   */
  private async ensureDirectories(basePath: string): Promise<void> {
    const dirs = [FILES.translations, FILES.srt];
    for (const dir of dirs) {
      const dirPath = `${basePath}/${dir}`;
      const info = await FileSystem.getInfoAsync(dirPath);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }
    }
  }

  /**
   * Ensure all necessary directories exist (SAF)
   */
  private async ensureDirectoriesSaf(directoryUri: string): Promise<void> {
    const dirs = [FILES.translations, FILES.srt];

    // Get existing items in directory
    let existingItems: string[] = [];
    try {
      existingItems =
        await FileSystem.StorageAccessFramework.readDirectoryAsync(
          directoryUri
        );
    } catch {
      existingItems = [];
    }

    for (const dir of dirs) {
      // Check if directory already exists using helper
      const dirExists = this.findSafDir(existingItems, dir);

      if (!dirExists) {
        try {
          await FileSystem.StorageAccessFramework.makeDirectoryAsync(
            directoryUri,
            dir
          );
        } catch {
          // Directory might already exist or creation failed
        }
      }
    }
  }

  /**
   * Write data to a file (local)
   */
  private async writeFile(
    basePath: string,
    filename: string,
    content: string
  ): Promise<void> {
    const filePath = `${basePath}/${filename}`;
    await FileSystem.writeAsStringAsync(filePath, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  /**
   * Helper to find a file in SAF directory by filename
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
   * Helper to find a directory in SAF by name
   */
  private findSafDir(items: string[], dirname: string): string | undefined {
    const encodedDirname = encodeURIComponent(dirname);
    return items.find((item) => {
      const decodedUri = decodeURIComponent(item);
      const lastSegment = item.split("/").pop() || "";
      const decodedLastSegment = decodeURIComponent(lastSegment);

      return (
        item.endsWith(`/${dirname}`) ||
        item.endsWith(`/${encodedDirname}`) ||
        decodedUri.endsWith(`/${dirname}`) ||
        lastSegment === dirname ||
        lastSegment === encodedDirname ||
        decodedLastSegment === dirname
      );
    });
  }

  /**
   * Write data to a file (SAF)
   */
  private async writeFileSaf(
    directoryUri: string,
    filename: string,
    content: string
  ): Promise<void> {
    try {
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
        directoryUri
      );

      const existingFile = this.findSafFile(files, filename);

      if (existingFile) {
        await FileSystem.StorageAccessFramework.writeAsStringAsync(
          existingFile,
          content
        );
      } else {
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          directoryUri,
          filename,
          "application/json"
        );
        await FileSystem.StorageAccessFramework.writeAsStringAsync(
          fileUri,
          content
        );
      }
    } catch (error) {
      console.error("Error writing SAF file:", error);
      throw error;
    }
  }

  /**
   * Read data from a file (local)
   */
  private async readFile(
    basePath: string,
    filename: string
  ): Promise<string | null> {
    try {
      const filePath = `${basePath}/${filename}`;
      const info = await FileSystem.getInfoAsync(filePath);
      if (!info.exists) return null;
      return await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch {
      return null;
    }
  }

  /**
   * Read data from a file (SAF)
   */
  private async readFileSaf(
    directoryUri: string,
    filename: string
  ): Promise<string | null> {
    try {
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
        directoryUri
      );
      const fileUri = this.findSafFile(files, filename);
      if (!fileUri) return null;
      return await FileSystem.StorageAccessFramework.readAsStringAsync(fileUri);
    } catch {
      return null;
    }
  }

  // ============================================
  // PUBLIC DATA ACCESS METHODS
  // ============================================

  /**
   * Save JSON data to a file
   */
  async saveData<T>(filename: string, data: T): Promise<void> {
    if (!this.storagePath) throw new Error("Storage not configured");
    const content = JSON.stringify(data, null, 2);

    if (this.storageType === "saf") {
      await this.writeFileSaf(this.storagePath, filename, content);
    } else {
      await this.writeFile(this.storagePath, filename, content);
    }
  }

  /**
   * Load JSON data from a file
   */
  async loadData<T>(filename: string, defaultValue: T): Promise<T> {
    if (!this.storagePath) return defaultValue;
    try {
      const content =
        this.storageType === "saf"
          ? await this.readFileSaf(this.storagePath, filename)
          : await this.readFile(this.storagePath, filename);
      return content ? JSON.parse(content) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Delete a file
   */
  async deleteData(filename: string): Promise<void> {
    if (!this.storagePath) return;
    try {
      if (this.storageType === "saf") {
        const files =
          await FileSystem.StorageAccessFramework.readDirectoryAsync(
            this.storagePath
          );
        const fileUri = this.findSafFile(files, filename);
        if (fileUri) {
          await FileSystem.StorageAccessFramework.deleteAsync(fileUri);
        }
      } else {
        const filePath = `${this.storagePath}/${filename}`;
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  }

  /**
   * Save data to a subdirectory
   */
  async saveSubData<T>(
    subdir: string,
    filename: string,
    data: T
  ): Promise<void> {
    if (!this.storagePath) throw new Error("Storage not configured");
    const content = JSON.stringify(data, null, 2);

    if (this.storageType === "saf") {
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(
        this.storagePath
      );
      let subdirUri = this.findSafDir(files, subdir);

      if (!subdirUri) {
        subdirUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(
          this.storagePath,
          subdir
        );
      }

      await this.writeFileSaf(subdirUri, filename, content);
    } else {
      const dirPath = `${this.storagePath}/${subdir}`;
      const info = await FileSystem.getInfoAsync(dirPath);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }
      await this.writeFile(dirPath, filename, content);
    }
  }

  /**
   * Load data from a subdirectory
   */
  async loadSubData<T>(
    subdir: string,
    filename: string,
    defaultValue: T
  ): Promise<T> {
    if (!this.storagePath) return defaultValue;
    try {
      if (this.storageType === "saf") {
        const files =
          await FileSystem.StorageAccessFramework.readDirectoryAsync(
            this.storagePath
          );
        const subdirUri = this.findSafDir(files, subdir);
        if (!subdirUri) return defaultValue;

        const content = await this.readFileSaf(subdirUri, filename);
        return content ? JSON.parse(content) : defaultValue;
      } else {
        const content = await this.readFile(
          `${this.storagePath}/${subdir}`,
          filename
        );
        return content ? JSON.parse(content) : defaultValue;
      }
    } catch {
      return defaultValue;
    }
  }

  /**
   * Delete data from a subdirectory
   */
  async deleteSubData(subdir: string, filename: string): Promise<void> {
    if (!this.storagePath) return;
    try {
      if (this.storageType === "saf") {
        const files =
          await FileSystem.StorageAccessFramework.readDirectoryAsync(
            this.storagePath
          );
        const subdirUri = this.findSafDir(files, subdir);
        if (!subdirUri) return;

        const subFiles =
          await FileSystem.StorageAccessFramework.readDirectoryAsync(subdirUri);
        const fileUri = this.findSafFile(subFiles, filename);
        if (fileUri) {
          await FileSystem.StorageAccessFramework.deleteAsync(fileUri);
        }
      } else {
        const filePath = `${this.storagePath}/${subdir}/${filename}`;
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      }
    } catch (error) {
      console.error("Error deleting sub file:", error);
    }
  }

  /**
   * List files in a subdirectory
   */
  async listSubFiles(subdir: string): Promise<string[]> {
    if (!this.storagePath) return [];
    try {
      if (this.storageType === "saf") {
        const files =
          await FileSystem.StorageAccessFramework.readDirectoryAsync(
            this.storagePath
          );
        const subdirUri = this.findSafDir(files, subdir);
        if (!subdirUri) return [];

        const subFiles =
          await FileSystem.StorageAccessFramework.readDirectoryAsync(subdirUri);
        return subFiles.map((uri) => {
          const parts = uri.split("/");
          return decodeURIComponent(parts[parts.length - 1]);
        });
      } else {
        const dirPath = `${this.storagePath}/${subdir}`;
        const info = await FileSystem.getInfoAsync(dirPath);
        if (!info.exists) return [];
        return await FileSystem.readDirectoryAsync(dirPath);
      }
    } catch {
      return [];
    }
  }

  /**
   * Get default storage path (app's document directory)
   */
  getDefaultStoragePath(): string {
    return `${FileSystem.documentDirectory}ziasub_data`;
  }
}

// Export singleton instance
export const fileStorage = new FileStorageService();

// Export file names for reference
export const STORAGE_FILES = FILES;
