/**
 * Update Service - Check for app updates from GitHub releases
 */
import * as FileSystem from "expo-file-system/legacy";
import { Linking, Platform } from "react-native";
import * as Application from "expo-application";
import * as IntentLauncher from "expo-intent-launcher";

const GITHUB_OWNER = "TomiWixoss";
const GITHUB_REPO = "ZiaSub";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export interface ReleaseInfo {
  version: string;
  tagName: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  apkUrl: string | null;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestRelease: ReleaseInfo | null;
}

/**
 * Get current app version from app.json
 */
export const getCurrentVersion = (): string => {
  return Application.nativeApplicationVersion || "0.0.1";
};

/**
 * Compare two semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
const compareVersions = (v1: string, v2: string): number => {
  const normalize = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const parts1 = normalize(v1);
  const parts2 = normalize(v2);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

/**
 * Fetch latest release info from GitHub
 */
export const fetchLatestRelease = async (): Promise<ReleaseInfo | null> => {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      console.warn("Failed to fetch release:", response.status);
      return null;
    }

    const data = await response.json();

    // Find APK asset
    const apkAsset = data.assets?.find(
      (asset: any) =>
        asset.name.endsWith(".apk") ||
        asset.content_type === "application/vnd.android.package-archive"
    );

    return {
      version: data.tag_name?.replace(/^v/, "") || data.name,
      tagName: data.tag_name,
      name: data.name,
      body: data.body || "",
      publishedAt: data.published_at,
      htmlUrl: data.html_url,
      apkUrl: apkAsset?.browser_download_url || null,
    };
  } catch (error) {
    console.error("Error fetching release:", error);
    return null;
  }
};

/**
 * Check if update is available
 */
export const checkForUpdate = async (): Promise<UpdateCheckResult> => {
  const currentVersion = getCurrentVersion();
  const latestRelease = await fetchLatestRelease();

  if (!latestRelease) {
    return {
      hasUpdate: false,
      currentVersion,
      latestRelease: null,
    };
  }

  const hasUpdate = compareVersions(latestRelease.version, currentVersion) > 0;

  return {
    hasUpdate,
    currentVersion,
    latestRelease,
  };
};

/**
 * Open GitHub release page
 */
export const openReleasePage = async (url: string): Promise<void> => {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  } catch (error) {
    console.error("Error opening release page:", error);
  }
};

// Store download resumable for cancellation
let currentDownload: FileSystem.DownloadResumable | null = null;

/**
 * Cancel current download
 */
export const cancelDownload = async (): Promise<void> => {
  if (currentDownload) {
    try {
      await currentDownload.pauseAsync();
      currentDownload = null;
    } catch (error) {
      console.error("Error cancelling download:", error);
    }
  }
};

/**
 * Download APK file (Android only)
 */
export const downloadApk = async (
  apkUrl: string,
  onProgress?: (progress: number) => void
): Promise<string | null> => {
  if (Platform.OS !== "android") {
    return null;
  }

  try {
    // Cancel any existing download
    await cancelDownload();

    const fileName = `ziasub-update-${Date.now()}.apk`;
    const fileUri = FileSystem.documentDirectory + fileName;

    console.log("Starting download from:", apkUrl);
    console.log("Saving to:", fileUri);

    // Create download resumable with progress callback
    currentDownload = FileSystem.createDownloadResumable(
      apkUrl,
      fileUri,
      {},
      (downloadProgress) => {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        console.log("Download progress:", Math.round(progress * 100) + "%");
        onProgress?.(progress);
      }
    );

    const result = await currentDownload.downloadAsync();
    currentDownload = null;

    console.log("Download result:", result);

    if (result?.uri) {
      return result.uri;
    }

    return null;
  } catch (error) {
    console.error("Error downloading APK:", error);
    currentDownload = null;
    return null;
  }
};

/**
 * Install APK (Android only) - Opens the file for installation
 */
export const installApk = async (fileUri: string): Promise<boolean> => {
  if (Platform.OS !== "android") {
    return false;
  }

  console.log("Installing APK from:", fileUri);

  try {
    // Get content URI for the file
    const contentUri = await FileSystem.getContentUriAsync(fileUri);
    console.log("Content URI:", contentUri);

    // Use IntentLauncher with INSTALL_PACKAGE action (requires REQUEST_INSTALL_PACKAGES permission)
    await IntentLauncher.startActivityAsync(
      "android.intent.action.INSTALL_PACKAGE",
      {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      }
    );
    console.log("INSTALL_PACKAGE intent launched");
    return true;
  } catch (error) {
    console.error("Error installing APK:", error);
    throw error;
  }
};

export const updateService = {
  getCurrentVersion,
  fetchLatestRelease,
  checkForUpdate,
  openReleasePage,
  downloadApk,
  installApk,
  cancelDownload,
};
