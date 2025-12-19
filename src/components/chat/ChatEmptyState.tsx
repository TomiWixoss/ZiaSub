import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";
import QuickActions from "./QuickActions";

interface ChatEmptyStateProps {
  hasApiKey: boolean;
  hasVideo: boolean;
  isLoading: boolean;
  onQuickAction: (actionId: string) => void;
}

const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  hasApiKey,
  hasVideo,
  isLoading,
  onQuickAction,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Xin chào!</Text>
      <Text style={styles.greetingSubtitle}>Tôi có thể giúp gì cho bạn?</Text>

      {!hasApiKey && (
        <View style={styles.warningContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={20}
            color={COLORS.warning}
          />
          <Text style={styles.warningText}>
            Chưa có API key. Thêm trong Cài đặt nhé
          </Text>
        </View>
      )}

      {hasVideo && (
        <QuickActions
          onAction={onQuickAction}
          disabled={isLoading || !hasApiKey}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 8,
    paddingTop: 40,
  },
  greeting: {
    color: COLORS.textSecondary,
    fontSize: 18,
    marginBottom: 4,
  },
  greetingSubtitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "600",
    marginBottom: 32,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,183,77,0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.warning,
    alignSelf: "stretch",
  },
  warningText: {
    color: COLORS.warning,
    fontSize: 13,
    flex: 1,
  },
});

export default ChatEmptyState;
