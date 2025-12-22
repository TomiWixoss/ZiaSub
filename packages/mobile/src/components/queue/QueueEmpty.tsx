import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles } from "@hooks/useThemedStyles";
import { createQueueStyles } from "./queueStyles";
import type { TabType } from "./QueueTabs";

interface QueueEmptyProps {
  activeTab: TabType;
}

const QueueEmpty: React.FC<QueueEmptyProps> = ({ activeTab }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(() => createQueueStyles(colors));

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "pending":
        return t("queue.empty");
      case "translating":
        return t("queue.emptyTranslating");
      case "paused":
        return t("queue.emptyPaused");
      case "completed":
        return t("queue.emptyCompleted");
    }
  };

  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name={
          activeTab === "completed"
            ? "check-circle-outline"
            : activeTab === "paused"
            ? "pause-circle-outline"
            : "playlist-plus"
        }
        size={48}
        color={colors.textMuted}
      />
      <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
    </View>
  );
};

export default QueueEmpty;
