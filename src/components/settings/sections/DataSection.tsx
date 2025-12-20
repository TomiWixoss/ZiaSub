import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { fileStorage } from "@services/fileStorageService";
import { setOnboardingCompleted } from "@utils/storage";

interface DataInfo {
  storagePath: string | null;
  chatCount: number;
  translationCount: number;
}

export const DataSection: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [dataInfo, setDataInfo] = useState<DataInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadDataInfo();
  }, []);

  const loadDataInfo = async () => {
    setLoading(true);
    try {
      const path = fileStorage.getStoragePath();
      if (path) {
        const info = await fileStorage.getDataInfo(path);
        setDataInfo({
          storagePath: path,
          chatCount: info.chatCount || 0,
          translationCount: info.translationCount || 0,
        });
      } else {
        setDataInfo({
          storagePath: null,
          chatCount: 0,
          translationCount: 0,
        });
      }
    } catch {
      setDataInfo(null);
    }
    setLoading(false);
  };

  const handleClearAllData = () => {
    Alert.alert(
      t("settings.data.clearAllTitle"),
      t("settings.data.clearAllMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("settings.data.clearConfirm"),
          style: "destructive",
          onPress: confirmClearData,
        },
      ]
    );
  };

  const confirmClearData = async () => {
    setClearing(true);
    try {
      await fileStorage.clearAllData();
      await loadDataInfo();
      Alert.alert(t("common.success"), t("settings.data.clearSuccess"));
    } catch (error) {
      Alert.alert(t("common.error"), t("settings.data.clearError"));
    }
    setClearing(false);
  };

  const handleResetStorage = () => {
    Alert.alert(
      t("settings.data.resetTitle"),
      t("settings.data.resetMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("settings.data.resetConfirm"),
          style: "destructive",
          onPress: confirmResetStorage,
        },
      ]
    );
  };

  const confirmResetStorage = async () => {
    try {
      await fileStorage.resetStorage();
      await setOnboardingCompleted(false);
      Alert.alert(t("common.success"), t("settings.data.resetSuccess"), [
        {
          text: t("common.ok"),
          onPress: () => {
            // Reload app - this will trigger onboarding
            // In a real app, you might use expo-updates or similar
          },
        },
      ]);
    } catch (error) {
      Alert.alert(t("common.error"), t("settings.data.resetError"));
    }
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
      {/* Storage Path Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.surfaceLight }]}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="folder"
            size={20}
            color={colors.primary}
          />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {t("settings.data.storagePath")}
            </Text>
            <Text
              style={[styles.infoValue, { color: colors.text }]}
              numberOfLines={2}
            >
              {dataInfo?.storagePath || t("settings.data.notConfigured")}
            </Text>
          </View>
        </View>
      </View>

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

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
            },
          ]}
          onPress={handleClearAllData}
          disabled={clearing}
        >
          {clearing ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <MaterialCommunityIcons
              name="delete-sweep"
              size={20}
              color={colors.error}
            />
          )}
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: colors.error }]}>
              {t("settings.data.clearAll")}
            </Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
              {t("settings.data.clearAllDesc")}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
            },
          ]}
          onPress={handleResetStorage}
        >
          <MaterialCommunityIcons
            name="folder-refresh"
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
              {t("settings.data.resetStorage")}
            </Text>
            <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>
              {t("settings.data.resetStorageDesc")}
            </Text>
          </View>
        </TouchableOpacity>
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
  infoCard: {
    padding: 16,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
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
