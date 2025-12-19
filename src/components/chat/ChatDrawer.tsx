import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";
import { ChatSession, updateChatSession } from "@utils/storage";
import { confirmDestructive } from "@components/CustomAlert";

interface ChatDrawerProps {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  drawerAnim: Animated.Value;
  paddingTop: number;
  onNewChat: () => void;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onUpdateSessions: (sessions: ChatSession[]) => void;
  onUpdateCurrentSession: (session: ChatSession) => void;
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({
  sessions,
  currentSession,
  drawerAnim,
  paddingTop,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onUpdateSessions,
  onUpdateCurrentSession,
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleStartEdit = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditingName(session.name);
  };

  const handleSaveSessionName = async () => {
    if (!editingSessionId || !editingName.trim()) return;
    const session = sessions.find((s) => s.id === editingSessionId);
    if (session) {
      const updated = { ...session, name: editingName.trim() };
      await updateChatSession(updated);
      onUpdateSessions(
        sessions.map((s) => (s.id === editingSessionId ? updated : s))
      );
      if (currentSession?.id === editingSessionId) {
        onUpdateCurrentSession(updated);
      }
    }
    setEditingSessionId(null);
  };

  const handleDelete = (sessionId: string) => {
    confirmDestructive("Xóa cuộc trò chuyện", "Bạn có chắc muốn xóa?", () => {
      onDeleteSession(sessionId);
    });
  };

  // Filter sessions by search query
  const filteredSessions = searchQuery.trim()
    ? sessions.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sessions;

  return (
    <Animated.View
      style={[
        styles.drawer,
        {
          top: 0,
          paddingTop,
          transform: [{ translateX: drawerAnim }],
        },
      ]}
    >
      {/* Brand */}
      <View style={styles.drawerBrand}>
        <MaterialCommunityIcons
          name="creation"
          size={24}
          color={COLORS.primary}
        />
        <Text style={styles.drawerBrandText}>ZiaSub</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={COLORS.textMuted}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm cuộc trò chuyện"
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* New Chat Button */}
      <TouchableOpacity style={styles.newChatBtn} onPress={onNewChat}>
        <MaterialCommunityIcons
          name="pencil-box-outline"
          size={20}
          color={COLORS.text}
        />
        <Text style={styles.newChatText}>Cuộc trò chuyện mới</Text>
      </TouchableOpacity>

      {/* Section Title */}
      <Text style={styles.drawerSectionTitle}>Lịch sử</Text>

      {/* Session List */}
      <ScrollView
        style={styles.sessionList}
        showsVerticalScrollIndicator={false}
      >
        {filteredSessions.length === 0 ? (
          <Text style={styles.emptyText}>
            {searchQuery ? "Không tìm thấy kết quả" : "Chưa có cuộc trò chuyện"}
          </Text>
        ) : (
          filteredSessions.map((session) => (
            <View
              key={session.id}
              style={[
                styles.sessionItem,
                currentSession?.id === session.id && styles.sessionItemActive,
              ]}
            >
              {editingSessionId === session.id ? (
                <View style={styles.sessionEditRow}>
                  <TextInput
                    style={styles.sessionEditInput}
                    value={editingName}
                    onChangeText={setEditingName}
                    autoFocus
                    onBlur={handleSaveSessionName}
                    onSubmitEditing={handleSaveSessionName}
                  />
                  <TouchableOpacity onPress={handleSaveSessionName}>
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={COLORS.success}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.sessionContent}
                  onPress={() => onSelectSession(session)}
                >
                  <Text
                    style={[
                      styles.sessionName,
                      currentSession?.id === session.id &&
                        styles.sessionNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {session.name}
                  </Text>
                  <View style={styles.sessionActions}>
                    <TouchableOpacity
                      style={styles.sessionActionBtn}
                      onPress={() => handleStartEdit(session)}
                    >
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={16}
                        color={COLORS.textMuted}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sessionActionBtn}
                      onPress={() => handleDelete(session.id)}
                    >
                      <MaterialCommunityIcons
                        name="delete-outline"
                        size={16}
                        color={COLORS.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "82%",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
  },
  drawerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  drawerBrandText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "700",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    padding: 0,
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 14,
    marginBottom: 20,
  },
  newChatText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "500",
  },
  drawerSectionTitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sessionList: {
    flex: 1,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  sessionItem: {
    borderRadius: 12,
    marginBottom: 4,
    overflow: "hidden",
  },
  sessionItemActive: {
    backgroundColor: COLORS.surfaceLight,
  },
  sessionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  sessionName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  sessionNameActive: {
    fontWeight: "600",
  },
  sessionActions: {
    flexDirection: "row",
    gap: 4,
  },
  sessionActionBtn: {
    padding: 6,
  },
  sessionEditRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  sessionEditInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});

export default ChatDrawer;
