import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  useWindowDimensions,
  StatusBar,
  Platform,
} from "react-native";
import { alert, confirm, confirmDestructive } from "../common/CustomAlert";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { GeminiConfig, QueueItem, QueueStatus } from "@src/types";
import { queueManager } from "@services/queueManager";
import {
  getGeminiConfigs,
  getActiveTranslationConfig,
  saveActiveTranslationConfigId,
  getApiKeys,
} from "@utils/storage";
import QueueItemCard from "./QueueItemCard";
import QueueTabs, { TabType } from "./QueueTabs";
import QueueActions from "./QueueActions";
import QueueEmpty from "./QueueEmpty";
import QueuePagination from "./QueuePagination";
import { createQueueStyles } from "./queueStyles";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const FLOATING_BUTTON_HEIGHT = 0; // Removed extra padding, safe area is enough

interface TranslationQueueModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectVideo: (videoUrl: string) => void;
}

const TranslationQueueModal: React.FC<TranslationQueueModalProps> = ({
  visible,
  onClose,
  onSelectVideo,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [counts, setCounts] = useState({
    pending: 0,
    translating: 0,
    paused: 0,
    completed: 0,
    error: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [geminiConfigs, setGeminiConfigs] = useState<GeminiConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [showConfigPicker, setShowConfigPicker] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);

  const activeTabRef = useRef<TabType>(activeTab);
  const pageRef = useRef<number>(page);

  const queueStyles = useThemedStyles(() => createQueueStyles(colors));
  const themedStyles = useThemedStyles(queueModalThemedStyles);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    queueManager.initialize();
    const unsubscribe = queueManager.subscribe(() => {
      setCounts(queueManager.getCounts());
      loadItemsWithParams(activeTabRef.current, pageRef.current);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (visible) loadConfigs();
  }, [visible]);

  const loadConfigs = async () => {
    const [configs, activeConfig, apiKeys] = await Promise.all([
      getGeminiConfigs(),
      getActiveTranslationConfig(),
      getApiKeys(),
    ]);
    // Filter out chat config for translation picker
    const translationConfigs = configs.filter(
      (c) => c.id !== "default-chat-config"
    );
    setGeminiConfigs(translationConfigs);
    setHasApiKey(apiKeys.length > 0);
    if (activeConfig) {
      setSelectedConfigId(activeConfig.id);
    } else if (translationConfigs.length > 0) {
      setSelectedConfigId(translationConfigs[0].id);
    }
  };

  const handleSelectConfig = async (configId: string) => {
    setSelectedConfigId(configId);
    setShowConfigPicker(false);
    await saveActiveTranslationConfigId(configId);
  };

  useEffect(() => {
    loadItems();
  }, [activeTab, page]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const loadItemsWithParams = (tab: TabType, currentPage: number) => {
    const status: QueueStatus = tab;
    const result = queueManager.getItemsByStatus(status, currentPage);
    if (tab === "pending") {
      const errorResult = queueManager.getItemsByStatus("error", 1);
      setItems([...errorResult.items, ...result.items]);
      setTotalPages(Math.max(result.totalPages, 1));
    } else {
      setItems(result.items);
      setTotalPages(result.totalPages);
    }
  };

  const loadItems = () => loadItemsWithParams(activeTab, page);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
  };
  const handleStartTranslation = (item: QueueItem) => {
    confirm(
      t("queue.dialogs.translateOne"),
      t("queue.dialogs.translateOneConfirm", { title: item.title }),
      async () => {
        const result = await queueManager.startTranslation(item.id);
        if (result.queued) {
          // Video added to queue, will be translated when current one finishes
          alert(t("common.notice"), t("queue.addedToWaitingQueue"));
        }
      },
      t("queue.dialogs.translate")
    );
  };
  const handleResumeTranslation = (item: QueueItem) => {
    // Check if this is a batch retranslation paused
    if (item.retranslateBatchIndex !== undefined) {
      // Batch retranslation - need to resume differently
      confirm(
        t("queue.dialogs.resumeBatchTitle"),
        item.retranslateMode === "single"
          ? t("queue.dialogs.resumeBatchSingleConfirm", {
              title: item.title,
              batch: item.retranslateBatchIndex + 1,
            })
          : t("queue.dialogs.resumeBatchFromConfirm", {
              title: item.title,
              batch: item.retranslateBatchIndex + 1,
            }),
        async () => {
          // Resume batch retranslation - start immediately if not busy
          const result = await queueManager.resumeBatchRetranslation(
            item.videoUrl
          );
          if (result.queued) {
            alert(t("common.notice"), t("queue.addedToWaitingQueue"));
          } else if (!result.success) {
            alert(t("common.error"), t("errors.generic"));
          }
        },
        t("queue.dialogs.resume")
      );
      return;
    }

    // Normal full translation resume
    confirm(
      t("queue.dialogs.resumeTitle"),
      t("queue.dialogs.resumeConfirm", {
        title: item.title,
        completed: item.completedBatches || 0,
        total: item.totalBatches || "?",
      }),
      async () => {
        const result = await queueManager.resumeTranslation(item.id);
        if (result.queued) {
          alert(t("common.notice"), t("queue.addedToWaitingQueue"));
        } else if (!result.success && result.reason === "busy") {
          alert(
            t("common.notice"),
            t("subtitleModal.translate.anotherTranslating")
          );
        }
      },
      t("queue.dialogs.resume")
    );
  };
  const handleStartAll = () => {
    confirm(
      t("queue.dialogs.translateAllTitle"),
      t("queue.dialogs.translateAllConfirm"),
      async () => {
        const result = await queueManager.startAutoProcess();
        if (result.queued) {
          // Items added to queue, will start when current translation finishes
          alert(t("common.notice"), t("queue.addedToWaitingQueue"));
        }
      },
      t("common.start")
    );
  };
  const handleRemove = (item: QueueItem) => {
    confirmDestructive(
      t("queue.dialogs.removeTitle"),
      t("queue.dialogs.removeConfirm", { title: item.title }),
      () => queueManager.removeFromQueue(item.id)
    );
  };
  const handleRequeue = (item: QueueItem) => {
    queueManager.moveToPending(item.id);
  };
  const handleStopTranslation = (item: QueueItem) => {
    confirm(
      t("queue.dialogs.stopTitle"),
      t("queue.dialogs.stopConfirm", { title: item.title }),
      () => queueManager.stopTranslation(item.id),
      t("common.stop")
    );
  };
  const handleAbortTranslation = (item: QueueItem) => {
    confirmDestructive(
      t("queue.dialogs.abortTitle"),
      t("queue.dialogs.abortConfirm", { title: item.title }),
      () => queueManager.abortAndRemove(item.id)
    );
  };
  const handleClearPending = () => {
    confirmDestructive(
      t("queue.dialogs.clearPendingTitle"),
      t("queue.dialogs.clearPendingConfirm"),
      () => queueManager.clearPending()
    );
  };
  const handleClearCompleted = () => {
    confirmDestructive(
      t("queue.dialogs.clearCompletedTitle"),
      t("queue.dialogs.clearCompletedConfirm"),
      () => queueManager.clearByStatus("completed")
    );
  };
  const handleClearPaused = () => {
    confirmDestructive(
      t("queue.dialogs.clearPausedTitle"),
      t("queue.dialogs.clearPausedConfirm"),
      () => queueManager.clearByStatus("paused")
    );
  };
  const handleStopAll = () => {
    confirm(
      t("queue.dialogs.stopAllTitle"),
      t("queue.dialogs.stopAllConfirm"),
      () => queueManager.stopAll(),
      t("queue.actions.stopAll")
    );
  };
  const handleClearTranslating = () => {
    confirmDestructive(
      t("queue.dialogs.clearTranslatingTitle"),
      t("queue.dialogs.clearTranslatingConfirm"),
      () => queueManager.clearTranslating()
    );
  };
  const handleResumeAll = () => {
    confirm(
      t("queue.dialogs.resumeAllTitle"),
      t("queue.dialogs.resumeAllConfirm"),
      async () => {
        const result = await queueManager.resumeAllPaused();
        if (result.queued) {
          alert(t("common.notice"), t("queue.addedToWaitingQueue"));
        }
      },
      t("queue.actions.resumeAll")
    );
  };
  const handleSelectVideo = (item: QueueItem) => {
    onSelectVideo(item.videoUrl);
    handleClose();
  };

  const pendingCount = counts.pending + counts.error;

  // Tính toán padding cho safe area
  const statusBarHeight =
    Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const topPadding = Math.max(insets.top, statusBarHeight, 24);
  const bottomPadding = insets.bottom || 8; // Minimal padding, just safe area

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.container,
            themedStyles.container,
            {
              paddingTop: topPadding,
              paddingBottom: bottomPadding,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={themedStyles.headerTitle}>{t("queue.title")}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
          <QueueTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            counts={counts}
          />
          {activeTab === "pending" && pendingCount > 0 && (
            <QueueActions
              hasApiKey={hasApiKey}
              configs={geminiConfigs}
              selectedConfigId={selectedConfigId}
              showConfigPicker={showConfigPicker}
              onToggleConfigPicker={() =>
                setShowConfigPicker(!showConfigPicker)
              }
              onSelectConfig={handleSelectConfig}
              onStartAll={handleStartAll}
              onClearPending={handleClearPending}
              onConfigsUpdated={setGeminiConfigs}
            />
          )}
          {activeTab === "completed" && counts.completed > 0 && (
            <View style={queueStyles.actionSection}>
              <TouchableOpacity
                style={queueStyles.clearAllBtnFull}
                onPress={handleClearCompleted}
              >
                <MaterialCommunityIcons
                  name="delete-sweep"
                  size={20}
                  color={colors.error}
                />
                <Text style={queueStyles.clearAllText}>
                  {t("queue.actions.clearAll")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {activeTab === "translating" && counts.translating > 0 && (
            <View style={queueStyles.actionSection}>
              <View style={queueStyles.actionButtons}>
                <TouchableOpacity
                  style={[
                    queueStyles.clearAllBtnFull,
                    { flex: 1, borderColor: colors.warning },
                  ]}
                  onPress={handleStopAll}
                >
                  <MaterialCommunityIcons
                    name="stop-circle"
                    size={20}
                    color={colors.warning}
                  />
                  <Text
                    style={[
                      queueStyles.clearAllText,
                      { color: colors.warning },
                    ]}
                  >
                    {t("queue.actions.stopAll")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[queueStyles.clearAllBtnFull, { flex: 1 }]}
                  onPress={handleClearTranslating}
                >
                  <MaterialCommunityIcons
                    name="delete-sweep"
                    size={20}
                    color={colors.error}
                  />
                  <Text style={queueStyles.clearAllText}>
                    {t("queue.actions.clearAll")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {activeTab === "paused" && counts.paused > 0 && (
            <View style={queueStyles.actionSection}>
              <View style={queueStyles.actionButtons}>
                <TouchableOpacity
                  style={[
                    queueStyles.clearAllBtnFull,
                    { flex: 1, borderColor: colors.primary },
                  ]}
                  onPress={handleResumeAll}
                >
                  <MaterialCommunityIcons
                    name="play-circle"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      queueStyles.clearAllText,
                      { color: colors.primary },
                    ]}
                  >
                    {t("queue.actions.resumeAll")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[queueStyles.clearAllBtnFull, { flex: 1 }]}
                  onPress={handleClearPaused}
                >
                  <MaterialCommunityIcons
                    name="delete-sweep"
                    size={20}
                    color={colors.error}
                  />
                  <Text style={queueStyles.clearAllText}>
                    {t("queue.actions.clearAll")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              // Calculate queue position for translating items
              let queuePosition: number | undefined;
              let totalInQueue: number | undefined;
              if (activeTab === "translating") {
                // Items are already sorted by startedAt in getItemsByStatus
                queuePosition = index + 1 + (page - 1) * 10; // Account for pagination
                totalInQueue = counts.translating;
              }
              return (
                <QueueItemCard
                  item={item}
                  hasApiKey={hasApiKey}
                  queuePosition={queuePosition}
                  totalInQueue={totalInQueue}
                  onSelect={handleSelectVideo}
                  onStart={handleStartTranslation}
                  onResume={handleResumeTranslation}
                  onRequeue={handleRequeue}
                  onRemove={handleRemove}
                  onStop={handleStopTranslation}
                  onAbort={handleAbortTranslation}
                />
              );
            }}
            ListEmptyComponent={<QueueEmpty activeTab={activeTab} />}
            contentContainerStyle={
              items.length === 0 ? styles.emptyList : styles.list
            }
            showsVerticalScrollIndicator={false}
            extraData={activeTab}
          />
          <QueuePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1 },
  container: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  list: { paddingHorizontal: 16 },
  emptyList: { flex: 1 },
});

const queueModalThemedStyles = createThemedStyles((colors) => ({
  container: { backgroundColor: colors.background },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
}));

export default TranslationQueueModal;
