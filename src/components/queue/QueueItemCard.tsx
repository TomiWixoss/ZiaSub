import React from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles } from "@hooks/useThemedStyles";
import type { QueueItem } from "@src/types";
import { createQueueStyles } from "./queueStyles";

interface QueueItemCardProps {
  item: QueueItem;
  hasApiKey: boolean;
  isCurrentlyProcessing?: boolean;
  onSelect: (item: QueueItem) => void;
  onStart: (item: QueueItem) => void;
  onRequeue: (item: QueueItem) => void;
  onRemove: (item: QueueItem) => void;
  onStop?: (item: QueueItem) => void;
  onAbort?: (item: QueueItem) => void;
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};
const formatDate = (timestamp?: number) => {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const QueueItemCard: React.FC<QueueItemCardProps> = ({
  item,
  hasApiKey,
  isCurrentlyProcessing,
  onSelect,
  onStart,
  onRequeue,
  onRemove,
  onStop,
  onAbort,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(() => createQueueStyles(colors));

  return (
    <TouchableOpacity style={styles.queueItem} onPress={() => onSelect(item)}>
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      {item.status === "translating" && item.progress && (
        <View style={styles.progressOverlay}>
          <Text style={styles.progressText}>
            {item.progress.completed}/{item.progress.total}
          </Text>
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.itemMeta}>
          {item.duration && (
            <Text style={styles.metaText}>{formatDuration(item.duration)}</Text>
          )}
          {item.configName && (
            <Text style={styles.metaText}>• {item.configName}</Text>
          )}
        </View>
        <View style={styles.itemFooter}>
          {item.status === "pending" && (
            <Text style={styles.dateText}>
              {t("queue.status.added", { date: formatDate(item.addedAt) })}
            </Text>
          )}
          {item.status === "translating" && (
            <Text style={[styles.dateText, { color: colors.primary }]}>
              {t("queue.status.translating")}
            </Text>
          )}
          {item.status === "completed" && (
            <Text style={[styles.dateText, { color: colors.success }]}>
              {t("queue.status.completed", {
                date: formatDate(item.completedAt),
              })}
            </Text>
          )}
          {item.status === "error" && (
            <Text
              style={[styles.dateText, { color: colors.error }]}
              numberOfLines={1}
            >
              {t("queue.status.error", { error: item.error })}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.itemActions}>
        {(item.status === "pending" || item.status === "error") && (
          <TouchableOpacity
            style={[styles.actionBtn, !hasApiKey && styles.actionBtnDisabled]}
            onPress={() => onStart(item)}
            disabled={!hasApiKey}
          >
            <MaterialCommunityIcons
              name="play"
              size={20}
              color={hasApiKey ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        )}
        {item.status === "translating" && (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onStop?.(item)}
            >
              <MaterialCommunityIcons
                name="pause"
                size={20}
                color={colors.warning}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onAbort?.(item)}
            >
              <MaterialCommunityIcons
                name="close-circle-outline"
                size={20}
                color={colors.error}
              />
            </TouchableOpacity>
          </>
        )}
        {item.status === "completed" && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onRequeue(item)}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
        {item.status !== "translating" && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onRemove(item)}
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={20}
              color={colors.error}
            />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default QueueItemCard;
