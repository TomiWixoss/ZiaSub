import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(chatEmptyThemedStyles);

  return (
    <View style={styles.container}>
      <Text style={themedStyles.greeting}>{t("chat.greeting")}</Text>
      <Text style={themedStyles.greetingSubtitle}>
        {t("chat.greetingSubtitle")}
      </Text>
      {!hasApiKey && (
        <View style={themedStyles.warningContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={20}
            color={colors.warning}
          />
          <Text style={themedStyles.warningText}>{t("chat.noApiKey")}</Text>
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
});

const chatEmptyThemedStyles = createThemedStyles((colors) => ({
  greeting: { color: colors.textSecondary, fontSize: 18, marginBottom: 4 },
  greetingSubtitle: {
    color: colors.text,
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
    borderColor: colors.warning,
    alignSelf: "stretch",
  },
  warningText: { color: colors.warning, fontSize: 13, flex: 1 },
}));

export default ChatEmptyState;
