import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { COLORS } from "@constants/colors";
import { queueStyles as styles } from "./queueStyles";
import type { TabType } from "./QueueTabs";

interface QueueEmptyProps {
  activeTab: TabType;
}

const QueueEmpty: React.FC<QueueEmptyProps> = ({ activeTab }) => {
  const { t } = useTranslation();
  const getEmptyMessage = () => {
    switch (activeTab) {
      case "pending":
        return t("queue.empty");
      case "translating":
        return t("queue.emptyTranslating");
      case "completed":
        return t("queue.emptyCompleted");
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
