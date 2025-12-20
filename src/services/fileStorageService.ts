/**
 * File Storage Service - Manages all app data storage using file system
 */
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage path key in AsyncStorage (only stores the path, not data)
const STORAGE_PATH_KEY = "@app_storage_path";
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

class FileStorageService {
  private storagePath: string | null = null;
  private initialized: boolean = false;

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<boolean> {
    if (this.initialized && this.storagePath) return true;

    try {
      const savedPath = await AsyncStorage.getItem(STORAGE_PATH_KEY);
      if (savedPath) {
        const dirInfo = await FileSystem.getInfoAsync(savedPath);
        if (dirInfo.exists && dirInfo.isDirectory) {
          this.storagePath = savedPath;
          this.initialized = true;
          return true;
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
   * Set storage path and create necessary structure
   */
  async setStoragePath(path: string): Promise<void> {
    try {
      // Ensure directory exists
      const dirInfo = await FileSystem.getInfoAsync(path);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(path, { intermediates: true });
      }

      // Create subdirectories
      await this.ensureDirectories(path);

      // Create marker file
      await this.writeFile(
        path,
        FILES.marker,
        JSON.stringify({
          createdAt: Date.now(),
          version: "1.0",
        })
      );

      // Save path to AsyncStorage
      await AsyncStorage.setItem(STORAGE_PATH_KEY, path);
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
      const markerPath = `${path}/${FILES.marker}`;
      const info = await FileSystem.getInfoAsync(markerPath);
      return info.exists;
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

      const markerContent = await this.readFile(path, FILES.marker);
      const marker = markerContent ? JSON.parse(markerContent) : {};

      // Count chat sessions
      let chatCount = 0;
      try {
        const chatContent = await this.readFile(path, FILES.chatSessions);
        if (chatContent) {
          const sessions = JSON.parse(chatContent);
          chatCount = Array.isArray(sessions) ? sessions.length : 0;
        }
      } catch {}

      // Count translations
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
   * Clear all data in storage
   */
  async clearAllData(): Promise<void> {
    if (!this.storagePath) throw new Error("Storage not configured");

    try {
      // Delete all files and subdirectories
      const items = await FileSystem.readDirectoryAsync(this.storagePath);
      for (const item of items) {
        const itemPath = `${this.storagePath}/${item}`;
        await FileSystem.deleteAsync(itemPath, { idempotent: true });
      }

      // Recreate structure
      await this.ensureDirectories(this.storagePath);

      // Recreate marker
      await this.writeFile(
        this.storagePath,
        FILES.marker,
        JSON.stringify({
          createdAt: Date.now(),
          version: "1.0",
        })
      );
    } catch (error) {
      console.error("Error clearing data:", error);
      throw error;
    }
  }

  /**
   * Reset storage (clear path, requires re-onboarding)
   */
  async resetStorage(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_PATH_KEY);
    this.storagePath = null;
    this.initialized = false;
  }

  /**
   * Ensure all necessary directories exist
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
   * Write data to a file
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
   * Read data from a file
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

  // ============================================
  // PUBLIC DATA ACCESS METHODS
  // ============================================

  /**
   * Save JSON data to a file
   */
  async saveData<T>(filename: string, data: T): Promise<void> {
    if (!this.storagePath) throw new Error("Storage not configured");
    await this.writeFile(
      this.storagePath,
      filename,
      JSON.stringify(data, null, 2)
    );
  }

  /**
   * Load JSON data from a file
   */
  async loadData<T>(filename: string, defaultValue: T): Promise<T> {
    if (!this.storagePath) return defaultValue;
    try {
      const content = await this.readFile(this.storagePath, filename);
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
      const filePath = `${this.storagePath}/${filename}`;
      await FileSystem.deleteAsync(filePath, { idempotent: true });
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
    const dirPath = `${this.storagePath}/${subdir}`;
    const info = await FileSystem.getInfoAsync(dirPath);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
    await this.writeFile(dirPath, filename, JSON.stringify(data, null, 2));
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
      const content = await this.readFile(
        `${this.storagePath}/${subdir}`,
        filename
      );
      return content ? JSON.parse(content) : defaultValue;
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
      const filePath = `${this.storagePath}/${subdir}/${filename}`;
      await FileSystem.deleteAsync(filePath, { idempotent: true });
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
      const dirPath = `${this.storagePath}/${subdir}`;
      const info = await FileSystem.getInfoAsync(dirPath);
      if (!info.exists) return [];
      return await FileSystem.readDirectoryAsync(dirPath);
    } catch {
      return [];
    }
  }

  /**
   * Pick a directory using document picker
   */
  async pickDirectory(): Promise<string | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: false,
      });

      if (result.canceled || !result.assets?.[0]) return null;

      // Get parent directory of selected file
      const uri = result.assets[0].uri;
      const parentDir = uri.substring(0, uri.lastIndexOf("/"));
      return parentDir;
    } catch (error) {
      console.error("Error picking directory:", error);
      return null;
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
