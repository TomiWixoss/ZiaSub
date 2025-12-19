import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@constants/colors";
import { queueManager, QueueItem, QueueStatus } from "@services/queueManager";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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

  useEffect(() => {
    queueManager.initialize();
    const unsubscribe = queueManager.subscribe((allItems) => {
      setCounts(queueManager.getCounts());
      loadItems();
    });
    return () => unsubscribe();
  }, []);

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

  const loadItems = () => {
    const status: QueueStatus =
      activeTab === "translating" ? "translating" : activeTab;
    const result = queueManager.getItemsByStatus(status, page);

    // Include error items in pending tab
    if (activeTab === "pending") {
      const errorResult = queueManager.getItemsByStatus("error", 1);
      setItems([...errorResult.items, ...result.items]);
      setTotalPages(Math.max(result.totalPages, 1));
    } else {
      setItems(result.items);
      setTotalPages(result.totalPages);
    }
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
    Alert.alert("Bắt đầu dịch", `Dịch video "${item.title}"?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Dịch", onPress: () => queueManager.startTranslation(item.id) },
    ]);
  };

  const handleStartAll = () => {
    Alert.alert(
      "Dịch tất cả",
      "Bắt đầu dịch tự động tất cả video trong danh sách?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Bắt đầu", onPress: () => queueManager.startAutoProcess() },
      ]
    );
  };

  const handleRemove = (item: QueueItem) => {
    Alert.alert("Xóa", `Xóa "${item.title}" khỏi danh sách?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => queueManager.removeFromQueue(item.id),
      },
    ]);
  };

  const handleRequeue = (item: QueueItem) => {
    queueManager.moveToPending(item.id);
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
              paddingTop: insets.top + 10,
              paddingBottom: insets.bottom + 10,
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

          {/* Start All Button */}
          {activeTab === "pending" && pendingCount > 0 && (
            <TouchableOpacity
              style={styles.startAllBtn}
              onPress={handleStartAll}
            >
              <MaterialCommunityIcons
                name="play-circle"
                size={20}
                color={COLORS.text}
              />
              <Text style={styles.startAllText}>Dịch tự động tất cả</Text>
            </TouchableOpacity>
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
  startAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  startAllText: { color: COLORS.text, fontSize: 14, fontWeight: "600" },
  list: { paddingHorizontal: 16 },
  emptyList: { flex: 1 },
  queueItem: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  thumbnail: { width: 120, height: 68, backgroundColor: COLORS.surfaceLight },
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
  itemInfo: { flex: 1, padding: 10, justifyContent: "space-between" },
  itemTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
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
