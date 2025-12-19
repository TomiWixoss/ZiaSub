import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import { COLORS } from "@constants/colors";
import { confirmDestructive } from "@components/CustomAlert";

export interface TaskItem {
  id: string;
  command: string;
  result?: string;
  hasVideo?: boolean;
  videoTitle?: string;
  timestamp: number;
  status: "pending" | "done" | "error";
}

interface TaskCardProps {
  task: TaskItem;
  defaultExpanded?: boolean;
  onCopy?: (text: string) => void;
  onRegenerate?: (task: TaskItem) => void;
  onDelete?: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  defaultExpanded = false,
  onCopy,
  onRegenerate,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  // 1 = expanded (chevron-up pointing up), 0 = collapsed (chevron-up rotated to point down)
  const rotateAnim = useRef(
    new Animated.Value(defaultExpanded ? 1 : 0)
  ).current;

  const toggleExpand = () => {
    if (!task.result) return;
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["90deg", "180deg"],
  });

  const time = new Date(task.timestamp).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusIcon =
    task.status === "done"
      ? "check-circle"
      : task.status === "error"
      ? "alert-circle"
      : "clock-outline";

  const statusColor =
    task.status === "done"
      ? COLORS.success
      : task.status === "error"
      ? COLORS.error
      : COLORS.textMuted;

  return (
    <View style={styles.taskCard}>
      <TouchableOpacity
        style={styles.taskHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.taskHeaderLeft}>
          <MaterialCommunityIcons
            name={statusIcon}
            size={18}
            color={statusColor}
          />
          <View style={styles.taskInfo}>
            <Text
              style={styles.taskCommand}
              numberOfLines={expanded ? undefined : 1}
            >
              {task.command}
            </Text>
            <View style={styles.taskMeta}>
              <Text style={styles.taskTime}>{time}</Text>
              {task.hasVideo && (
                <View style={styles.videoTag}>
                  <MaterialCommunityIcons
                    name="youtube"
                    size={10}
                    color={COLORS.error}
                  />
                  <Text style={styles.videoTagText} numberOfLines={1}>
                    {task.videoTitle || "Video"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {task.result && (
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <MaterialCommunityIcons
              name="chevron-up"
              size={20}
              color={COLORS.textMuted}
            />
          </Animated.View>
        )}
      </TouchableOpacity>

      {expanded && task.result && (
        <View style={styles.taskResult}>
          <Markdown style={markdownStyles}>{task.result}</Markdown>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={async () => {
                if (task.result) {
                  await Clipboard.setStringAsync(task.result);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  onCopy?.(task.result);
                }
              }}
            >
              <MaterialCommunityIcons
                name={copied ? "check" : "content-copy"}
                size={16}
                color={copied ? COLORS.success : COLORS.textMuted}
              />
              <Text
                style={[styles.actionText, copied && styles.actionTextSuccess]}
              >
                {copied ? "Đã copy" : "Copy"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onRegenerate?.(task)}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={16}
                color={COLORS.textMuted}
              />
              <Text style={styles.actionText}>Tạo lại</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                confirmDestructive(
                  "Xóa task",
                  "Bạn có chắc muốn xóa task này?",
                  () => onDelete?.(task.id)
                );
              }}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={16}
                color={COLORS.error}
              />
              <Text style={[styles.actionText, styles.actionTextDelete]}>
                Xóa
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {task.status === "pending" && !task.result && (
        <View style={styles.taskLoading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang xử lý...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  taskCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    overflow: "hidden",
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 14,
    gap: 10,
  },
  taskHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskCommand: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  taskTime: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  videoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    maxWidth: 150,
  },
  videoTagText: {
    color: COLORS.textMuted,
    fontSize: 11,
    flexShrink: 1,
  },
  taskResult: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  taskLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  actionTextSuccess: {
    color: COLORS.success,
  },
  actionTextDelete: {
    color: COLORS.error,
  },
});

const markdownStyles = {
  body: { color: COLORS.text, fontSize: 15, lineHeight: 24 },
  heading1: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "bold" as const,
    marginVertical: 8,
  },
  heading2: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold" as const,
    marginVertical: 6,
  },
  heading3: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600" as const,
    marginVertical: 4,
  },
  paragraph: { color: COLORS.text, marginVertical: 4 },
  link: { color: COLORS.accent },
  blockquote: {
    backgroundColor: COLORS.surface,
    borderLeftColor: COLORS.primary,
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 4,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: COLORS.surface,
    color: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
  },
  code_block: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    color: COLORS.text,
  },
  list_item: { color: COLORS.text, marginVertical: 2 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  strong: { color: COLORS.text, fontWeight: "bold" as const },
  em: { color: COLORS.text, fontStyle: "italic" as const },
  hr: { backgroundColor: COLORS.border, height: 1, marginVertical: 12 },
};

export default TaskCard;
