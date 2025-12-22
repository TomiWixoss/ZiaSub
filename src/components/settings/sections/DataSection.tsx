import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { storageService } from "@services/storageService";
import { backupService } from "@services/backupService";
import { showAlert } from "@components/common/CustomAlert";
import * as FileSystem from "expo-file-system/legacy";
import * as Updates from "expo-updates";

interface DataInfo {
  backupPath: string | null;
  lastBackupTime: number | null;
  autoBackupEnabled: boolean;
  chatCount: number;
  translationCount: number;
}

export const DataSection: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [dataInfo, setDataInfo] = useState<DataInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadDataInfo();
  }, []);

  const loadDataInfo = async () => {
    setLoading(true);
    try {
      const [backupPath, lastBackupTime, autoBackupEnabled] = await Promise.all(
        [
          storageService.getBackupPath(),
          storageService.getLastBackupTime(),
          storageService.isAutoBackupEnabled(),
        ]
      );

      const chatSessions = storageService.getChatSessions();
      const translationIds = storageService.getTranslationVideoIds();

      setDataInfo({
        backupPath,
        lastBackupTime,
        autoBackupEnabled,
        chatCount: chatSessions.length,
        translationCount: translationIds.length,
      });
    } catch {
      setDataInfo(null);
    }
    setLoading(false);
  };

  const handleChangeBackupPath = async () => {
    try {
      if (Platform.OS === "android") {
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (permissions.granted) {
          await backupService.setupBackupPath(permissions.directoryUri);
          await loadDataInfo();
          showAlert(
            t("common.success"),
            t("settings.data.pathChanged"),
            [{ text: t("common.ok") }],
            "success"
          );
        }
      } else {
        showAlert(t("common.notice"), t("onboarding.storage.iosDefaultOnly"), [
          { text: t("common.ok") },
        ]);
      }
    } catch (error) {
      showAlert(
        t("common.error"),
        t("settings.data.pathChangeError"),
        [{ text: t("common.ok") }],
        "error"
      );
    }
  };

  const handleBackupNow = async () => {
    setBacking(true);
    try {
      await backupService.createBackup();
      await loadDataInfo();
      showAlert(
        t("common.success"),
        t("settings.data.backupSuccess"),
        [{ text: t("common.ok") }],
        "success"
      );
    } catch (error) {
      showAlert(
        t("common.error"),
        t("settings.data.backupError"),
        [{ text: t("common.ok") }],
        "error"
      );
    }
    setBacking(false);
  };

  const handleRestore = async () => {
    showAlert(
      t("settings.data.restoreTitle"),
      t("settings.data.restoreMessage"),
      [
        {
          text: t("settings.data.restoreConfirm"),
          onPress: confirmRestore,
        },
        {
          text: t("common.cancel"),
          style: "cancel",
        },
      ],
      "warning"
    );
  };

  const confirmRestore = async () => {
    setRestoring(true);
    try {
      await backupService.restoreBackup();
      await loadDataInfo();
      showAlert(
        t("common.success"),
        t("settings.data.restoreSuccess"),
        [
          {
            text: t("common.ok"),
            onPress: async () => {
              await Updates.reloadAsync();
            },
          },
        ],
        "success"
      );
    } catch (error) {
      showAlert(
        t("common.error"),
        t("settings.data.restoreError"),
        [{ text: t("common.ok") }],
        "error"
      );
    }
    setRestoring(false);
  };

  const handleToggleAutoBackup = async () => {
    const newValue = !dataInfo?.autoBackupEnabled;
    await storageService.setAutoBackupEnabled(newValue);
    await loadDataInfo();
  };

  const handleClearAllData = () => {
    showAlert(
      t("settings.data.clearAllTitle"),
      t("settings.data.clearAllMessage"),
      [
        {
          text: t("settings.data.clearConfirm"),
          style: "destructive",
          onPress: confirmClearData,
        },
        {
          text: t("common.cancel"),
          style: "cancel",
        },
      ],
      "warning"
    );
  };

  const confirmClearData = async () => {
    try {
      await storageService.clearAllData();
      await loadDataInfo();
      showAlert(
        t("common.success"),
        t("settings.data.clearSuccess"),
        [{ text: t("common.ok") }],
        "success"
      );
    } catch (error) {
      showAlert(
        t("common.error"),
        t("settings.data.clearError"),
        [{ text: t("common.ok") }],
        "error"
      );
    }
  };

  const handleResetApp = () => {
    showAlert(
      t("settings.data.resetTitle"),
      t("settings.data.resetMessage"),
      [
        {
          text: t("settings.data.resetConfirm"),
          style: "destructive",
          onPress: confirmResetApp,
        },
        {
          text: t("common.cancel"),
          style: "cancel",
        },
      ],
      "warning"
    );
  };

  const confirmResetApp = async () => {
    try {
      await storageService.clearAllData();
      await storageService.setOnboardingCompleted(false);
      await Updates.reloadAsync();
    } catch (error) {
      showAlert(
        t("common.error"),
        t("settings.data.resetError"),
        [{ text: t("common.ok") }],
        "error"
      );
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return t("settings.data.never");
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Data Stats */}
      <View style={styles.statsRow}>
        <View
          style={[styles.statCard, { backgroundColor: colors.surfaceLight }]}
        >
          <MaterialCommunityIcons
            name="chat"
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {dataInfo?.chatCount || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t("settings.data.chatSessions")}
          </Text>
        </View>

        <View
          style={[styles.statCard, { backgroundColor: colors.surfaceLight }]}
        >
          <MaterialCommunityIcons
            name="translate"
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {dataInfo?.translationCount || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t("settings.data.translations")}
          </Text>
        </View>
      </View>

      {/* Backup Path Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.surfaceLight }]}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="folder-sync"
            size={20}
            color={colors.primary}
          />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {t("settings.data.backupPath")}
            </Text>
            <Text
              style={[styles.infoValue, { color: colors.text }]}
              numberOfLines={2}
            >
              {dataInfo?.backupPath || t("settings.data.notConfigured")}
            </Text>
          </View>
          <Pressable onPress={handleChangeBackupPath}>
            <MaterialCommunityIcons
              name="pencil"
              size={20}
              color={colors.primary}
            />
          </Pressable>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={20}
            color={colors.textSecondary}
          />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {t("settings.data.lastBackup")}
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {formatDate(dataInfo?.lastBackupTime || null)}
            </Text>
          </View>
        </View>
      </View>

      {/* Backup Actions */}
      <View style={styles.actionsContainer}>
        <Pressable
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.primary + "15",
              borderColor: colors.primary,
            },
          ]}
          onPress={handleBackupNow}
          disabled={backing || !dataInfo?.backupPath}
        >
          {backing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialCommunityIcons
              name="cloud-upload"
              size={20}
              color={colors.primary}
            />
          )}
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: colors.primary }]}>
              {t("settings.data.backupNow")}
            </Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
              {t("settings.data.backupNowDesc")}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
            },
          ]}
          onPress={handleRestore}
          disabled={restoring || !dataInfo?.backupPath}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <MaterialCommunityIcons
              name="cloud-download"
              size={20}
              color={colors.text}
            />
          )}
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>
              {t("settings.data.restore")}
            </Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
              {t("settings.data.restoreDesc")}
            </Text>
          </View>
        </Pressable>

        {/* Auto Backup Toggle */}
        <Pressable
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
            },
          ]}
          onPress={handleToggleAutoBackup}
        >
          <MaterialCommunityIcons
            name={dataInfo?.autoBackupEnabled ? "sync" : "sync-off"}
            size={20}
            color={
              dataInfo?.autoBackupEnabled
                ? colors.success
                : colors.textSecondary
            }
          />
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: colors.text }]}>
              {t("settings.data.autoBackup")}
            </Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
              {dataInfo?.autoBackupEnabled
                ? t("settings.data.autoBackupOn")
                : t("settings.data.autoBackupOff")}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={
              dataInfo?.autoBackupEnabled
                ? "toggle-switch"
                : "toggle-switch-off"
            }
            size={32}
            color={
              dataInfo?.autoBackupEnabled
                ? colors.success
                : colors.textSecondary
            }
          />
        </Pressable>
      </View>

      {/* Danger Zone */}
      <Text style={[styles.sectionTitle, { color: colors.error }]}>
        {t("settings.data.dangerZone")}
      </Text>
      <View style={styles.actionsContainer}>
        <Pressable
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
            },
          ]}
          onPress={handleClearAllData}
        >
          <MaterialCommunityIcons
            name="delete-sweep"
            size={20}
            color={colors.error}
          />
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: colors.error }]}>
              {t("settings.data.clearAll")}
            </Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
              {t("settings.data.clearAllDesc")}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
            },
          ]}
          onPress={handleResetApp}
        >
          <MaterialCommunityIcons
            name="restart"
            size={20}
            color={colors.warning || colors.error}
          />
          <View style={styles.actionContent}>
            <Text
              style={[
                styles.actionTitle,
                { color: colors.warning || colors.error },
              ]}
            >
              {t("settings.data.resetApp")}
            </Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
              {t("settings.data.resetAppDesc")}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  loadingContainer: {
    padding: 24,
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
  },
});
