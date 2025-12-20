/**
 * Chat Storage - Chat sessions persistence
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChatSession, ChatHistory, StoredChatMessage } from "@src/types";

const CHAT_SESSIONS_KEY = "chat_sessions";
const ACTIVE_CHAT_SESSION_KEY = "active_chat_session";

export const getChatSessions = async (): Promise<ChatSession[]> => {
  try {
    const data = await AsyncStorage.getItem(CHAT_SESSIONS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error("Error getting chat sessions:", error);
    return [];
  }
};

export const saveChatSessions = async (
  sessions: ChatSession[]
): Promise<void> => {
  try {
    await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving chat sessions:", error);
  }
};

export const createChatSession = async (
  name?: string,
  configId?: string
): Promise<ChatSession> => {
  const sessions = await getChatSessions();
  // Use provided name or default to "Chat mới" (will be updated with first message)
  const sessionName = name || "Chat mới";
  const newSession: ChatSession = {
    id: Date.now().toString(),
    name:
      sessionName.length > 50 ? sessionName.slice(0, 50) + "..." : sessionName,
    messages: [],
    configId: configId || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  sessions.unshift(newSession);
  await saveChatSessions(sessions);
  await setActiveChatSessionId(newSession.id);
  return newSession;
};

export const updateChatSession = async (
  session: ChatSession
): Promise<void> => {
  const sessions = await getChatSessions();
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index !== -1) {
    sessions[index] = { ...session, updatedAt: Date.now() };
    await saveChatSessions(sessions);
  }
};

export const deleteChatSession = async (sessionId: string): Promise<void> => {
  const sessions = await getChatSessions();
  const filtered = sessions.filter((s) => s.id !== sessionId);
  await saveChatSessions(filtered);

  const activeId = await getActiveChatSessionId();
  if (activeId === sessionId && filtered.length > 0) {
    await setActiveChatSessionId(filtered[0].id);
  }
};

export const getActiveChatSessionId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(ACTIVE_CHAT_SESSION_KEY);
  } catch (error) {
    return null;
  }
};

export const setActiveChatSessionId = async (id: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(ACTIVE_CHAT_SESSION_KEY, id);
  } catch (error) {
    console.error("Error setting active chat session:", error);
  }
};

export const getActiveChatSession = async (): Promise<ChatSession | null> => {
  const sessions = await getChatSessions();
  const activeId = await getActiveChatSessionId();

  if (activeId) {
    const session = sessions.find((s) => s.id === activeId);
    if (session) return session;
  }

  return sessions[0] || null;
};

// Legacy compatibility
export const saveChatHistory = async (history: ChatHistory): Promise<void> => {
  let session = await getActiveChatSession();
  if (!session) {
    session = await createChatSession();
  }
  session.messages = history.messages;
  session.configId = history.lastConfigId;
  await updateChatSession(session);
};

export const getChatHistory = async (): Promise<ChatHistory> => {
  const session = await getActiveChatSession();
  if (session) {
    return {
      messages: session.messages,
      lastConfigId: session.configId,
      videoUrl: null,
    };
  }
  return { messages: [], lastConfigId: null, videoUrl: null };
};

export const clearChatHistory = async (): Promise<void> => {
  const session = await getActiveChatSession();
  if (session) {
    session.messages = [];
    await updateChatSession(session);
  }
};
