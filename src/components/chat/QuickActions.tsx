import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";

const QUICK_ACTIONS = [
  {
    id: "summary",
    labelKey: "chat.quickActions.summarize",
    icon: "text-box-outline",
  },
  {
    id: "analyze",
    labelKey: "chat.quickActions.analyze",
    icon: "chart-box-outline",
  },
  {
    id: "keypoints",
    labelKey: "chat.quickActions.keyPoints",
    icon: "format-list-bulleted",
  },
  {
    id: "translate",
    labelKey: "chat.quickActions.translate",
    icon: "translate",
  },
];

interface QuickActionsProps {
  onAction: (actionId: string) => void;
  disabled?: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAction, disabled }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(quickActionsThemedStyles);

  return (
    <View style={styles.container}>
      {QUICK_ACTIONS.map((action) => (
        <Pressable
          key={action.id}
          style={[themedStyles.actionBtn, disabled && styles.actionDisabled]}
          onPress={() => onAction(action.id)}
          disabled={disabled}
        >
          <MaterialCommunityIcons
            name={action.icon as any}
            size={18}
            color={colors.text}
          />
          <Text style={themedStyles.actionLabel}>{t(action.labelKey)}</Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 10, width: "100%" },
  actionDisabled: { opacity: 0.5 },
});

const quickActionsThemedStyles = createThemedStyles((colors) => ({
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: colors.surfaceLight,
    alignSelf: "flex-start",
  },
  actionLabel: { color: colors.text, fontSize: 15 },
}));

export default QuickActions;
