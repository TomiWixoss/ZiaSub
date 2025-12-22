import React, { useState, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Markdown from "react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import { confirmDestructive } from "../common/CustomAlert";
import type { VideoTimeRange } from "@src/types";

export interface TaskItem {
  id: string;
  command: string;
  result?: string;
  hasVideo?: boolean;
  videoTitle?: string;
  videoUrl?: string;
  videoTimeRange?: VideoTimeRange;
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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(taskCardThemedStyles);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const rotateAnim = useRef(
    new Animated.Value(defaultExpanded ? 1 : 0)
  ).current;

  // Format time range for display
  const formatTimeRange = (range: VideoTimeRange) => {
    const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      if (h > 0) {
        return `${h}:${m.toString().padStart(2, "0")}:${s
          .toString()
          .padStart(2, "0")}`;
      }
      return `${m}:${s.toString().padStart(2, "0")}`;
    };
    return `${formatTime(range.startTime)} - ${formatTime(range.endTime)}`;
  };

  const markdownStyles = useMemo(
    () => ({
      body: { color: colors.text, fontSize: 15, lineHeight: 24 },
      heading1: {
        color: colors.text,
        fontSize: 20,
        fontWeight: "bold" as const,
        marginVertical: 8,
      },
      heading2: {
        color: colors.text,
        fontSize: 18,
        fontWeight: "bold" as const,
        marginVertical: 6,
      },
      heading3: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "600" as const,
        marginVertical: 4,
      },
      paragraph: { color: colors.text, marginVertical: 4 },
      link: { color: colors.accent },
      blockquote: {
        backgroundColor: colors.surface,
        borderLeftColor: colors.primary,
        borderLeftWidth: 3,
        paddingLeft: 12,
        paddingVertical: 4,
        marginVertical: 8,
      },
      code_inline: {
        backgroundColor: colors.surface,
        color: colors.primaryLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        fontSize: 13,
      },
      code_block: {
        backgroundColor: colors.surface,
        padding: 12,
        borderRadius: 10,
        marginVertical: 8,
      },
      fence: {
        backgroundColor: colors.surface,
        padding: 12,
        borderRadius: 10,
        marginVertical: 8,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        fontSize: 13,
        color: colors.text,
      },
      list_item: { color: colors.text, marginVertical: 2 },
      bullet_list: { marginVertical: 4 },
      ordered_list: { marginVertical: 4 },
      strong: { color: colors.text, fontWeight: "bold" as const },
      em: { color: colors.text, fontStyle: "italic" as const },
      hr: { backgroundColor: colors.border, height: 1, marginVertical: 12 },
    }),
    [colors]
  );

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
      ? colors.success
      : task.status === "error"
      ? colors.error
      : colors.textMuted;

  return (
    <View style={themedStyles.taskCard}>
      <Pressable style={styles.taskHeader} onPress={toggleExpand}>
        <View style={styles.taskHeaderLeft}>
          <MaterialCommunityIcons
            name={statusIcon}
            size={18}
            color={statusColor}
          />
          <View style={styles.taskInfo}>
            <Text
              style={themedStyles.taskCommand}
              numberOfLines={expanded ? undefined : 1}
            >
              {task.command}
            </Text>
            <View style={styles.taskMeta}>
              <Text style={themedStyles.taskTime}>{time}</Text>
              {task.hasVideo && (
                <View style={themedStyles.videoTag}>
                  <MaterialCommunityIcons
                    name="youtube"
                    size={10}
                    color={colors.error}
                  />
                  <Text style={themedStyles.videoTagText} numberOfLines={1}>
                    {task.videoTitle || "Video"}
                  </Text>
                </View>
              )}
              {task.hasVideo && task.videoTimeRange && (
                <View style={themedStyles.timeRangeTag}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={10}
                    color="#FFFFFF"
                  />
                  <Text style={themedStyles.timeRangeTagText}>
                    {formatTimeRange(task.videoTimeRange)}
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
              color={colors.textMuted}
            />
          </Animated.View>
        )}
      </Pressable>
      {expanded && task.result && (
        <View style={themedStyles.taskResult}>
          <Markdown style={markdownStyles}>{task.result}</Markdown>
          <View style={themedStyles.actionButtons}>
            <Pressable
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
                color={copied ? colors.success : colors.textMuted}
              />
              <Text
                style={[
                  themedStyles.actionText,
                  copied && themedStyles.actionTextSuccess,
                ]}
              >
                {copied ? t("common.copied") : t("common.copy")}
              </Text>
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() => onRegenerate?.(task)}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={16}
                color={colors.textMuted}
              />
              <Text style={themedStyles.actionText}>
                {t("common.regenerate")}
              </Text>
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                confirmDestructive(
                  t("chat.deleteTask"),
                  t("chat.deleteTaskConfirm"),
                  () => onDelete?.(task.id)
                )
              }
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={16}
                color={colors.error}
              />
              <Text
                style={[themedStyles.actionText, themedStyles.actionTextDelete]}
              >
                {t("common.delete")}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
      {task.status === "pending" && !task.result && (
        <View style={themedStyles.taskLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={themedStyles.loadingText}>{t("common.processing")}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  taskInfo: { flex: 1 },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});

const taskCardThemedStyles = createThemedStyles((colors) => ({
  taskCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    overflow: "hidden",
  },
  taskCommand: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
  taskTime: { color: colors.textMuted, fontSize: 12 },
  videoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.surface,
    borderRadius: 10,
    maxWidth: 150,
  },
  videoTagText: { color: colors.textMuted, fontSize: 11, flexShrink: 1 },
  timeRangeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  timeRangeTagText: { color: "#FFFFFF", fontSize: 10, fontWeight: "500" },
  taskResult: { padding: 14, borderTopWidth: 1, borderTopColor: colors.border },
  taskLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionText: { color: colors.textMuted, fontSize: 13 },
  actionTextSuccess: { color: colors.success },
  actionTextDelete: { color: colors.error },
}));

export default TaskCard;
