/**
 * Update Service - Check for app updates from GitHub releases
 */
import { Paths, File } from "expo-file-system/next";
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
  return Application.nativeApplicationVersion || "1.0.0";
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
    const fileName = apkUrl.split("/").pop() || "update.apk";
    const fileUri = `${Paths.cache.uri}/${fileName}`;

    // Download using fetch and write to file
    const response = await fetch(apkUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Cannot read response body");
    }

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (total > 0) {
        onProgress?.(loaded / total);
      }
    }

    // Combine chunks and write to file
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const file = new File(fileUri);
    await file.write(combined);

    return fileUri;
  } catch (error) {
    console.error("Error downloading APK:", error);
    return null;
  }
};

/**
 * Install APK (Android only) - Opens the file for installation
 */
export const installApk = async (fileUri: string): Promise<void> => {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    // Use IntentLauncher to open APK installer
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: fileUri,
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      type: "application/vnd.android.package-archive",
    });
  } catch (error) {
    console.error("Error installing APK:", error);
    // Fallback to Linking
    try {
      await Linking.openURL(fileUri);
    } catch (linkError) {
      console.error("Fallback linking failed:", linkError);
    }
  }
};

export const updateService = {
  getCurrentVersion,
  fetchLatestRelease,
  checkForUpdate,
  openReleasePage,
  downloadApk,
  installApk,
};
