import React from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { QueueItem } from "@src/types";
import { PRESET_PROMPTS } from "@constants/defaults";

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

// Format time for time range display (supports hours)
const formatTimeRange = (seconds: number) => {
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
  // Batch retranslation info
  const isBatchRetranslation = item.retranslateBatchIndex !== undefined;
  // Batch retranslation is actively translating only if it has progress (meaning API call started)
  // Without progress, it's waiting in queue
  const isBatchRetranslationActive = isBatchRetranslation && hasRealProgress;
  const isBatchRetranslationWaiting = isBatchRetranslation && !hasRealProgress;

  // Time range translation info (translate only specific time range x-y)
  // This is different from batch retranslation - it's a fresh translation of a specific time range
  const isTimeRangeTranslation =
    item.rangeStart !== undefined || item.rangeEnd !== undefined;
  const isTimeRangeTranslationActive =
    isTimeRangeTranslation && hasRealProgress;
  const isTimeRangeTranslationWaiting =
    isTimeRangeTranslation && !hasRealProgress;

  const isActivelyTranslating =
    item.status === "translating" &&
    (hasRealProgress ||
      isBatchRetranslationActive ||
      isTimeRangeTranslationActive);
  // Paused is now a separate status
  const isPaused = item.status === "paused";
  // Waiting in queue: either full translation waiting OR batch retranslation waiting OR time range waiting
  const isWaitingInQueue =
    item.status === "translating" &&
    !hasRealProgress &&
    !isBatchRetranslationActive &&
    !isTimeRangeTranslationActive;

  // Calculate progress percentage (only for full translation with progress, not batch retranslation)
  const progressPercent =
    isActivelyTranslating && hasRealProgress
      ? (item.progress!.completed / item.progress!.total) * 100
      : isPaused && item.totalBatches
      ? (item.completedBatches! / item.totalBatches) * 100
      : 0;

  // Get preset name from presetId
  const getPresetName = (presetId?: string): string | null => {
    if (!presetId) return null;
    const preset = PRESET_PROMPTS.find((p) => p.id === presetId);
    return preset?.nameVi || preset?.name || null;
  };

  const presetName = getPresetName(item.presetId);

  // Format batch settings info
  const getBatchSettingsInfo = (): string | null => {
    const bs = item.batchSettings;
    if (!bs) return null;

    const parts: string[] = [];
    if (bs.maxVideoDuration) {
      const mins = Math.floor(bs.maxVideoDuration / 60);
      parts.push(`${mins}p`); // p = phút/part
    }
    if (bs.batchOffset !== undefined) {
      parts.push(`±${bs.batchOffset}s`);
    }
    // Chỉ hiện số batch cùng lúc nếu không phải streaming mode
    if (
      !bs.streamingMode &&
      bs.maxConcurrentBatches &&
      bs.maxConcurrentBatches > 1
    ) {
      parts.push(`x${bs.maxConcurrentBatches}`); // x2, x3 = số batch cùng lúc
    }
    if (bs.streamingMode) {
      parts.push("stream");
    }

    return parts.length > 0 ? parts.join(" • ") : null;
  };

  const batchSettingsInfo = getBatchSettingsInfo();

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
  // Show progress bar only when there's actual progress to show
  const showProgressBar =
    (isActivelyTranslating && hasRealProgress) || isPaused;

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

          {(item.configName ||
            presetName ||
            batchSettingsInfo ||
            isTimeRangeTranslation ||
            isBatchRetranslation) && (
            <View style={styles.configRow}>
              {item.configName && (
                <Text style={styles.configText} numberOfLines={1}>
                  {item.configName}
                </Text>
              )}
              {presetName && (
                <View style={styles.presetBadge}>
                  <MaterialCommunityIcons
                    name="tag-outline"
                    size={10}
                    color={colors.primary}
                  />
                  <Text style={styles.presetBadgeText} numberOfLines={1}>
                    {presetName}
                  </Text>
                </View>
              )}
              {batchSettingsInfo && (
                <View style={styles.settingsBadge}>
                  <MaterialCommunityIcons
                    name="cog-outline"
                    size={10}
                    color={colors.textMuted}
                  />
                  <Text style={styles.settingsBadgeText} numberOfLines={1}>
                    {batchSettingsInfo}
                  </Text>
                </View>
              )}
              {/* Batch retranslation mode badge */}
              {item.retranslateBatchIndex !== undefined && (
                <View
                  style={[
                    styles.settingsBadge,
                    { backgroundColor: colors.warning + "30" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      item.retranslateMode === "single"
                        ? "numeric-1-box"
                        : "arrow-right-bold"
                    }
                    size={10}
                    color={colors.warning}
                  />
                  <Text
                    style={[
                      styles.settingsBadgeText,
                      { color: colors.warning },
                    ]}
                    numberOfLines={1}
                  >
                    {item.retranslateMode === "single"
                      ? t("queue.batchSingle", {
                          batch: item.retranslateBatchIndex + 1,
                        })
                      : t("queue.batchFromHere", {
                          batch: item.retranslateBatchIndex + 1,
                        })}
                  </Text>
                </View>
              )}
              {/* Time range translation mode badge */}
              {isTimeRangeTranslation && !isBatchRetranslation && (
                <View
                  style={[
                    styles.settingsBadge,
                    { backgroundColor: colors.primary + "30" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="clock-time-four-outline"
                    size={10}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.settingsBadgeText,
                      { color: colors.primary },
                    ]}
                    numberOfLines={1}
                  >
                    {formatTimeRange(item.rangeStart || 0)} -{" "}
                    {formatTimeRange(item.rangeEnd || item.duration || 0)}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.footer}>
            {item.status === "pending" && (
              <Text style={styles.statusText}>
                {t("queue.status.added", { date: formatDate(item.addedAt) })}
              </Text>
            )}
            {isActivelyTranslating &&
              !isBatchRetranslation &&
              !isTimeRangeTranslation && (
                <Text style={[styles.statusText, { color: colors.primary }]}>
                  {t("queue.status.translating")} ({item.progress!.completed}/
                  {item.progress!.total})
                </Text>
              )}
            {isActivelyTranslating &&
              isTimeRangeTranslation &&
              !isBatchRetranslation && (
                <Text style={[styles.statusText, { color: colors.primary }]}>
                  {t("queue.status.translatingRange", {
                    start: formatTimeRange(item.rangeStart || 0),
                    end: formatTimeRange(item.rangeEnd || item.duration || 0),
                  })}{" "}
                  ({item.progress!.completed}/{item.progress!.total})
                </Text>
              )}
            {isActivelyTranslating && isBatchRetranslation && (
              <Text style={[styles.statusText, { color: colors.primary }]}>
                {item.retranslateMode === "single"
                  ? t("queue.status.retranslatingSingle", {
                      batch: item.retranslateBatchIndex! + 1,
                    })
                  : t("queue.status.retranslatingFrom", {
                      batch: item.retranslateBatchIndex! + 1,
                    })}
              </Text>
            )}
            {isPaused && !isBatchRetranslation && !isTimeRangeTranslation && (
              <Text style={[styles.statusText, { color: colors.warning }]}>
                {t("queue.status.paused", {
                  completed: item.completedBatches,
                  total: item.totalBatches || "?",
                })}
              </Text>
            )}
            {isPaused && isTimeRangeTranslation && !isBatchRetranslation && (
              <Text style={[styles.statusText, { color: colors.warning }]}>
                {t("queue.status.pausedRange", {
                  start: formatTimeRange(item.rangeStart || 0),
                  end: formatTimeRange(item.rangeEnd || item.duration || 0),
                  completed: item.completedBatches || 0,
                  total: item.totalBatches || "?",
                })}
              </Text>
            )}
            {isPaused && isBatchRetranslation && (
              <Text style={[styles.statusText, { color: colors.warning }]}>
                {item.retranslateMode === "single"
                  ? t("queue.status.pausedBatchSingle", {
                      batch: item.retranslateBatchIndex! + 1,
                    })
                  : t("queue.status.pausedBatchFrom", {
                      batch: item.retranslateBatchIndex! + 1,
                    })}
              </Text>
            )}
            {isWaitingInQueue &&
              !isBatchRetranslationWaiting &&
              !isTimeRangeTranslationWaiting && (
                <Text style={[styles.statusText, { color: colors.primary }]}>
                  {queuePosition && totalInQueue
                    ? `${t(
                        "queue.status.waiting"
                      )} (${queuePosition}/${totalInQueue})`
                    : t("queue.status.waiting")}
                </Text>
              )}
            {isWaitingInQueue &&
              isTimeRangeTranslationWaiting &&
              !isBatchRetranslationWaiting && (
                <Text style={[styles.statusText, { color: colors.primary }]}>
                  {t("queue.status.waitingRange", {
                    start: formatTimeRange(item.rangeStart || 0),
                    end: formatTimeRange(item.rangeEnd || item.duration || 0),
                  })}
                  {queuePosition && totalInQueue
                    ? ` (${queuePosition}/${totalInQueue})`
                    : ""}
                </Text>
              )}
            {isWaitingInQueue && isBatchRetranslationWaiting && (
              <Text style={[styles.statusText, { color: colors.primary }]}>
                {item.retranslateMode === "single"
                  ? t("queue.status.waitingBatchSingle", {
                      batch: item.retranslateBatchIndex! + 1,
                    })
                  : t("queue.status.waitingBatchFrom", {
                      batch: item.retranslateBatchIndex! + 1,
                    })}
                {queuePosition && totalInQueue
                  ? ` (${queuePosition}/${totalInQueue})`
                  : ""}
              </Text>
            )}
            {item.status === "completed" && !isTimeRangeTranslation && (
              <Text style={[styles.statusText, { color: colors.success }]}>
                {t("queue.status.completed", {
                  date: formatDate(item.completedAt),
                })}
              </Text>
            )}
            {item.status === "completed" && isTimeRangeTranslation && (
              <Text style={[styles.statusText, { color: colors.success }]}>
                {t("queue.status.completedRange", {
                  start: formatTimeRange(item.rangeStart || 0),
                  end: formatTimeRange(item.rangeEnd || item.duration || 0),
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
  configRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flexWrap: "wrap" as const,
    marginTop: 2,
    gap: 4,
  },
  configText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  presetBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    gap: 2,
  },
  presetBadgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "500" as const,
  },
  settingsBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    gap: 2,
  },
  settingsBadgeText: {
    color: colors.textMuted,
    fontSize: 9,
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
