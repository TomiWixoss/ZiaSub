/**
 * Chat Storage - Chat sessions persistence using AsyncStorage
 */
import { storageService } from "@services/storageService";
import type { ChatSession, ChatHistory } from "@src/types";

export const getChatSessions = async (): Promise<ChatSession[]> => {
  return storageService.getChatSessions();
};

export const saveChatSessions = async (
  sessions: ChatSession[]
): Promise<void> => {
  await storageService.setChatSessions(sessions);
};

export const createChatSession = async (
  name?: string,
  configId?: string
): Promise<ChatSession> => {
  const sessions = storageService.getChatSessions();
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

  const updatedSessions = [newSession, ...sessions];
  await storageService.setChatSessions(updatedSessions);
  await setActiveChatSessionId(newSession.id);
  return newSession;
};

export const updateChatSession = async (
  session: ChatSession
): Promise<void> => {
  const sessions = storageService.getChatSessions();
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index !== -1) {
    sessions[index] = { ...session, updatedAt: Date.now() };
    await storageService.setChatSessions([...sessions]);
  }
};

export const deleteChatSession = async (sessionId: string): Promise<void> => {
  const sessions = storageService.getChatSessions();
  const filtered = sessions.filter((s) => s.id !== sessionId);
  await storageService.setChatSessions(filtered);

  const activeId = await getActiveChatSessionId();
  if (activeId === sessionId && filtered.length > 0) {
    await setActiveChatSessionId(filtered[0].id);
  }
};

export const getActiveChatSessionId = async (): Promise<string | null> => {
  return await storageService.getActiveChatSessionId();
};

export const setActiveChatSessionId = async (id: string): Promise<void> => {
  await storageService.setActiveChatSessionId(id);
};

export const getActiveChatSession = async (): Promise<ChatSession | null> => {
  const sessions = storageService.getChatSessions();
  const activeId = await storageService.getActiveChatSessionId();

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
