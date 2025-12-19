import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { COLORS } from "@constants/colors";
import {
  GeminiConfig,
  getGeminiConfigs,
  getActiveGeminiConfig,
  saveActiveGeminiConfigId,
  getChatHistory,
  saveChatHistory,
  clearChatHistory,
  StoredChatMessage,
} from "@utils/storage";
import { ChatMessage, sendChatMessage } from "@services/chatService";
import ConfigSelector from "@components/chat/ConfigSelector";

interface ChatScreenProps {
  onBack: () => void;
  videoUrl?: string;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ onBack, videoUrl }) => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [configs, setConfigs] = useState<GeminiConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<GeminiConfig | null>(null);
  const [showConfigSelector, setShowConfigSelector] = useState(false);
  const [attachedVideoUrl, setAttachedVideoUrl] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Save chat history when messages change
  useEffect(() => {
    if (messages.length > 0 && activeConfig) {
      saveChatHistory({
        messages: messages as StoredChatMessage[],
        lastConfigId: activeConfig.id,
        videoUrl: attachedVideoUrl,
      });
    }
  }, [messages, activeConfig, attachedVideoUrl]);

  const loadData = async () => {
    const [allConfigs, active, history] = await Promise.all([
      getGeminiConfigs(),
      getActiveGeminiConfig(),
      getChatHistory(),
    ]);
    setConfigs(allConfigs);
    setActiveConfig(active);

    // Restore chat history
    if (history.messages.length > 0) {
      setMessages(history.messages);
      setAttachedVideoUrl(history.videoUrl);
    }
  };

  const handleSelectConfig = async (config: GeminiConfig) => {
    setActiveConfig(config);
    await saveActiveGeminiConfigId(config.id);
    setShowConfigSelector(false);
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading || !activeConfig) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputText.trim(),
      timestamp: Date.now(),
      hasVideo: attachedVideoUrl !== null && messages.length === 0, // Video chỉ attach vào tin đầu tiên
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");
    setIsLoading(true);
    setStreamingText("");
    scrollToBottom();

    // Clear attached video sau khi gửi tin đầu tiên
    const currentVideoUrl = attachedVideoUrl;
    if (userMessage.hasVideo) {
      setAttachedVideoUrl(null);
    }

    sendChatMessage(
      newMessages,
      activeConfig,
      {
        onChunk: (text) => {
          setStreamingText(text);
          scrollToBottom();
        },
        onComplete: (fullText) => {
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: fullText,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setStreamingText("");
          setIsLoading(false);
          scrollToBottom();
        },
        onError: (error) => {
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: `❌ Lỗi: ${error.message}`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          setStreamingText("");
          setIsLoading(false);
        },
      },
      currentVideoUrl || undefined
    );
  };

  const handleAttachVideo = () => {
    if (videoUrl && messages.length === 0) {
      setAttachedVideoUrl(videoUrl);
    }
  };

  const handleRemoveVideo = () => {
    setAttachedVideoUrl(null);
  };

  const handleClearChat = async () => {
    setMessages([]);
    setAttachedVideoUrl(null);
    await clearChatHistory();
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {item.hasVideo && (
          <View style={styles.videoIndicator}>
            <MaterialCommunityIcons
              name="youtube"
              size={14}
              color={COLORS.error}
            />
            <Text style={styles.videoIndicatorText}>Video đính kèm</Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.aiBubble,
          ]}
        >
          {isUser ? (
            <Text style={styles.userText}>{item.content}</Text>
          ) : (
            <Markdown style={markdownStyles}>{item.content}</Markdown>
          )}
        </View>
      </View>
    );
  };

  const renderStreamingMessage = () => {
    if (!streamingText) return null;
    return (
      <View style={styles.messageRow}>
        <View style={[styles.messageBubble, styles.aiBubble]}>
          <Markdown style={markdownStyles}>{streamingText}</Markdown>
        </View>
      </View>
    );
  };

  const canAttachVideo = videoUrl && messages.length === 0 && !attachedVideoUrl;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <LinearGradient
        colors={["#1E1E3A", "#141428"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={20}
              color={COLORS.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.configButton}
            onPress={() => setShowConfigSelector(true)}
          >
            <MaterialCommunityIcons
              name="robot"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.configName} numberOfLines={1}>
              {activeConfig?.name || "Chọn cấu hình"}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={16}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerBtn} onPress={handleClearChat}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={20}
              color={COLORS.text}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Attached Video Banner */}
      {attachedVideoUrl && messages.length === 0 && (
        <View style={styles.attachedBanner}>
          <MaterialCommunityIcons
            name="youtube"
            size={18}
            color={COLORS.error}
          />
          <Text style={styles.attachedText} numberOfLines={1}>
            Video sẽ được đính kèm
          </Text>
          <TouchableOpacity onPress={handleRemoveVideo}>
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        ListFooterComponent={renderStreamingMessage}
        onContentSizeChange={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="robot-happy"
              size={48}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyText}>Bắt đầu cuộc trò chuyện</Text>
            {videoUrl && !attachedVideoUrl && (
              <Text style={styles.emptyHint}>
                Nhấn nút YouTube để đính kèm video hiện tại
              </Text>
            )}
          </View>
        }
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.inputContainer}>
          {canAttachVideo && (
            <TouchableOpacity
              style={styles.videoButton}
              onPress={handleAttachVideo}
            >
              <MaterialCommunityIcons
                name="youtube"
                size={22}
                color={COLORS.error}
              />
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={4000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <MaterialCommunityIcons
                name="send"
                size={20}
                color={COLORS.text}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Config Selector Modal */}
      <ConfigSelector
        visible={showConfigSelector}
        configs={configs}
        activeConfig={activeConfig}
        onSelect={handleSelectConfig}
        onClose={() => setShowConfigSelector(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(155,126,217,0.3)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    height: 44,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  configButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
  },
  configName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
    maxWidth: 150,
  },
  attachedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  attachedText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageRow: {
    marginBottom: 12,
    alignItems: "flex-start",
  },
  messageRowUser: {
    alignItems: "flex-end",
  },
  videoIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  videoIndicatorText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  messageBubble: {
    maxWidth: "85%",
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "transparent",
    padding: 0,
    paddingRight: 8,
  },
  userText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
  emptyHint: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  videoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.surfaceElevated,
  },
});

const markdownStyles = {
  body: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },
  heading1: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "bold" as const,
    marginVertical: 8,
  },
  heading2: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "bold" as const,
    marginVertical: 6,
  },
  heading3: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "600" as const,
    marginVertical: 4,
  },
  paragraph: {
    color: COLORS.text,
    marginVertical: 4,
  },
  link: {
    color: COLORS.accent,
  },
  blockquote: {
    backgroundColor: COLORS.surfaceLight,
    borderLeftColor: COLORS.primary,
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 4,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: COLORS.surfaceLight,
    color: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
  },
  code_block: {
    backgroundColor: COLORS.surfaceLight,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: COLORS.surfaceLight,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    color: COLORS.text,
  },
  list_item: {
    color: COLORS.text,
    marginVertical: 2,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  strong: {
    color: COLORS.text,
    fontWeight: "bold" as const,
  },
  em: {
    color: COLORS.text,
    fontStyle: "italic" as const,
  },
  hr: {
    backgroundColor: COLORS.border,
    height: 1,
    marginVertical: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginVertical: 8,
  },
  th: {
    backgroundColor: COLORS.surfaceLight,
    padding: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  td: {
    padding: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
};

export default ChatScreen;
