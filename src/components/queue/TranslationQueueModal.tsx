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
} from "react-native";
import { confirm, confirmDestructive } from "../common/CustomAlert";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@constants/colors";
import type { GeminiConfig, QueueItem, QueueStatus } from "@src/types";
import { queueManager } from "@services/queueManager";
import {
  getGeminiConfigs,
  getActiveGeminiConfig,
  saveActiveGeminiConfigId,
  getApiKeys,
} from "@utils/storage";
import QueueItemCard from "./QueueItemCard";
import QueueTabs, { TabType } from "./QueueTabs";
import QueueActions from "./QueueActions";
import QueueEmpty from "./QueueEmpty";
import QueuePagination from "./QueuePagination";
import { queueStyles } from "./queueStyles";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const FLOATING_BUTTON_HEIGHT = 80;

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
  const [hasApiKey, setHasApiKey] = useState(true);

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
      getActiveGeminiConfig(),
      getApiKeys(),
    ]);
    setGeminiConfigs(configs);
    setHasApiKey(apiKeys.length > 0);
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
      "Dịch video này",
      `Bắt đầu dịch "${item.title}"?`,
      () => queueManager.startTranslation(item.id),
      "Dịch"
    );
  };

  const handleStartAll = () => {
    confirm(
      "Dịch tất cả",
      "Dịch tự động tất cả video trong danh sách?",
      () => queueManager.startAutoProcess(),
      "Bắt đầu"
    );
  };

  const handleRemove = (item: QueueItem) => {
    confirmDestructive("Xóa video", `Bỏ "${item.title}" khỏi danh sách?`, () =>
      queueManager.removeFromQueue(item.id)
    );
  };

  const handleRequeue = (item: QueueItem) => {
    queueManager.moveToPending(item.id);
  };

  const handleClearPending = () => {
    confirmDestructive(
      "Xóa tất cả",
      "Bỏ hết video chưa dịch khỏi danh sách?",
      () => queueManager.clearPending()
    );
  };

  const handleClearCompleted = () => {
    confirmDestructive(
      "Xóa tất cả",
      "Bỏ hết video đã dịch khỏi danh sách?",
      () => queueManager.clearByStatus("completed")
    );
  };

  const handleSelectVideo = (item: QueueItem) => {
    onSelectVideo(item.videoUrl);
    handleClose();
  };

  const pendingCount = counts.pending + counts.error;
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
              marginTop: insets.top + 10,
              paddingBottom: bottomPadding,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Danh sách chờ dịch</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={COLORS.text}
              />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <QueueTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            counts={counts}
          />

          {/* Actions for Pending Tab */}
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
            />
          )}

          {/* Clear All for Completed Tab */}
          {activeTab === "completed" && counts.completed > 0 && (
            <View style={queueStyles.actionSection}>
              <TouchableOpacity
                style={queueStyles.clearAllBtnFull}
                onPress={handleClearCompleted}
              >
                <MaterialCommunityIcons
                  name="delete-sweep"
                  size={20}
                  color={COLORS.error}
                />
                <Text style={queueStyles.clearAllText}>Xóa tất cả</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* List */}
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <QueueItemCard
                item={item}
                hasApiKey={hasApiKey}
                onSelect={handleSelectVideo}
                onStart={handleStartTranslation}
                onRequeue={handleRequeue}
                onRemove={handleRemove}
              />
            )}
            ListEmptyComponent={<QueueEmpty activeTab={activeTab} />}
            contentContainerStyle={
              items.length === 0 ? styles.emptyList : styles.list
            }
            showsVerticalScrollIndicator={false}
            extraData={activeTab}
          />

          {/* Pagination */}
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
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  closeBtn: { padding: 4 },
  list: { paddingHorizontal: 16 },
  emptyList: { flex: 1 },
});

export default TranslationQueueModal;
