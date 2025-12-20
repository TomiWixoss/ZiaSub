import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import Button3D from "@components/common/Button3D";
import { Ionicons } from "@expo/vector-icons";
import { fileStorage } from "@services/fileStorageService";

interface StepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

interface DataInfo {
  hasData: boolean;
  createdAt?: number;
  chatCount?: number;
  translationCount?: number;
}

export const StorageStep: React.FC<StepProps> = ({ onNext, onPrevious }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [dataInfo, setDataInfo] = useState<DataInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Set default path on mount
    const defaultPath = fileStorage.getDefaultStoragePath();
    setSelectedPath(defaultPath);
    checkExistingData(defaultPath);
  }, []);

  const checkExistingData = async (path: string) => {
    setChecking(true);
    try {
      const info = await fileStorage.getDataInfo(path);
      setDataInfo(info);
    } catch {
      setDataInfo({ hasData: false });
    }
    setChecking(false);
  };

  const handleUseDefault = async () => {
    const defaultPath = fileStorage.getDefaultStoragePath();
    setSelectedPath(defaultPath);
    await checkExistingData(defaultPath);
  };

  const handleConfirm = async (restore: boolean = false) => {
    if (!selectedPath) return;

    setLoading(true);
    try {
      if (dataInfo?.hasData && !restore) {
        // Clear existing data
        await fileStorage.setStoragePath(selectedPath);
        await fileStorage.clearAllData();
      } else {
        // Use existing data or create new
        await fileStorage.setStoragePath(selectedPath);
      }
      onNext();
    } catch (error) {
      Alert.alert(t("common.error"), t("onboarding.storage.errorSetup"));
    }
    setLoading(false);
  };

  const handleDataChoice = () => {
    if (!dataInfo?.hasData) {
      handleConfirm();
      return;
    }

    Alert.alert(
      t("onboarding.storage.existingDataTitle"),
      t("onboarding.storage.existingDataMessage", {
        chats: dataInfo.chatCount || 0,
        translations: dataInfo.translationCount || 0,
      }),
      [
        {
          text: t("onboarding.storage.restore"),
          onPress: () => handleConfirm(true),
        },
        {
          text: t("onboarding.storage.clearAndNew"),
          style: "destructive",
          onPress: () => handleConfirm(false),
        },
        {
          text: t("common.cancel"),
          style: "cancel",
        },
      ]
    );
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.surfaceLight },
          ]}
        >
          <Ionicons name="folder-open" size={64} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {t("onboarding.storage.title")}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t("onboarding.storage.subtitle")}
        </Text>

        {/* Selected Path Display */}
        <View
          style={[
            styles.pathContainer,
            {
              backgroundColor: colors.surfaceLight,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="folder" size={24} color={colors.primary} />
          <Text
            style={[styles.pathText, { color: colors.text }]}
            numberOfLines={2}
          >
            {selectedPath || t("onboarding.storage.noPath")}
          </Text>
        </View>

        {/* Data Info */}
        {checking ? (
          <View style={styles.infoContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {t("onboarding.storage.checking")}
            </Text>
          </View>
        ) : dataInfo?.hasData ? (
          <View
            style={[
              styles.dataInfoContainer,
              { backgroundColor: `${colors.success}20` },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
            />
            <View style={styles.dataInfoContent}>
              <Text style={[styles.dataInfoTitle, { color: colors.text }]}>
                {t("onboarding.storage.dataFound")}
              </Text>
              <Text
                style={[styles.dataInfoDetail, { color: colors.textSecondary }]}
              >
                {t("onboarding.storage.dataDetail", {
                  chats: dataInfo.chatCount || 0,
                  translations: dataInfo.translationCount || 0,
                  date: formatDate(dataInfo.createdAt),
                })}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.infoContainer}>
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {t("onboarding.storage.newStorage")}
            </Text>
          </View>
        )}

        {/* Path Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={handleUseDefault}
          >
            <Ionicons name="home" size={20} color={colors.primary} />
            <Text style={[styles.optionText, { color: colors.text }]}>
              {t("onboarding.storage.useDefault")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <Button3D
            title={t("onboarding.back")}
            onPress={onPrevious}
            variant="secondary"
            style={styles.backButton}
          />
          <Button3D
            title={loading ? t("common.loading") : t("onboarding.continue")}
            onPress={handleDataChoice}
            disabled={!selectedPath || loading}
            style={styles.nextButton}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  pathContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
    gap: 12,
    marginBottom: 16,
  },
  pathText: {
    flex: 1,
    fontSize: 13,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
  },
  dataInfoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  dataInfoContent: {
    flex: 1,
  },
  dataInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  dataInfoDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
  optionsContainer: {
    width: "100%",
    gap: 12,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    paddingTop: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
