/**
 * Chat Storage - Chat sessions persistence using cache + file system
 * Uses write-through cache: immediate cache update, background file persistence
 */
import { cacheService } from "@services/cacheService";
import { fileStorage } from "@services/fileStorageService";
import type { ChatSession, ChatHistory } from "@src/types";

// Active session ID stored separately (not in main cache for simplicity)
let activeChatSessionId: string | null = null;
let activeSessionLoaded = false;

const loadActiveSessionId = async (): Promise<string | null> => {
  if (activeSessionLoaded) return activeChatSessionId;

  try {
    const data = await fileStorage.loadData<{ id: string | null }>(
      "active_chat_session.json",
      { id: null }
    );
    activeChatSessionId = data.id;
    activeSessionLoaded = true;
    return activeChatSessionId;
  } catch {
    activeSessionLoaded = true;
    return null;
  }
};

export const getChatSessions = async (): Promise<ChatSession[]> => {
  await cacheService.waitForInit();
  return cacheService.getChatSessions();
};

export const saveChatSessions = async (
  sessions: ChatSession[]
): Promise<void> => {
  cacheService.setChatSessions(sessions);
};

export const createChatSession = async (
  name?: string,
  configId?: string
): Promise<ChatSession> => {
  const sessions = cacheService.getChatSessions();
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
  cacheService.setChatSessions(updatedSessions);
  await setActiveChatSessionId(newSession.id);
  return newSession;
};

export const updateChatSession = async (
  session: ChatSession
): Promise<void> => {
  const sessions = cacheService.getChatSessions();
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index !== -1) {
    sessions[index] = { ...session, updatedAt: Date.now() };
    cacheService.setChatSessions([...sessions]);
  }
};

export const deleteChatSession = async (sessionId: string): Promise<void> => {
  const sessions = cacheService.getChatSessions();
  const filtered = sessions.filter((s) => s.id !== sessionId);
  cacheService.setChatSessions(filtered);

  const activeId = await getActiveChatSessionId();
  if (activeId === sessionId && filtered.length > 0) {
    await setActiveChatSessionId(filtered[0].id);
  }
};

export const getActiveChatSessionId = async (): Promise<string | null> => {
  return await loadActiveSessionId();
};

export const setActiveChatSessionId = async (id: string): Promise<void> => {
  activeChatSessionId = id;
  activeSessionLoaded = true;

  // Save in background
  try {
    await fileStorage.saveData("active_chat_session.json", { id });
  } catch (error) {
    console.error("Error setting active chat session:", error);
  }
};

export const getActiveChatSession = async (): Promise<ChatSession | null> => {
  await cacheService.waitForInit();
  const sessions = cacheService.getChatSessions();
  const activeId = await loadActiveSessionId();

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
