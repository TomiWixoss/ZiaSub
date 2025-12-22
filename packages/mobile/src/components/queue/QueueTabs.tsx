import React from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles } from "@hooks/useThemedStyles";
import { createQueueStyles } from "./queueStyles";

export type TabType = "pending" | "translating" | "paused" | "completed";

interface QueueTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: {
    pending: number;
    translating: number;
    paused: number;
    completed: number;
    error: number;
  };
}

const QueueTabs: React.FC<QueueTabsProps> = ({
  activeTab,
  onTabChange,
  counts,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(() => createQueueStyles(colors));
  const pendingCount = counts.pending + counts.error;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabBarScroll}
      style={styles.tabBarContainer}
    >
      <TouchableOpacity
        style={[styles.tab, activeTab === "pending" && styles.tabActive]}
        onPress={() => onTabChange("pending")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "pending" && styles.tabTextActive,
          ]}
        >
          {t("queue.tabs.pending")}
        </Text>
        {pendingCount > 0 && (
          <View
            style={[
              styles.badge,
              activeTab === "pending" && styles.badgeActive,
            ]}
          >
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "translating" && styles.tabActive]}
        onPress={() => onTabChange("translating")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "translating" && styles.tabTextActive,
          ]}
        >
          {t("queue.tabs.translating")}
        </Text>
        {counts.translating > 0 && (
          <View
            style={[
              styles.badge,
              styles.badgeProcessing,
              activeTab === "translating" && styles.badgeActive,
            ]}
          >
            <Text style={styles.badgeText}>{counts.translating}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "paused" && styles.tabActive]}
        onPress={() => onTabChange("paused")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "paused" && styles.tabTextActive,
          ]}
        >
          {t("queue.tabs.paused")}
        </Text>
        {counts.paused > 0 && (
          <View
            style={[
              styles.badge,
              styles.badgePaused,
              activeTab === "paused" && styles.badgeActive,
            ]}
          >
            <Text style={styles.badgeText}>{counts.paused}</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "completed" && styles.tabActive]}
        onPress={() => onTabChange("completed")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "completed" && styles.tabTextActive,
          ]}
        >
          {t("queue.tabs.completed")}
        </Text>
        {counts.completed > 0 && (
          <View
            style={[
              styles.badge,
              styles.badgeCompleted,
              activeTab === "completed" && styles.badgeActive,
            ]}
          >
            <Text style={styles.badgeText}>{counts.completed}</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default QueueTabs;
