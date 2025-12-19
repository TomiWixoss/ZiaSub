import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";
import { queueStyles as styles } from "./queueStyles";
import type { TabType } from "./QueueTabs";

interface QueueEmptyProps {
  activeTab: TabType;
}

const QueueEmpty: React.FC<QueueEmptyProps> = ({ activeTab }) => {
  const getEmptyMessage = () => {
    switch (activeTab) {
      case "pending":
        return "Chưa có video nào";
      case "translating":
        return "Không có video nào đang dịch";
      case "completed":
        return "Chưa dịch video nào";
    }
  };

  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name={
          activeTab === "completed" ? "check-circle-outline" : "playlist-plus"
        }
        size={48}
        color={COLORS.textMuted}
      />
      <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
    </View>
  );
};

export default QueueEmpty;
