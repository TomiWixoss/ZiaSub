/**
 * Update Modal - Shows update notification and download progress
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@src/contexts";
import { useTranslation } from "react-i18next";
import {
  updateService,
  ReleaseInfo,
  UpdateCheckResult,
} from "@services/updateService";

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
  const [error, setError] = useState<string | null>(null);

  const updateResult = externalResult;
  const release = updateResult?.latestRelease;

  const handleDownload = async () => {
    if (!release?.apkUrl) {
      if (release?.htmlUrl) {
        await updateService.openReleasePage(release.htmlUrl);
      }
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      const fileUri = await updateService.downloadApk(
        release.apkUrl,
        (progress) => setDownloadProgress(progress)
      );

      if (fileUri) {
        await updateService.installApk(fileUri);
      }
    } catch (err) {
      setError(t("update.downloadError"));
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenRelease = async () => {
    if (release?.htmlUrl) {
      await updateService.openReleasePage(release.htmlUrl);
    }
  };

  const handleDismiss = () => {
    onDismissUpdate?.();
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatChangelog = (body: string) => {
    // Simple markdown-like formatting
    return body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  };

  if (!updateResult?.hasUpdate || !release) {
    return null;
  }

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
          {release.body && (
            <View style={styles.changelogSection}>
              <Text style={[styles.changelogTitle, { color: colors.text }]}>
                {t("update.changelog")}
              </Text>
              <ScrollView
                style={[
                  styles.changelogScroll,
                  { backgroundColor: colors.surfaceLight },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {formatChangelog(release.body).map((line, index) => (
                  <View key={index} style={styles.changelogLine}>
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
                <View
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
                {Math.round(downloadProgress * 100)}%
              </Text>
            </View>
          )}

          {/* Buttons */}
          {!downloading && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.laterButton, { borderColor: colors.border }]}
                onPress={handleDismiss}
              >
                <Text
                  style={[
                    styles.laterButtonText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("update.later")}
                </Text>
              </TouchableOpacity>

              {Platform.OS === "android" && release.apkUrl ? (
                <TouchableOpacity
                  style={[
                    styles.downloadButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleDownload}
                >
                  <Ionicons name="download" size={18} color="#fff" />
                  <Text style={styles.downloadButtonText}>
                    {t("update.download")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.downloadButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleOpenRelease}
                >
                  <Ionicons name="open-outline" size={18} color="#fff" />
                  <Text style={styles.downloadButtonText}>
                    {t("update.viewRelease")}
                  </Text>
                </TouchableOpacity>
              )}
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
    padding: 12,
  },
  changelogLine: {
    flexDirection: "row",
    marginBottom: 6,
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
    gap: 6,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  laterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  laterButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  downloadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  downloadButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default UpdateModal;
