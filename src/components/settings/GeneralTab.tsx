import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { confirmDestructive } from "@components/common/CustomAlert";
import { useTheme, useUpdate } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type {
  SubtitleSettings,
  BatchSettings,
  TTSSettings,
  FloatingUISettings,
  NotificationSettings,
} from "@src/types";
import {
  DEFAULT_SUBTITLE_SETTINGS,
  DEFAULT_BATCH_SETTINGS,
  DEFAULT_TTS_SETTINGS,
  DEFAULT_FLOATING_UI_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
} from "@constants/defaults";
import {
  ApiKeysSection,
  SubtitleSection,
  BatchSection,
  TTSSection,
  LanguageSection,
  ThemeSection,
  UpdateSection,
  DataSection,
  FloatingUISection,
  NotificationSection,
} from "./sections";
import Button3D from "@components/common/Button3D";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface GeneralTabProps {
  subtitleSettings: SubtitleSettings;
  onSubtitleChange: (settings: SubtitleSettings) => void;
  batchSettings: BatchSettings;
  onBatchChange: (settings: BatchSettings) => void;
  apiKeys: string[];
  onApiKeysChange: (keys: string[]) => void;
  ttsSettings: TTSSettings;
  onTTSChange: (settings: TTSSettings) => void;
  floatingUISettings: FloatingUISettings;
  onFloatingUIChange: (settings: FloatingUISettings) => void;
  notificationSettings: NotificationSettings;
  onNotificationChange: (settings: NotificationSettings) => void;
}

type SettingGroup =
  | "appearance"
  | "apiKeys"
  | "subtitle"
  | "batch"
  | "tts"
  | "floatingUI"
  | "notification"
  | "data"
  | "update"
  | null;

interface GroupConfig {
  key: SettingGroup;
  icon: string;
  labelKey: string;
  description: string;
}

const GeneralTab: React.FC<GeneralTabProps> = ({
  subtitleSettings,
  onSubtitleChange,
  batchSettings,
  onBatchChange,
  apiKeys,
  onApiKeysChange,
  ttsSettings,
  onTTSChange,
  floatingUISettings,
  onFloatingUIChange,
  notificationSettings,
  onNotificationChange,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(generalThemedStyles);
  const [expandedGroup, setExpandedGroup] = useState<SettingGroup>(null);
  const { hasUpdate, updateResult } = useUpdate();

  const groups: GroupConfig[] = [
    {
      key: "appearance",
      icon: "palette",
      labelKey: "settings.groups.appearance",
      description: t("settings.groups.appearanceDesc"),
    },
    {
      key: "apiKeys",
      icon: "key-variant",
      labelKey: "settings.apiKeys.title",
      description: t("settings.groups.apiKeysDesc", { count: apiKeys.length }),
    },
    {
      key: "subtitle",
      icon: "subtitles",
      labelKey: "settings.subtitle.title",
      description: t("settings.groups.subtitleDesc"),
    },
    {
      key: "batch",
      icon: "playlist-play",
      labelKey: "settings.batch.title",
      description: t("settings.groups.batchDesc"),
    },
    {
      key: "tts",
      icon: "account-voice",
      labelKey: "settings.tts.title",
      description: t("settings.groups.ttsDesc", {
        status: ttsSettings.enabled
          ? t("settings.groups.enabled")
          : t("settings.groups.disabled"),
      }),
    },
    {
      key: "floatingUI",
      icon: "gesture-tap-button",
      labelKey: "settings.floatingUI.title",
      description: t("settings.groups.floatingUIDesc"),
    },
    {
      key: "notification",
      icon: "bell-outline",
      labelKey: "settings.notification.title",
      description: t("settings.groups.notificationDesc", {
        status: notificationSettings.enabled
          ? t("settings.groups.enabled")
          : t("settings.groups.disabled"),
      }),
    },
    {
      key: "data",
      icon: "database",
      labelKey: "settings.data.title",
      description: t("settings.data.description"),
    },
    {
      key: "update",
      icon: "update",
      labelKey: "update.title",
      description:
        hasUpdate && updateResult?.latestRelease
          ? `v${updateResult.latestRelease.version} ${t(
              "update.available"
            ).toLowerCase()}`
          : t("update.checkNow"),
    },
  ];

  const toggleGroup = (group: SettingGroup) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroup(expandedGroup === group ? null : group);
  };

  const handleResetAllSettings = () => {
    confirmDestructive(
      t("settings.resetAll.title"),
      t("settings.resetAll.message"),
      () => {
        onSubtitleChange({ ...DEFAULT_SUBTITLE_SETTINGS });
        onBatchChange({ ...DEFAULT_BATCH_SETTINGS });
        onTTSChange({ ...DEFAULT_TTS_SETTINGS });
        onFloatingUIChange({ ...DEFAULT_FLOATING_UI_SETTINGS });
        onNotificationChange({ ...DEFAULT_NOTIFICATION_SETTINGS });
      },
      t("settings.resetAll.confirm")
    );
  };

  const renderGroupContent = (group: SettingGroup) => {
    switch (group) {
      case "appearance":
        return (
          <View style={styles.groupContent}>
            <ThemeSection />
            <LanguageSection />
          </View>
        );
      case "apiKeys":
        return (
          <View style={styles.groupContent}>
            <ApiKeysSection
              apiKeys={apiKeys}
              onApiKeysChange={onApiKeysChange}
            />
          </View>
        );
      case "subtitle":
        return (
          <View style={styles.groupContent}>
            <SubtitleSection
              subtitleSettings={subtitleSettings}
              onSubtitleChange={onSubtitleChange}
            />
          </View>
        );
      case "batch":
        return (
          <View style={styles.groupContent}>
            <BatchSection
              batchSettings={batchSettings}
              onBatchChange={onBatchChange}
            />
          </View>
        );
      case "tts":
        return (
          <View style={styles.groupContent}>
            <TTSSection ttsSettings={ttsSettings} onTTSChange={onTTSChange} />
          </View>
        );
      case "floatingUI":
        return (
          <View style={styles.groupContent}>
            <FloatingUISection
              floatingUISettings={floatingUISettings}
              onFloatingUIChange={onFloatingUIChange}
            />
          </View>
        );
      case "notification":
        return (
          <View style={styles.groupContent}>
            <NotificationSection
              notificationSettings={notificationSettings}
              onNotificationChange={onNotificationChange}
            />
          </View>
        );
      case "data":
        return (
          <View style={styles.groupContent}>
            <DataSection />
          </View>
        );
      case "update":
        return (
          <View style={styles.groupContent}>
            <UpdateSection />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {groups.map((group) => {
        const isExpanded = expandedGroup === group.key;
        const showUpdateBadge =
          group.key === "update" && hasUpdate && !isExpanded;
        return (
          <View key={group.key} style={themedStyles.groupContainer}>
            <TouchableOpacity
              style={[
                themedStyles.groupHeader,
                isExpanded && themedStyles.groupHeaderExpanded,
              ]}
              onPress={() => toggleGroup(group.key)}
              activeOpacity={0.7}
            >
              <View style={styles.groupHeaderLeft}>
                <View style={styles.iconWrapper}>
                  <View
                    style={[
                      themedStyles.iconContainer,
                      isExpanded && themedStyles.iconContainerExpanded,
                      showUpdateBadge && {
                        backgroundColor: `${colors.error}20`,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={group.icon as any}
                      size={20}
                      color={
                        showUpdateBadge
                          ? colors.error
                          : isExpanded
                          ? colors.primary
                          : colors.textMuted
                      }
                    />
                  </View>
                  {showUpdateBadge && (
                    <View
                      style={[
                        styles.updateBadge,
                        { backgroundColor: colors.error },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.groupInfo}>
                  <Text
                    style={[
                      themedStyles.groupTitle,
                      isExpanded && themedStyles.groupTitleExpanded,
                      showUpdateBadge && { color: colors.error },
                    ]}
                  >
                    {t(group.labelKey)}
                  </Text>
                  {!isExpanded && (
                    <Text
                      style={[
                        themedStyles.groupDescription,
                        showUpdateBadge && { color: colors.error },
                      ]}
                      numberOfLines={1}
                    >
                      {group.description}
                    </Text>
                  )}
                </View>
              </View>
              <MaterialCommunityIcons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={24}
                color={isExpanded ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
            {isExpanded && renderGroupContent(group.key)}
          </View>
        );
      })}

      {/* Reset All Settings Button */}
      <View style={styles.resetAllContainer}>
        <Button3D
          title={t("settings.resetAll.button")}
          icon="restore"
          onPress={handleResetAllSettings}
          variant="outline"
        />
        <Text style={themedStyles.resetAllHint}>
          {t("settings.resetAll.hint")}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  groupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconWrapper: {
    position: "relative",
  },
  updateBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },
  groupInfo: { flex: 1 },
  groupContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  resetAllContainer: {
    marginTop: 8,
    marginBottom: 24,
    gap: 8,
  },
});

const generalThemedStyles = createThemedStyles((colors) => ({
  groupContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  groupHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerExpanded: {
    backgroundColor: `${colors.primary}20`,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  groupTitleExpanded: {
    color: colors.primary,
  },
  groupDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  resetAllHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
  },
}));

export default GeneralTab;
