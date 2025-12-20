/**
 * Update Modal - Shows update notification and download progress
 */
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@src/contexts";
import { useTranslation } from "react-i18next";
import { updateService, UpdateCheckResult } from "@services/updateService";
import Button3D from "./Button3D";

interface UpdateModalProps {
  visible: boolean;
  onClose: () => void;
  updateResult?: UpdateCheckResult | null;
  onDismissUpdate?: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  onClose,
  updateResult: externalResult,
  onDismissUpdate,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedUri, setDownloadedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const downloadingRef = useRef(false);

  const updateResult = externalResult;
  const release = updateResult?.latestRelease;

  const handleDownload = async () => {
    if (!release?.apkUrl || downloadingRef.current) {
      if (release?.htmlUrl && !downloadingRef.current) {
        await updateService.openReleasePage(release.htmlUrl);
      }
      return;
    }

    downloadingRef.current = true;
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadedUri(null);
    setError(null);

    try {
      const fileUri = await updateService.downloadApk(
        release.apkUrl,
        (progress) => {
          if (downloadingRef.current) {
            setDownloadProgress(progress);
          }
        }
      );

      if (fileUri && downloadingRef.current) {
        setDownloadProgress(1);
        downloadingRef.current = false;

        // Auto install immediately after download
        try {
          await updateService.installApk(fileUri);
          // Installer opened, close modal
          setDownloading(false);
          handleDismiss();
        } catch (installError) {
          console.error("Install error:", installError);
          setError(t("update.installError"));
          setDownloadedUri(fileUri); // Save for retry
          setDownloading(false);
        }
      } else if (downloadingRef.current) {
        setError(t("update.downloadError"));
        setDownloading(false);
        downloadingRef.current = false;
      }
    } catch (err) {
      console.error("Download error:", err);
      if (downloadingRef.current) {
        setError(t("update.downloadError"));
        setDownloading(false);
        downloadingRef.current = false;
      }
    }
  };

  const handleInstall = async () => {
    if (!downloadedUri) return;

    try {
      await updateService.installApk(downloadedUri);
      // Installer opened, close modal
      handleDismiss();
    } catch (installError) {
      console.error("Install error:", installError);
      setError(t("update.installError"));
    }
  };

  const handleOpenRelease = async () => {
    if (release?.htmlUrl) {
      await updateService.openReleasePage(release.htmlUrl);
    }
  };

  const handleDismiss = () => {
    // Cancel download if in progress
    downloadingRef.current = false;
    setDownloading(false);
    setDownloadProgress(0);
    setDownloadedUri(null);
    setError(null);
    onDismissUpdate?.();
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatChangelog = (body: string) => {
    return body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  };

  if (!updateResult?.hasUpdate || !release) {
    return null;
  }

  const changelogLines = release.body ? formatChangelog(release.body) : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="arrow-up-circle"
                size={32}
                color={colors.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]}>
                {t("update.available")}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                v{release.version} • {formatDate(release.publishedAt)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Version Info */}
          <View
            style={[
              styles.versionBox,
              { backgroundColor: colors.surfaceLight },
            ]}
          >
            <View style={styles.versionRow}>
              <Text
                style={[styles.versionLabel, { color: colors.textSecondary }]}
              >
                {t("update.currentVersion")}
              </Text>
              <Text style={[styles.versionValue, { color: colors.textMuted }]}>
                v{updateResult.currentVersion}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
            <View style={styles.versionRow}>
              <Text
                style={[styles.versionLabel, { color: colors.textSecondary }]}
              >
                {t("update.newVersion")}
              </Text>
              <Text style={[styles.versionValue, { color: colors.primary }]}>
                v{release.version}
              </Text>
            </View>
          </View>

          {/* Changelog */}
          {changelogLines.length > 0 && (
            <View style={styles.changelogSection}>
              <Text style={[styles.changelogTitle, { color: colors.text }]}>
                {t("update.changelog")}
              </Text>
              <ScrollView
                style={[
                  styles.changelogScroll,
                  { backgroundColor: colors.surfaceLight },
                ]}
                contentContainerStyle={styles.changelogContent}
                showsVerticalScrollIndicator={false}
              >
                {changelogLines.map((line, index) => (
                  <View
                    key={index}
                    style={[
                      styles.changelogLine,
                      index === changelogLines.length - 1 && styles.lastLine,
                    ]}
                  >
                    {line.startsWith("-") || line.startsWith("*") ? (
                      <>
                        <Text
                          style={[styles.bullet, { color: colors.primary }]}
                        >
                          •
                        </Text>
                        <Text
                          style={[
                            styles.changelogText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {line.substring(1).trim()}
                        </Text>
                      </>
                    ) : line.startsWith("#") ? (
                      <Text
                        style={[
                          styles.changelogHeading,
                          { color: colors.text },
                        ]}
                      >
                        {line.replace(/^#+\s*/, "")}
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.changelogText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {line}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Error */}
          {error && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: `${colors.error}15` },
              ]}
            >
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            </View>
          )}

          {/* Progress */}
          {downloading && (
            <View style={styles.downloadProgress}>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: colors.surfaceLight },
                ]}
              >
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${downloadProgress * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text
                style={[styles.progressText, { color: colors.textSecondary }]}
              >
                {t("update.downloading")} {Math.round(downloadProgress * 100)}%
              </Text>
            </View>
          )}

          {/* Buttons */}
          {!downloading && (
            <View style={styles.buttonRow}>
              <View style={styles.buttonWrapper}>
                <Button3D
                  title={t("update.later")}
                  variant="outline"
                  onPress={handleDismiss}
                />
              </View>
              <View style={styles.buttonWrapper}>
                {downloadedUri ? (
                  <Button3D
                    title={t("update.install")}
                    icon="download"
                    variant="primary"
                    onPress={handleInstall}
                  />
                ) : Platform.OS === "android" && release.apkUrl ? (
                  <Button3D
                    title={t("update.download")}
                    icon="download"
                    variant="primary"
                    onPress={handleDownload}
                  />
                ) : (
                  <Button3D
                    title={t("update.viewRelease")}
                    icon="open-in-new"
                    variant="primary"
                    onPress={handleOpenRelease}
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerIcon: {},
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  versionBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  versionRow: {
    alignItems: "center",
  },
  versionLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  versionValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  changelogSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  changelogTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  changelogScroll: {
    maxHeight: 180,
    borderRadius: 10,
  },
  changelogContent: {
    padding: 12,
    paddingBottom: 16,
  },
  changelogLine: {
    flexDirection: "row",
    marginBottom: 6,
  },
  lastLine: {
    marginBottom: 0,
  },
  bullet: {
    fontSize: 14,
    marginRight: 8,
    fontWeight: "600",
  },
  changelogText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  changelogHeading: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  downloadProgress: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  progressText: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  buttonWrapper: {
    flex: 1,
  },
});

export default UpdateModal;
