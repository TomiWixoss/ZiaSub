import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

import { COLORS } from "@constants/colors";
import {
  GeminiConfig,
  getGeminiConfigs,
  getActiveGeminiConfig,
  saveActiveGeminiConfigId,
  getChatSessions,
  getActiveChatSession,
  createChatSession,
  updateChatSession,
  deleteChatSession,
  setActiveChatSessionId,
  ChatSession,
  StoredChatMessage,
} from "@utils/storage";
import { ChatMessage, sendChatMessage } from "@services/chatService";
import ConfigSelector from "@components/chat/ConfigSelector";
import TaskCard, { TaskItem } from "@components/chat/TaskCard";
import ChatDrawer from "@components/chat/ChatDrawer";
import ChatInput from "@components/chat/ChatInput";

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  videoUrl?: string;
  videoTitle?: string;
}

// Quick actions
const QUICK_ACTIONS = [
  { id: "summary", label: "Tóm tắt video", icon: "text-box-outline" },
  { id: "analyze", label: "Phân tích nội dung", icon: "chart-box-outline" },
  { id: "keypoints", label: "Điểm chính", icon: "format-list-bulleted" },
  { id: "translate", label: "Dịch video", icon: "translate" },
];

const ChatModal: React.FC<ChatModalProps> = ({
  visible,
  onClose,
  videoUrl,
  videoTitle,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [configs, setConfigs] = useState<GeminiConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<GeminiConfig | null>(null);
  const [showConfigSelector, setShowConfigSelector] = useState(false);
  const [attachVideo, setAttachVideo] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(
    null
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isFromHistory, setIsFromHistory] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Convert messages to tasks
  const tasks = useMemo((): TaskItem[] => {
    const result: TaskItem[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === "user") {
        const nextMsg = messages[i + 1];
        const hasResult = nextMsg && nextMsg.role === "model";
        result.push({
          id: msg.id,
          command: msg.content,
          result: hasResult ? nextMsg.content : undefined,
          hasVideo: msg.hasVideo,
          videoTitle: msg.videoTitle,
          timestamp: msg.timestamp,
          status: hasResult
            ? nextMsg.content.startsWith("Lỗi:")
              ? "error"
              : "done"
            : "pending",
        });
      }
    }
    return result;
  }, [messages]);

  useEffect(() => {
    if (visible) {
      loadData();
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
      drawerAnim.setValue(-DRAWER_WIDTH);
      setDrawerOpen(false);
    }
  }, [visible]);

  useEffect(() => {
    if (currentSession && messages.length > 0) {
      const updatedSession = {
        ...currentSession,
        messages: messages as StoredChatMessage[],
        configId: activeConfig?.id || null,
      };
      updateChatSession(updatedSession);
    }
  }, [messages, activeConfig]);

  const toggleDrawer = () => {
    const opening = !drawerOpen;
    setDrawerOpen(opening);
    Animated.timing(drawerAnim, {
      toValue: opening ? 0 : -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const loadData = async () => {
    const [allConfigs, active, allSessions, activeSession] = await Promise.all([
      getGeminiConfigs(),
      getActiveGeminiConfig(),
      getChatSessions(),
      getActiveChatSession(),
    ]);
    setConfigs(allConfigs);
    setActiveConfig(active);
    setSessions(allSessions);
    if (activeSession) {
      setCurrentSession(activeSession);
      setMessages(activeSession.messages);
    }
  };

  const handleSelectConfig = async (config: GeminiConfig) => {
    setActiveConfig(config);
    await saveActiveGeminiConfigId(config.id);
    setShowConfigSelector(false);
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = async (text?: string, withVideo?: boolean) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading || !activeConfig) return;

    const shouldAttachVideo = withVideo !== undefined ? withVideo : attachVideo;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: Date.now(),
      hasVideo: shouldAttachVideo && !!videoUrl,
      videoTitle: shouldAttachVideo && !!videoUrl ? videoTitle : undefined,
    };

    if (!currentSession) {
      const newSession = await createChatSession(
        messageText.slice(0, 30),
        activeConfig.id
      );
      setCurrentSession(newSession);
      setSessions((prev) => [newSession, ...prev]);
    }

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");
    setAttachVideo(false);
    setIsLoading(true);
    setIsFromHistory(false);
    scrollToBottom();

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentAbort = abortControllerRef.current;

    sendChatMessage(
      newMessages,
      activeConfig,
      {
        onChunk: () => scrollToBottom(),
        onComplete: (fullText) => {
          // Ignore if aborted
          if (currentAbort.signal.aborted) return;

          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: fullText,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setIsLoading(false);
          abortControllerRef.current = null;
          scrollToBottom();
        },
        onError: (error) => {
          // Ignore if aborted
          if (currentAbort.signal.aborted) return;

          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: `Lỗi: ${error.message}`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsLoading(false);
          abortControllerRef.current = null;
        },
      },
      shouldAttachVideo ? videoUrl : undefined
    );
  };

  const handleQuickAction = (actionId: string) => {
    const actionMap: Record<string, string> = {
      summary: "Tóm tắt nội dung video này",
      analyze: "Phân tích chi tiết video này",
      keypoints: "Liệt kê các điểm chính trong video",
      translate: "Dịch nội dung video sang tiếng Việt",
    };
    handleSend(actionMap[actionId], true);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Thêm message lỗi cho task đang pending
    const errorMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "model",
      content: "Lỗi: Đã dừng bởi người dùng",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, errorMessage]);
    setIsLoading(false);
  };

  const handleNewChat = async () => {
    // Clear current state first
    setMessages([]);
    setAttachVideo(false);
    setInputText("");
    setIsFromHistory(false);

    // Create new session
    const newSession = await createChatSession(undefined, activeConfig?.id);
    setCurrentSession(newSession);

    // Reload sessions from storage to get fresh list
    const allSessions = await getChatSessions();
    setSessions(allSessions);

    toggleDrawer();
  };

  const handleSelectSession = async (session: ChatSession) => {
    await setActiveChatSessionId(session.id);
    setCurrentSession(session);
    setMessages(session.messages);
    setIsFromHistory(true);
    toggleDrawer();
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteChatSession(sessionId);
    const newSessions = sessions.filter((s) => s.id !== sessionId);
    setSessions(newSessions);
    if (currentSession?.id === sessionId) {
      if (newSessions.length > 0) {
        setCurrentSession(newSessions[0]);
        setMessages(newSessions[0].messages);
      } else {
        setCurrentSession(null);
        setMessages([]);
      }
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

  const handleCopyResult = (text: string) => {
    // Optional: show toast or feedback
  };

  const handleRegenerateTask = (task: TaskItem) => {
    if (isLoading || !activeConfig) return;

    // Tìm index của task trong messages (user message)
    const taskIndex = messages.findIndex((m) => m.id === task.id);
    if (taskIndex === -1) return;

    // Luôn xóa task cũ (cả user message và response nếu có)
    const hasResponse = messages[taskIndex + 1]?.role === "model";
    const removeCount = hasResponse ? 2 : 1;
    const newMessages = [
      ...messages.slice(0, taskIndex),
      ...messages.slice(taskIndex + removeCount),
    ];

    // Lưu command, hasVideo và videoTitle trước khi xóa
    const command = task.command;
    const hasVideo = task.hasVideo;
    const taskVideoTitle = task.videoTitle;

    // Tạo task mới với ID mới
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: command,
      timestamp: Date.now(),
      hasVideo: hasVideo,
      videoTitle: taskVideoTitle,
    };

    const updatedMessages = [...newMessages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setIsFromHistory(false);
    scrollToBottom();

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentAbort = abortControllerRef.current;

    sendChatMessage(
      updatedMessages,
      activeConfig,
      {
        onChunk: () => scrollToBottom(),
        onComplete: (fullText) => {
          if (currentAbort.signal.aborted) return;
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: fullText,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setIsLoading(false);
          abortControllerRef.current = null;
          scrollToBottom();
        },
        onError: (error) => {
          if (currentAbort.signal.aborted) return;
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: `Lỗi: ${error.message}`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsLoading(false);
          abortControllerRef.current = null;
        },
      },
      hasVideo ? videoUrl : undefined
    );
  };

  const handleDeleteTask = (taskId: string) => {
    // Tìm index của task trong messages
    const taskIndex = messages.findIndex((m) => m.id === taskId);
    if (taskIndex === -1) return;

    // Xóa cả user message và response (nếu có)
    const hasResponse = messages[taskIndex + 1]?.role === "model";
    const removeCount = hasResponse ? 2 : 1;
    const newMessages = [
      ...messages.slice(0, taskIndex),
      ...messages.slice(taskIndex + removeCount),
    ];
    setMessages(newMessages);
  };

  const renderTask = ({ item, index }: { item: TaskItem; index: number }) => {
    // Mặc định mở task cuối cùng (đang pending hoặc mới nhất), đóng các task cũ khi load từ history
    const isLastTask = index === tasks.length - 1;
    const shouldExpand =
      isLastTask && (!isFromHistory || item.status === "pending");
    return (
      <TaskCard
        task={item}
        defaultExpanded={shouldExpand}
        onCopy={handleCopyResult}
        onRegenerate={handleRegenerateTask}
        onDelete={handleDeleteTask}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.greeting}>Xin chào!</Text>
      <Text style={styles.greetingSubtitle}>Tôi có thể giúp gì cho bạn?</Text>
      {videoUrl && (
        <View style={styles.quickActionsContainer}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionBtn}
              onPress={() => handleQuickAction(action.id)}
              disabled={isLoading}
            >
              <MaterialCommunityIcons
                name={action.icon as any}
                size={18}
                color={COLORS.text}
              />
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const topPadding = Math.max(insets.top, 24);
  const bottomPadding = Math.max(insets.bottom, 10);

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
            {
              paddingTop: topPadding,
              paddingBottom: bottomPadding,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={toggleDrawer}>
              <MaterialCommunityIcons
                name="menu"
                size={24}
                color={COLORS.text}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Zia</Text>
            <TouchableOpacity style={styles.headerBtn} onPress={handleClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={COLORS.text}
              />
            </TouchableOpacity>
          </View>

          {/* Tasks */}
          <FlatList
            ref={flatListRef}
            data={tasks}
            renderItem={renderTask}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.taskList}
            ListEmptyComponent={renderEmptyState}
          />

          {/* Input Area */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ChatInput
              inputText={inputText}
              onChangeText={setInputText}
              onSend={() => handleSend()}
              onStop={handleStop}
              isLoading={isLoading}
              videoUrl={videoUrl}
              videoTitle={videoTitle}
              attachVideo={attachVideo}
              onToggleVideo={() => setAttachVideo(!attachVideo)}
              configName={activeConfig?.name || "Chọn model"}
              onOpenConfig={() => setShowConfigSelector(true)}
            />
          </KeyboardAvoidingView>

          {/* Drawer Overlay */}
          {drawerOpen && (
            <TouchableOpacity
              style={styles.drawerOverlay}
              activeOpacity={1}
              onPress={toggleDrawer}
            />
          )}

          {/* Drawer */}
          <ChatDrawer
            sessions={sessions}
            currentSession={currentSession}
            drawerAnim={drawerAnim}
            paddingTop={topPadding + 20}
            onNewChat={handleNewChat}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onUpdateSessions={setSessions}
            onUpdateCurrentSession={setCurrentSession}
          />

          <ConfigSelector
            visible={showConfigSelector}
            configs={configs}
            activeConfig={activeConfig}
            onSelect={handleSelectConfig}
            onClose={() => setShowConfigSelector(false)}
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
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "600",
  },
  taskList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 8,
    paddingTop: 40,
  },
  greeting: {
    color: COLORS.textSecondary,
    fontSize: 18,
    marginBottom: 4,
  },
  greetingSubtitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "600",
    marginBottom: 32,
  },
  quickActionsContainer: {
    gap: 10,
    width: "100%",
  },
  quickActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceLight,
    alignSelf: "flex-start",
  },
  quickActionLabel: {
    color: COLORS.text,
    fontSize: 15,
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});

export default ChatModal;
