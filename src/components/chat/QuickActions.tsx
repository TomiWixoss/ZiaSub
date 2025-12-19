import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";

const QUICK_ACTIONS = [
  { id: "summary", label: "Tóm tắt video", icon: "text-box-outline" },
  { id: "analyze", label: "Phân tích nội dung", icon: "chart-box-outline" },
  { id: "keypoints", label: "Điểm chính", icon: "format-list-bulleted" },
  { id: "translate", label: "Dịch video", icon: "translate" },
];

interface QuickActionsProps {
  onAction: (actionId: string) => void;
  disabled?: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAction, disabled }) => {
  return (
    <View style={styles.container}>
      {QUICK_ACTIONS.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={[styles.actionBtn, disabled && styles.actionDisabled]}
          onPress={() => onAction(action.id)}
          disabled={disabled}
        >
          <MaterialCommunityIcons
            name={action.icon as any}
            size={18}
            color={COLORS.text}
          />
          <Text style={styles.actionLabel}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    width: "100%",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceLight,
    alignSelf: "flex-start",
  },
  actionLabel: {
    color: COLORS.text,
    fontSize: 15,
  },
  actionDisabled: {
    opacity: 0.5,
  },
});

export default QuickActions;
