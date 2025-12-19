import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { queueStyles as styles } from "./queueStyles";

export type TabType = "pending" | "translating" | "completed";

interface QueueTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: {
    pending: number;
    translating: number;
    completed: number;
    error: number;
  };
}

const QueueTabs: React.FC<QueueTabsProps> = ({
  activeTab,
  onTabChange,
  counts,
}) => {
  const pendingCount = counts.pending + counts.error;

  return (
    <View style={styles.tabBar}>
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
          Chưa dịch
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
          Đang dịch
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
        style={[styles.tab, activeTab === "completed" && styles.tabActive]}
        onPress={() => onTabChange("completed")}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "completed" && styles.tabTextActive,
          ]}
        >
          Đã dịch
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
    </View>
  );
};

export default QueueTabs;
