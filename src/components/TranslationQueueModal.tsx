import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Animated,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import { confirm, confirmDestructive } from "./CustomAlert";
import Button3D from "./Button3D";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@constants/colors";
import { queueManager, QueueItem, QueueStatus } from "@services/queueManager";
import {
  GeminiConfig,
  getGeminiConfigs,
  getActiveGeminiConfig,
  saveActiveGeminiConfigId,
} from "@utils/storage";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const FLOATING_BUTTON_HEIGHT = 80; // Height reserved for floating buttons

type TabType = "pending" | "translating" | "completed";

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
    completed: 0,
    error: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [geminiConfigs, setGeminiConfigs] = useState<GeminiConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [showConfigPicker, setShowConfigPicker] = useState(false);

  // Use ref to track current tab for subscription callback
  const activeTabRef = useRef<TabType>(activeTab);
  const pageRef = useRef<number>(page);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    queueManager.initialize();
    loadConfigs();
    const unsubscribe = queueManager.subscribe(() => {
      setCounts(queueManager.getCounts());
      // Use refs to get current values
      loadItemsWithParams(activeTabRef.current, pageRef.current);
    });
    return () => unsubscribe();
  }, []);

  const loadConfigs = async () => {
    const configs = await getGeminiConfigs();
    setGeminiConfigs(configs);
    const activeConfig = await getActiveGeminiConfig();
    if (activeConfig) setSelectedConfigId(activeConfig.id);
  };

  const handleSelectConfig = async (configId: string) => {
    setSelectedConfigId(configId);
    setShowConfigPicker(false);
    await saveActiveGeminiConfigId(configId);
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
    const status: QueueStatus = tab === "translating" ? "translating" : tab;
    const result = queueManager.getItemsByStatus(status, currentPage);

    // Include error items in pending tab
    if (tab === "pending") {
      const errorResult = queueManager.getItemsByStatus("error", 1);
      setItems([...errorResult.items, ...result.items]);
      setTotalPages(Math.max(result.totalPages, 1));
    } else {
      setItems(result.items);
      setTotalPages(result.totalPages);
    }
  };

  const loadItems = () => {
    loadItemsWithParams(activeTab, page);
  };

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

  const handleStartTranslation = (item: QueueItem) => {
    confirm(
      "Bắt đầu dịch",
      `Dịch video "${item.title}"?`,
      () => queueManager.startTranslation(item.id),
      "Dịch"
    );
  };

  const handleStartAll = () => {
    confirm(
      "Dịch tất cả",
      "Bắt đầu dịch tự động tất cả video trong danh sách?",
      () => queueManager.startAutoProcess(),
      "Bắt đầu"
    );
  };

  const handleRemove = (item: QueueItem) => {
    confirmDestructive("Xóa", `Xóa "${item.title}" khỏi danh sách?`, () =>
      queueManager.removeFromQueue(item.id)
    );
  };

  const handleRequeue = (item: QueueItem) => {
    queueManager.moveToPending(item.id);
  };

  const handleClearPending = () => {
    confirmDestructive(
      "Xóa tất cả",
      "Xóa tất cả video chưa dịch khỏi danh sách?",
      () => queueManager.clearPending()
    );
  };

  const handleClearCompleted = () => {
    confirmDestructive(
      "Xóa tất cả",
      "Xóa tất cả video đã dịch khỏi danh sách?",
      () => queueManager.clearByStatus("completed")
    );
  };

  const handleSelectVideo = (item: QueueItem) => {
    onSelectVideo(item.videoUrl);
    handleClose();
  };

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

  const renderItem = ({ item }: { item: QueueItem }) => (
    <TouchableOpacity
      style={styles.queueItem}
      onPress={() => handleSelectVideo(item)}
    >
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
              Thêm: {formatDate(item.addedAt)}
            </Text>
          )}
          {item.status === "translating" && (
            <Text style={[styles.dateText, { color: COLORS.primary }]}>
              Đang dịch...
            </Text>
          )}
          {item.status === "completed" && (
            <Text style={[styles.dateText, { color: COLORS.success }]}>
              Xong: {formatDate(item.completedAt)}
            </Text>
          )}
          {item.status === "error" && (
            <Text
              style={[styles.dateText, { color: COLORS.error }]}
              numberOfLines={1}
            >
              Lỗi: {item.error}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.itemActions}>
        {(item.status === "pending" || item.status === "error") && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleStartTranslation(item)}
          >
            <MaterialCommunityIcons
              name="play"
              size={20}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        )}
        {item.status === "completed" && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleRequeue(item)}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={20}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleRemove(item)}
        >
          <MaterialCommunityIcons
            name="delete-outline"
            size={20}
            color={COLORS.error}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name={
          activeTab === "completed" ? "check-circle-outline" : "playlist-plus"
        }
        size={48}
        color={COLORS.textMuted}
      />
      <Text style={styles.emptyText}>
        {activeTab === "pending" && "Chưa có video nào trong danh sách"}
        {activeTab === "translating" && "Không có video đang dịch"}
        {activeTab === "completed" && "Chưa có video nào đã dịch"}
      </Text>
    </View>
  );

  const pendingCount = counts.pending + counts.error;

  // Calculate bottom padding: more space in portrait to avoid floating buttons
  const bottomPadding = isPortrait
    ? Math.max(insets.bottom, 20) + FLOATING_BUTTON_HEIGHT
    : Math.max(insets.bottom, 20);

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.container,
            {
              marginTop: insets.top + 20,
              paddingBottom: bottomPadding,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Danh sách dịch</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={COLORS.text}
              />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "pending" && styles.tabActive]}
              onPress={() => {
                setActiveTab("pending");
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "pending" && styles.tabTextActive,
                ]}
              >
                Chưa dịch
              </Text>
              {pendingCount > 0 && (
                <View
                  style={[
                    styles.badge,
                    activeTab === "pending" && styles.badgeActive,
                  ]}
                >
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "translating" && styles.tabActive,
              ]}
              onPress={() => {
                setActiveTab("translating");
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "translating" && styles.tabTextActive,
                ]}
              >
                Đang dịch
              </Text>
              {counts.translating > 0 && (
                <View
                  style={[
                    styles.badge,
                    styles.badgeProcessing,
                    activeTab === "translating" && styles.badgeActive,
                  ]}
                >
                  <Text style={styles.badgeText}>{counts.translating}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "completed" && styles.tabActive,
              ]}
              onPress={() => {
                setActiveTab("completed");
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "completed" && styles.tabTextActive,
                ]}
              >
                Đã dịch
              </Text>
              {counts.completed > 0 && (
                <View
                  style={[
                    styles.badge,
                    styles.badgeCompleted,
                    activeTab === "completed" && styles.badgeActive,
                  ]}
                >
                  <Text style={styles.badgeText}>{counts.completed}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Config Picker & Start All Button */}
          {activeTab === "pending" && pendingCount > 0 && (
            <View style={styles.actionSection}>
              {/* Config Picker */}
              <TouchableOpacity
                style={styles.configPicker}
                onPress={() => setShowConfigPicker(!showConfigPicker)}
              >
                <View style={styles.configPickerLeft}>
                  <MaterialCommunityIcons
                    name="robot"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.configPickerText} numberOfLines={1}>
                    {geminiConfigs.find((c) => c.id === selectedConfigId)
                      ?.name || "Chọn cấu hình"}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={showConfigPicker ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>

              {showConfigPicker && (
                <View style={styles.configDropdown}>
                  {geminiConfigs.map((config) => (
                    <TouchableOpacity
                      key={config.id}
                      style={[
                        styles.configOption,
                        config.id === selectedConfigId &&
                          styles.configOptionActive,
                      ]}
                      onPress={() => handleSelectConfig(config.id)}
                    >
                      <Text
                        style={[
                          styles.configOptionText,
                          config.id === selectedConfigId &&
                            styles.configOptionTextActive,
                        ]}
                      >
                        {config.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.actionButtons}>
                <View style={styles.actionButtonPrimary}>
                  <Button3D
                    title="Dịch tự động tất cả"
                    icon="play-circle"
                    variant="primary"
                    onPress={handleStartAll}
                  />
                </View>
                <TouchableOpacity
                  style={styles.clearAllBtn}
                  onPress={handleClearPending}
                >
                  <MaterialCommunityIcons
                    name="delete-sweep"
                    size={22}
                    color={COLORS.error}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Clear All for Completed Tab */}
          {activeTab === "completed" && counts.completed > 0 && (
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={styles.clearAllBtnFull}
                onPress={handleClearCompleted}
              >
                <MaterialCommunityIcons
                  name="delete-sweep"
                  size={20}
                  color={COLORS.error}
                />
                <Text style={styles.clearAllText}>Xóa tất cả</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* List */}
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={
              items.length === 0 ? styles.emptyList : styles.list
            }
            showsVerticalScrollIndicator={false}
            extraData={activeTab}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={24}
                  color={page === 1 ? COLORS.textMuted : COLORS.text}
                />
              </TouchableOpacity>
              <Text style={styles.pageText}>
                {page} / {totalPages}
              </Text>
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  page === totalPages && styles.pageBtnDisabled,
                ]}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={page === totalPages ? COLORS.textMuted : COLORS.text}
                />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  closeBtn: { padding: 4 },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: { backgroundColor: COLORS.surfaceElevated },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "500" },
  tabTextActive: { color: COLORS.text },
  badge: {
    backgroundColor: COLORS.textMuted,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  badgeActive: { backgroundColor: COLORS.primary },
  badgeProcessing: { backgroundColor: COLORS.warning },
  badgeCompleted: { backgroundColor: COLORS.success },
  badgeText: { color: COLORS.background, fontSize: 11, fontWeight: "600" },
  actionSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  configPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  configPickerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  configPickerText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  configDropdown: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  configOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  configOptionActive: { backgroundColor: COLORS.surfaceElevated },
  configOptionText: { color: COLORS.text, fontSize: 13 },
  configOptionTextActive: { color: COLORS.primary, fontWeight: "600" },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButtonPrimary: {
    flex: 1,
  },
  clearAllBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  clearAllBtnFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 8,
  },
  clearAllText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: "500",
  },
  list: { paddingHorizontal: 16 },
  emptyList: { flex: 1 },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    minHeight: 78,
  },
  thumbnail: {
    width: 120,
    height: 68,
    backgroundColor: COLORS.surfaceLight,
    flexShrink: 0,
  },
  progressOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 120,
    height: 68,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  itemInfo: { flex: 1, padding: 10 },
  itemTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  itemMeta: { flexDirection: "row", gap: 6, marginTop: 4 },
  metaText: { color: COLORS.textMuted, fontSize: 11 },
  itemFooter: { marginTop: 4 },
  dateText: { color: COLORS.textMuted, fontSize: 11 },
  itemActions: { justifyContent: "center", paddingRight: 8, gap: 4 },
  actionBtn: { padding: 6 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 16,
  },
  pageBtn: { padding: 8 },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { color: COLORS.text, fontSize: 14 },
});

export default TranslationQueueModal;
