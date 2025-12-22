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
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import { DEFAULT_CHAT_CONFIG_ID } from "@constants/defaults";
import type {
  GeminiConfig,
  ChatSession,
  ChatMessage,
  StoredChatMessage,
} from "@src/types";
import {
  getGeminiConfigs,
  saveActiveChatConfigId,
  getActiveChatConfig,
  getChatSessions,
  getActiveChatSession,
  createChatSession,
  updateChatSession,
  deleteChatSession,
  setActiveChatSessionId,
  getApiKeys,
} from "@utils/storage";
import { sendChatMessage } from "@services/chatService";
import ConfigSelector from "./ConfigSelector";
import TaskCard, { TaskItem } from "./TaskCard";
import ChatDrawer from "./ChatDrawer";
import ChatInput from "./ChatInput";
import ChatEmptyState from "./ChatEmptyState";
import VideoTimeRangePicker from "./VideoTimeRangePicker";
import type { VideoTimeRange } from "@src/types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  videoUrl?: string;
  videoTitle?: string;
  videoDuration?: number;
  onLoadingChange?: (isLoading: boolean) => void;
}

const QUICK_ACTION_MAP: Record<string, string> = {
  summary: "Tóm tắt nội dung video này",
  analyze: "Phân tích chi tiết video này",
  keypoints: "Liệt kê các điểm chính trong video",
  translate: "Dịch nội dung video sang tiếng Việt",
};

const ChatModal: React.FC<ChatModalProps> = ({
  visible,
  onClose,
  videoUrl,
  videoTitle,
  videoDuration,
  onLoadingChange,
}) => {
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(chatModalThemedStyles);
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
  const [hasApiKey, setHasApiKey] = useState(true);
  const [videoTimeRange, setVideoTimeRange] = useState<VideoTimeRange | null>(
    null
  );
  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  // Keyboard handling with react-native-keyboard-controller
  const keyboardHeight = useSharedValue(0);

  useKeyboardHandler(
    {
      onMove: (event) => {
        "worklet";
        keyboardHeight.value = Math.max(event.height, 0);
      },
    },
    []
  );

  const keyboardAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardHeight.value,
  }));

  const tasks = useMemo((): TaskItem[] => {
    const result: TaskItem[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === "user") {
        const nextMsg = messages[i + 1];
        const hasResult = nextMsg && nextMsg.role === "model";
        const isLastMessage = i === messages.length - 1;

        let status: "done" | "error" | "pending";
        if (hasResult) {
          status = nextMsg.content.startsWith("Lỗi:") ? "error" : "done";
        } else if (isLastMessage && isLoading) {
          // Currently processing
          status = "pending";
        } else {
          // No response and not loading = interrupted/error
          status = "error";
        }

        result.push({
          id: msg.id,
          command: msg.content,
          result: hasResult
            ? nextMsg.content
            : status === "error"
            ? "Lỗi: Bị gián đoạn"
            : undefined,
          hasVideo: msg.hasVideo,
          videoTitle: msg.videoTitle,
          videoUrl: (msg as StoredChatMessage).videoUrl,
          videoTimeRange: msg.videoTimeRange,
          timestamp: msg.timestamp,
          status,
        });
      }
    }
    return result;
  }, [messages, isLoading]);

  // Track current session ID for abort handling
  useEffect(() => {
    currentSessionIdRef.current = currentSession?.id || null;
  }, [currentSession]);

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

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

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
    const [allConfigs, allSessions, activeSession, activeChatConfig, apiKeys] =
      await Promise.all([
        getGeminiConfigs(),
        getChatSessions(),
        getActiveChatSession(),
        getActiveChatConfig(),
        getApiKeys(),
      ]);
    setConfigs(allConfigs);
    setHasApiKey(apiKeys.length > 0);
    // Use saved chat config or default chat config
    if (activeChatConfig) {
      setActiveConfig(activeChatConfig);
    } else {
      const chatConfig = allConfigs.find(
        (c) => c.id === DEFAULT_CHAT_CONFIG_ID
      );
      setActiveConfig(chatConfig || allConfigs[0] || null);
    }
    setSessions(allSessions);
    if (activeSession) {
      setCurrentSession(activeSession);
      setMessages(activeSession.messages);
    }
  };

  const handleSelectConfig = async (config: GeminiConfig) => {
    setActiveConfig(config);
    await saveActiveChatConfigId(config.id);
    setShowConfigSelector(false);
  };
  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = async (text?: string, withVideo?: boolean) => {
    const messageText = text || inputText.trim();
    if (!messageText || isLoading || !activeConfig) return;
    const shouldAttachVideo = withVideo !== undefined ? withVideo : attachVideo;
    const userMessage: StoredChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: Date.now(),
      hasVideo: shouldAttachVideo && !!videoUrl,
      videoTitle: shouldAttachVideo && !!videoUrl ? videoTitle : undefined,
      videoTimeRange:
        shouldAttachVideo && !!videoUrl && videoTimeRange
          ? videoTimeRange
          : undefined,
      videoUrl: shouldAttachVideo && !!videoUrl ? videoUrl : undefined,
    };

    let sessionToUse = currentSession;
    if (!sessionToUse) {
      // Create new session with first message as name
      const sessionName = messageText.slice(0, 50);
      const newSession = await createChatSession(sessionName, activeConfig.id);
      sessionToUse = newSession;
      setCurrentSession(newSession);
      setSessions((prev) => [newSession, ...prev]);
    } else if (
      sessionToUse.messages.length === 0 &&
      sessionToUse.name === "Chat mới"
    ) {
      // Update session name with first message if it's still default
      const sessionName = messageText.slice(0, 50);
      const updatedSession = { ...sessionToUse, name: sessionName };
      await updateChatSession(updatedSession);
      setCurrentSession(updatedSession);
      setSessions((prev) =>
        prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
      );
      sessionToUse = updatedSession;
    }

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");
    setAttachVideo(false);
    setVideoTimeRange(null);
    setIsLoading(true);
    setIsFromHistory(false);
    scrollToBottom();
    abortControllerRef.current = new AbortController();
    const currentAbort = abortControllerRef.current;
    const currentSessionId = sessionToUse.id;
    sendChatMessage(
      newMessages,
      activeConfig,
      {
        onChunk: () => scrollToBottom(),
        onComplete: (fullText) => {
          if (currentAbort.signal.aborted) return;
          // Check if we're still on the same session
          if (currentSessionIdRef.current !== currentSessionId) return;
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
          // Check if we're still on the same session
          if (currentSessionIdRef.current !== currentSessionId) return;
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
      shouldAttachVideo ? videoUrl : undefined,
      shouldAttachVideo ? userMessage.videoTimeRange : undefined
    );
  };

  const handleQuickAction = (actionId: string) => {
    handleSend(QUICK_ACTION_MAP[actionId], true);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
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
    // Abort any running request from previous session
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Reset loading state for new chat
    setIsLoading(false);
    setMessages([]);
    setAttachVideo(false);
    setInputText("");
    setIsFromHistory(false);
    const newSession = await createChatSession(undefined, activeConfig?.id);
    setCurrentSession(newSession);
    const allSessions = await getChatSessions();
    setSessions(allSessions);
    toggleDrawer();
  };

  const handleSelectSession = async (session: ChatSession) => {
    // Abort any running request from previous session
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Reset loading state when switching sessions
    setIsLoading(false);
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

  const handleRegenerateTask = (task: TaskItem) => {
    if (isLoading || !activeConfig) return;
    const taskIndex = messages.findIndex((m) => m.id === task.id);
    if (taskIndex === -1) return;
    const hasResponse = messages[taskIndex + 1]?.role === "model";
    const removeCount = hasResponse ? 2 : 1;
    const newMessages = [
      ...messages.slice(0, taskIndex),
      ...messages.slice(taskIndex + removeCount),
    ];
    const userMessage: StoredChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: task.command,
      timestamp: Date.now(),
      hasVideo: task.hasVideo,
      videoTitle: task.videoTitle,
      videoTimeRange: task.videoTimeRange,
      videoUrl: task.videoUrl,
    };
    const updatedMessages = [...newMessages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setIsFromHistory(false);
    scrollToBottom();
    abortControllerRef.current = new AbortController();
    const currentAbort = abortControllerRef.current;
    const currentSessionId = currentSession?.id;
    // Use videoUrl from task (stored in message) or fallback to prop
    const taskVideoUrl = task.videoUrl || videoUrl;
    sendChatMessage(
      updatedMessages,
      activeConfig,
      {
        onChunk: () => scrollToBottom(),
        onComplete: (fullText) => {
          if (currentAbort.signal.aborted) return;
          if (currentSessionIdRef.current !== currentSessionId) return;
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
          if (currentSessionIdRef.current !== currentSessionId) return;
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
      task.hasVideo ? taskVideoUrl : undefined,
      task.videoTimeRange
    );
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskIndex = messages.findIndex((m) => m.id === taskId);
    if (taskIndex === -1) return;
    const hasResponse = messages[taskIndex + 1]?.role === "model";
    const removeCount = hasResponse ? 2 : 1;
    const newMessages = [
      ...messages.slice(0, taskIndex),
      ...messages.slice(taskIndex + removeCount),
    ];
    setMessages(newMessages);

    // Immediately persist to storage
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        messages: newMessages as StoredChatMessage[],
        updatedAt: Date.now(),
      };
      await updateChatSession(updatedSession);
      setCurrentSession(updatedSession);
      setSessions((prev) =>
        prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
      );
    }
  };

  const renderTask = ({ item, index }: { item: TaskItem; index: number }) => {
    const isLastTask = index === tasks.length - 1;
    const shouldExpand =
      isLastTask && (!isFromHistory || item.status === "pending");
    return (
      <TaskCard
        task={item}
        defaultExpanded={shouldExpand}
        onCopy={() => {}}
        onRegenerate={handleRegenerateTask}
        onDelete={handleDeleteTask}
      />
    );
  };

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
            themedStyles.container,
            {
              paddingTop: topPadding,
              paddingBottom: bottomPadding,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={toggleDrawer}>
              <MaterialCommunityIcons
                name="menu"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={themedStyles.headerTitle} numberOfLines={1}>
              {currentSession?.name || "Zia"}
            </Text>
            <TouchableOpacity style={styles.headerBtn} onPress={handleClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
          <FlatList
            ref={flatListRef}
            data={tasks}
            renderItem={renderTask}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.taskList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            ListEmptyComponent={
              <ChatEmptyState
                hasApiKey={hasApiKey}
                hasVideo={!!videoUrl}
                isLoading={isLoading}
                onQuickAction={handleQuickAction}
              />
            }
          />
          <Reanimated.View style={keyboardAnimatedStyle}>
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
              disabled={!hasApiKey}
              videoTimeRange={videoTimeRange}
              onOpenTimeRange={() => setShowTimeRangePicker(true)}
            />
          </Reanimated.View>
          {drawerOpen && (
            <TouchableOpacity
              style={styles.drawerOverlay}
              activeOpacity={1}
              onPress={toggleDrawer}
            />
          )}
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
          <VideoTimeRangePicker
            visible={showTimeRangePicker}
            onClose={() => setShowTimeRangePicker(false)}
            onConfirm={setVideoTimeRange}
            currentRange={videoTimeRange}
            videoDuration={videoDuration}
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
  taskList: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
});

const chatModalThemedStyles = createThemedStyles((colors) => ({
  container: { backgroundColor: colors.background },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
}));

export default ChatModal;
