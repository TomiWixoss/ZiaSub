import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
  Platform,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { ChatSession } from "@src/types";
import { updateChatSession } from "@utils/storage";
import { confirmDestructive } from "../common/CustomAlert";

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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(chatDrawerThemedStyles);
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
      if (currentSession?.id === editingSessionId)
        onUpdateCurrentSession(updated);
    }
    setEditingSessionId(null);
  };

  const handleDelete = (sessionId: string) => {
    confirmDestructive(t("chat.deleteChat"), t("chat.deleteConfirm"), () => {
      onDeleteSession(sessionId);
    });
  };

  const filteredSessions = searchQuery.trim()
    ? sessions.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sessions;

  return (
    <Animated.View
      style={[
        styles.drawer,
        themedStyles.drawer,
        { top: 0, paddingTop, transform: [{ translateX: drawerAnim }] },
      ]}
      collapsable={false}
      renderToHardwareTextureAndroid={Platform.OS === "android"}
    >
      <View style={styles.drawerBrand}>
        <MaterialCommunityIcons
          name="creation"
          size={24}
          color={colors.primary}
        />
        <Text style={themedStyles.drawerBrandText}>ZiaSub</Text>
      </View>
      <View style={themedStyles.searchBox}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={colors.textMuted}
        />
        <TextInput
          style={themedStyles.searchInput}
          placeholder={t("chat.searchPlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        )}
      </View>
      <Pressable style={themedStyles.newChatBtn} onPress={onNewChat}>
        <MaterialCommunityIcons
          name="pencil-box-outline"
          size={20}
          color={colors.text}
        />
        <Text style={themedStyles.newChatText}>{t("chat.newChat")}</Text>
      </Pressable>
      <Text style={themedStyles.drawerSectionTitle}>{t("chat.history")}</Text>
      <ScrollView
        style={styles.sessionList}
        showsVerticalScrollIndicator={false}
      >
        {filteredSessions.length === 0 ? (
          <Text style={themedStyles.emptyText}>
            {searchQuery ? t("chat.noSearchResults") : t("chat.noHistory")}
          </Text>
        ) : (
          filteredSessions.map((session) => (
            <View
              key={session.id}
              style={[
                styles.sessionItem,
                currentSession?.id === session.id &&
                  themedStyles.sessionItemActive,
              ]}
            >
              {editingSessionId === session.id ? (
                <View style={styles.sessionEditRow}>
                  <TextInput
                    style={themedStyles.sessionEditInput}
                    value={editingName}
                    onChangeText={setEditingName}
                    autoFocus
                    onBlur={handleSaveSessionName}
                    onSubmitEditing={handleSaveSessionName}
                  />
                  <Pressable onPress={handleSaveSessionName}>
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={colors.success}
                    />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.sessionContent}
                  onPress={() => onSelectSession(session)}
                >
                  <Text
                    style={[
                      themedStyles.sessionName,
                      currentSession?.id === session.id &&
                        styles.sessionNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {session.name}
                  </Text>
                  <View style={styles.sessionActions}>
                    <Pressable
                      style={styles.sessionActionBtn}
                      onPress={() => handleStartEdit(session)}
                    >
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={16}
                        color={colors.textMuted}
                      />
                    </Pressable>
                    <Pressable
                      style={styles.sessionActionBtn}
                      onPress={() => handleDelete(session.id)}
                    >
                      <MaterialCommunityIcons
                        name="delete-outline"
                        size={16}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </Pressable>
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
    paddingHorizontal: 16,
  },
  drawerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sessionList: { flex: 1 },
  sessionItem: { borderRadius: 12, marginBottom: 4, overflow: "hidden" },
  sessionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  sessionNameActive: { fontWeight: "600" },
  sessionActions: { flexDirection: "row", gap: 4 },
  sessionActionBtn: { padding: 6 },
  sessionEditRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
});

const chatDrawerThemedStyles = createThemedStyles((colors) => ({
  drawer: { backgroundColor: colors.surface },
  drawerBrandText: { color: colors.text, fontSize: 22, fontWeight: "700" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    marginBottom: 20,
  },
  newChatText: { color: colors.text, fontSize: 15, fontWeight: "500" },
  drawerSectionTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  sessionItemActive: { backgroundColor: colors.surfaceLight },
  sessionName: { flex: 1, color: colors.text, fontSize: 14 },
  sessionEditInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
}));

export default ChatDrawer;
