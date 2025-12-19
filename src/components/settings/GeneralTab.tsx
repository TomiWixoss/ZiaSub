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
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { SubtitleSettings, BatchSettings, TTSSettings } from "@src/types";
import {
  ApiKeysSection,
  SubtitleSection,
  BatchSection,
  TTSSection,
  LanguageSection,
  ThemeSection,
} from "./sections";

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
}

type SettingGroup =
  | "appearance"
  | "apiKeys"
  | "subtitle"
  | "batch"
  | "tts"
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
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(generalThemedStyles);
  const [expandedGroup, setExpandedGroup] = useState<SettingGroup>(null);

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
  ];

  const toggleGroup = (group: SettingGroup) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroup(expandedGroup === group ? null : group);
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
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {groups.map((group) => {
        const isExpanded = expandedGroup === group.key;
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
                <View
                  style={[
                    themedStyles.iconContainer,
                    isExpanded && themedStyles.iconContainerExpanded,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={group.icon as any}
                    size={20}
                    color={isExpanded ? colors.primary : colors.textMuted}
                  />
                </View>
                <View style={styles.groupInfo}>
                  <Text
                    style={[
                      themedStyles.groupTitle,
                      isExpanded && themedStyles.groupTitleExpanded,
                    ]}
                  >
                    {t(group.labelKey)}
                  </Text>
                  {!isExpanded && (
                    <Text
                      style={themedStyles.groupDescription}
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
  groupInfo: { flex: 1 },
  groupContent: { paddingHorizontal: 16, paddingBottom: 16 },
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
}));

export default GeneralTab;
