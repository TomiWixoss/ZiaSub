import React from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { QueueItem } from "@src/types";

interface QueueItemCardProps {
  item: QueueItem;
  hasApiKey: boolean;
  queuePosition?: number; // Position in translating queue (1-based)
  totalInQueue?: number; // Total items in translating queue
  onSelect: (item: QueueItem) => void;
  onStart: (item: QueueItem) => void;
  onResume?: (item: QueueItem) => void;
  onRequeue: (item: QueueItem) => void;
  onRemove: (item: QueueItem) => void;
  onStop?: (item: QueueItem) => void;
  onAbort?: (item: QueueItem) => void;
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
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
  queuePosition,
  totalInQueue,
  onSelect,
  onStart,
  onResume,
  onRequeue,
  onRemove,
  onStop,
  onAbort,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const hasRealProgress = item.progress && item.progress.total > 0;
  const isActivelyTranslating =
    item.status === "translating" && hasRealProgress;
  const hasPartialData = !!(
    item.partialSrt &&
    item.completedBatches &&
    item.completedBatches > 0
  );
  // Paused is now a separate status
  const isPaused = item.status === "paused";
  const isWaitingInQueue = item.status === "translating" && !hasRealProgress;

  // Calculate progress percentage
  const progressPercent = isActivelyTranslating
    ? (item.progress!.completed / item.progress!.total) * 100
    : isPaused && item.totalBatches
    ? (item.completedBatches! / item.totalBatches) * 100
    : 0;

  // Get status color and icon
  const getStatusStyle = () => {
    if (isActivelyTranslating)
      return { color: colors.primary, icon: "translate" as const };
    if (isPaused) return { color: colors.warning, icon: "pause" as const };
    if (isWaitingInQueue)
      return {
        color: colors.primary,
        icon: "clock-outline" as const,
      };
    if (item.status === "completed")
      return { color: colors.success, icon: "check-circle" as const };
    if (item.status === "error")
      return { color: colors.error, icon: "alert-circle" as const };
    return { color: colors.textMuted, icon: "clock-outline" as const }; // pending
  };

  const statusStyle = getStatusStyle();
  const showProgressBar = isActivelyTranslating || isPaused;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        showProgressBar && { borderColor: statusStyle.color, borderWidth: 1.5 },
      ]}
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
    >
      {/* Progress bar at bottom */}
      {showProgressBar && (
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${progressPercent}%`,
                backgroundColor: statusStyle.color,
              },
            ]}
          />
        </View>
      )}

      <View style={styles.cardContent}>
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />

          {/* Duration badge - bottom right */}
          {item.duration && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {formatDuration(item.duration)}
              </Text>
            </View>
          )}

          {/* Status badge - top left */}
          <View
            style={[styles.statusBadge, { backgroundColor: statusStyle.color }]}
          >
            <MaterialCommunityIcons
              name={statusStyle.icon}
              size={12}
              color="#fff"
            />
          </View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          {item.configName && (
            <Text style={styles.configText} numberOfLines={1}>
              {item.configName}
            </Text>
          )}

          <View style={styles.footer}>
            {item.status === "pending" && (
              <Text style={styles.statusText}>
                {t("queue.status.added", { date: formatDate(item.addedAt) })}
              </Text>
            )}
            {isActivelyTranslating && (
              <Text style={[styles.statusText, { color: colors.primary }]}>
                {t("queue.status.translating")} ({item.progress!.completed}/
                {item.progress!.total})
              </Text>
            )}
            {isPaused && (
              <Text style={[styles.statusText, { color: colors.warning }]}>
                {t("queue.status.paused", {
                  completed: item.completedBatches,
                  total: item.totalBatches || "?",
                })}
              </Text>
            )}
            {isWaitingInQueue && (
              <Text style={[styles.statusText, { color: colors.primary }]}>
                {queuePosition && totalInQueue
                  ? `${t(
                      "queue.status.waiting"
                    )} (${queuePosition}/${totalInQueue})`
                  : t("queue.status.waiting")}
              </Text>
            )}
            {item.status === "completed" && (
              <Text style={[styles.statusText, { color: colors.success }]}>
                {t("queue.status.completed", {
                  date: formatDate(item.completedAt),
                })}
              </Text>
            )}
            {item.status === "error" && (
              <Text
                style={[styles.statusText, { color: colors.error }]}
                numberOfLines={1}
              >
                {item.error || t("common.error")}
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {(item.status === "pending" || item.status === "error") && (
            <TouchableOpacity
              style={[styles.actionBtn, !hasApiKey && styles.actionBtnDisabled]}
              onPress={() => onStart(item)}
              disabled={!hasApiKey}
            >
              <MaterialCommunityIcons
                name="play"
                size={22}
                color={hasApiKey ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          )}

          {(isActivelyTranslating || isWaitingInQueue) && (
            <>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onStop?.(item)}
              >
                <MaterialCommunityIcons
                  name="pause"
                  size={22}
                  color={colors.warning}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onAbort?.(item)}
              >
                <MaterialCommunityIcons
                  name="close-circle-outline"
                  size={22}
                  color={colors.error}
                />
              </TouchableOpacity>
            </>
          )}

          {isPaused && (
            <>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  !hasApiKey && styles.actionBtnDisabled,
                ]}
                onPress={() => onResume?.(item)}
                disabled={!hasApiKey}
              >
                <MaterialCommunityIcons
                  name="play"
                  size={22}
                  color={hasApiKey ? colors.success : colors.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onRemove(item)}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={22}
                  color={colors.error}
                />
              </TouchableOpacity>
            </>
          )}

          {item.status === "completed" && (
            <>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onRequeue(item)}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={22}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onRemove(item)}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={22}
                  color={colors.error}
                />
              </TouchableOpacity>
            </>
          )}

          {(item.status === "pending" || item.status === "error") && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onRemove(item)}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={22}
                color={colors.error}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const themedStyles = createThemedStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    position: "relative" as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    minHeight: 80,
  },
  progressBarContainer: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  progressBar: {
    height: "100%" as const,
    borderRadius: 2,
  },
  thumbnailContainer: {
    position: "relative" as const,
    width: 120,
    height: 68,
    margin: 6,
    borderRadius: 8,
    overflow: "hidden" as const,
  },
  thumbnail: {
    width: "100%" as const,
    height: "100%" as const,
    backgroundColor: colors.surfaceLight,
  },
  durationBadge: {
    position: "absolute" as const,
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  durationText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600" as const,
  },
  statusBadge: {
    position: "absolute" as const,
    top: 4,
    left: 4,
    borderRadius: 4,
    padding: 4,
  },
  info: {
    flex: 1,
    paddingVertical: 8,
    paddingRight: 4,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500" as const,
    lineHeight: 18,
  },
  configText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  footer: {
    marginTop: 4,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  actions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingRight: 8,
    gap: 2,
  },
  actionBtn: {
    padding: 6,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
}));

export default QueueItemCard;
