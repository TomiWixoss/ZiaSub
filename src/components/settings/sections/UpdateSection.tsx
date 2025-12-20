/**
 * Update Section - Check for app updates
 */
import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import { updateService } from "@services/updateService";
import { useUpdate } from "../../../../App";

const UpdateSection: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(updateThemedStyles);
  const { hasUpdate, updateResult, showUpdateModal } = useUpdate();

  const [checking, setChecking] = useState(false);

  const checkUpdate = useCallback(async () => {
    if (hasUpdate && updateResult) {
      // Already have update info, just show modal
      showUpdateModal();
      return;
    }

    setChecking(true);
    try {
      const result = await updateService.checkForUpdate();
      if (result.hasUpdate) {
        showUpdateModal();
      }
    } catch (err) {
      console.error("Update check failed:", err);
    } finally {
      setChecking(false);
    }
  }, [hasUpdate, updateResult, showUpdateModal]);

  const currentVersion = updateService.getCurrentVersion();

  return (
    <View style={styles.container}>
      <View style={styles.versionRow}>
        <Text style={themedStyles.label}>{t("update.currentVersion")}</Text>
        <Text style={themedStyles.version}>v{currentVersion}</Text>
      </View>

      {hasUpdate && updateResult?.latestRelease && (
        <TouchableOpacity
          style={[styles.updateBox, themedStyles.updateBox]}
          onPress={showUpdateModal}
          activeOpacity={0.7}
        >
          <View style={styles.updateHeader}>
            <MaterialCommunityIcons
              name="arrow-up-circle"
              size={24}
              color={colors.primary}
            />
            <View style={styles.updateInfo}>
              <Text style={themedStyles.updateTitle}>
                {t("update.available")}
              </Text>
              <Text style={themedStyles.newVersion}>
                v{updateResult.latestRelease.version}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={colors.textMuted}
            />
          </View>
        </TouchableOpacity>
      )}

      {!hasUpdate && (
        <TouchableOpacity
          style={[styles.checkButton, themedStyles.checkButton]}
          onPress={checkUpdate}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <MaterialCommunityIcons
                name="refresh"
                size={18}
                color={colors.primary}
              />
              <Text style={themedStyles.checkButtonText}>
                {t("update.checkNow")}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  updateBox: {
    padding: 12,
    borderRadius: 10,
  },
  updateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  updateInfo: {
    flex: 1,
  },
  checkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
});

const updateThemedStyles = createThemedStyles((colors) => ({
  label: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  version: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  updateBox: {
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  updateTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  newVersion: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkButton: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },
}));

export default UpdateSection;
