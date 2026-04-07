import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChatMessage } from "../types";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import {
  db,
  collection,
  doc,
  setDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "../firebase";
import {
  saveChatMessage,
  getChatMessages,
  clearChatMessages,
} from "../lib/db";
import { startLiveSession } from "../services/ai/startLiveSession";
import { LiveSessionConnection } from "../types";
import {
  getChatProvider,
  buildChatParams,
} from "../services/ai/providers/chat-router";
import { canProviderHandle } from "../services/ai/providers/capabilities";

interface ChatContextValue {
  chatMessages: ChatMessage[];
  chatInput: string;
  isChatLoading: boolean;
  isChatOpen: boolean;
  isLiveActive: boolean;
  isMicMuted: boolean;
  liveTranscription: string;
  chatError: string | null;
  setChatInput: (input: string) => void;
  setIsMicMuted: (muted: boolean) => void;
  openChatWithItem: (item: import("../types").PasteItem | null) => void;
  closeChat: () => void;
  clearChat: () => void;
  sendMessage: (rawInput?: string) => void;
  startLiveSessionHandler: () => void;
  stopLiveSession: () => void;
  clearChatError: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { contextItem, setContextItem } = useAppContext();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string>("default");
  const isSendingRef = useRef(false);
  const liveSessionRef = useRef<LiveSessionConnection | null>(null);

  // Reset sending guard on mount (handles case where a previous page's
  // in-flight request was aborted by navigation, leaving ref stuck at true)
  useEffect(() => {
    isSendingRef.current = false;
  }, []);

  // Sync chat messages from cloud when chat is open
  useEffect(() => {
    if (!user || !isChatOpen) return;

    const q = query(
      collection(db, `users/${user.uid}/chats/${currentChatId}/messages`),
      orderBy("timestamp", "asc")
    );

    // Initial load — onSnapshot doesn't fire on first subscription if data is empty
    getDocs(q).then((snapshot) => {
      const firestoreMessages: ChatMessage[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          timestamp: data.timestamp
            ? new Date(data.timestamp.seconds * 1000)
            : new Date(),
        } as ChatMessage;
      });
      setChatMessages(firestoreMessages);
    });

    // Real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreMessages: ChatMessage[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          timestamp: data.timestamp
            ? new Date(data.timestamp.seconds * 1000)
            : new Date(),
        } as ChatMessage;
      });

      // Merge: Firestore is source of truth, append local-only messages (optimistic updates not yet in cloud)
      setChatMessages((prev) => {
        const firestoreIds = new Set(firestoreMessages.map((fm) => fm.id));
        const localOnly = prev.filter((m) => !firestoreIds.has(m.id));
        const merged: ChatMessage[] = firestoreMessages.map((fm) => {
          const local = prev.find((m) => m.id === fm.id);
          if (local) {
            return { ...fm, attachments: local.attachments ?? fm.attachments };
          }
          return fm;
        });
        return [...merged, ...localOnly];
      });
    });

    return () => unsubscribe();
  }, [user, isChatOpen, currentChatId]);

  // Load local chat messages on mount (for guest users)
  useEffect(() => {
    if (user) return;
    getChatMessages(currentChatId).then(setChatMessages);
  }, [user, currentChatId]);

  const openChatWithItem = useCallback(
    (item: import("../types").PasteItem | null) => {
      const newChatId = item ? item.id : "default";
      const isNewChat = newChatId !== currentChatId || !isChatOpen;
      setIsChatOpen(true);
      // Only attach the card context when opening a fresh chat session
      if (isNewChat) {
        setContextItem(item);
        setChatInput("");
        setCurrentChatId(newChatId);
        // Don't clear messages here - let the effect load them from Firestore/IndexedDB
      }
    },
    [user, setContextItem, currentChatId, isChatOpen]
  );

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setContextItem(null);
    setCurrentChatId("default");
  }, [setContextItem]);

  const clearChat = useCallback(async () => {
    setChatMessages([]);

    if (user) {
      try {
        const q = query(collection(db, `users/${user.uid}/chats/${currentChatId}/messages`));
        const snapshot = await getDocs(q);
        await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
      } catch (error) {
        console.error("Failed to clear chat:", error);
      }
    } else {
      // For guest users, clear from IndexedDB
      try {
        await clearChatMessages(currentChatId);
      } catch (error) {
        console.error("Failed to clear local chat:", error);
      }
    }
  }, [user, currentChatId]);

  const _handleStartLiveSession = useCallback(async () => {
    try {
      const session = await startLiveSession({
        onOpen: () => setIsLiveActive(true),
        onClose: () => setIsLiveActive(false),
        onTranscription: (text) => setLiveTranscription(text),
      });
      liveSessionRef.current = session;
    } catch (error) {
      console.error("Live session failed:", error);
    }
  }, []);

  const stopLiveSession = useCallback(() => {
    liveSessionRef.current?.close();
    setIsLiveActive(false);
    liveSessionRef.current = null;
  }, []);

  const sendMessage = useCallback(async (rawInput?: string) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;

    const chatInputValue = (rawInput ?? chatInput).trim();
    if (!chatInputValue && !contextItem) {
      isSendingRef.current = false;
      return;
    }

    // Check if chat provider can handle the attachment type
    if (contextItem) {
      const chatProvider = import.meta.env.VITE_CHAT_PROVIDER || "gemini";
      if (!canProviderHandle(chatProvider, contextItem.type)) {
        const providerName = chatProvider.charAt(0).toUpperCase() + chatProvider.slice(1);
        const contentTypeName = t(`pasteZone.type${contextItem.type.charAt(0).toUpperCase() + contextItem.type.slice(1)}`);
        setChatError(
          t("chat.providerNotSupported", { 
            provider: providerName, 
            type: contentTypeName 
          })
        );
        isSendingRef.current = false;
        return;
      }
    }

    const userMsgId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: userMsgId,
      chatId: currentChatId,
      role: "user",
      text: chatInputValue,
      timestamp: new Date(),
      attachments: contextItem
        ? [{ id: contextItem.id, type: contextItem.type, content: contextItem.content, mimeType: contextItem.mimeType, suggestedName: contextItem.suggestedName }]
        : null,
    };
    setChatInput("");
    setIsChatLoading(true);

    const sentItem = contextItem;
    setContextItem(null);

    setChatMessages((prev) => [...prev, userMsg]);

    if (user) {
      void setDoc(doc(db, `users/${user.uid}/chats/${currentChatId}/messages`, userMsgId), {
        ...userMsg,
        timestamp: serverTimestamp(),
      }).catch(console.error);
    } else {
      await saveChatMessage(userMsg);
    }

    const allMessages = [...chatMessages, userMsg].slice(-30);
    const history: { role: "user" | "model"; content: string }[] = allMessages.map((m) => ({
      role: m.role as "user" | "model",
      content: m.text,
    }));

    let finalPrompt = chatInputValue;
    if (sentItem) {
      if (sentItem.type === "image" || sentItem.type === "video") {
        finalPrompt = t("chat.contextMedia", { type: sentItem.type, question: chatInputValue });
      } else {
        finalPrompt = t("chat.contextText", { content: sentItem.content, question: chatInputValue });
      }
    }

    const modelMsgId = crypto.randomUUID();
    const modelMsg: ChatMessage = {
      id: modelMsgId,
      chatId: currentChatId,
      role: "model",
      text: "",
      thinking: "",
      timestamp: new Date(),
      isResponding: true,
    };
    setChatMessages((prev) => [...prev, modelMsg]);

    if (user) {
      void setDoc(doc(db, `users/${user.uid}/chats/${currentChatId}/messages`, modelMsgId), {
        ...modelMsg,
        timestamp: serverTimestamp(),
      }).catch(console.error);
    }

    const provider = getChatProvider();
    const params = buildChatParams(history);
    params.messages.push({ role: "user", content: finalPrompt });

    try {
      const chunks = provider.streamChat(params);
      let fullText = "";
      let hasStarted = false;

      for await (const chunk of chunks) {
        if (chunk.type === "thinking") {
          modelMsg.thinking = (modelMsg.thinking || "") + chunk.text;
          setChatMessages((prev) =>
            prev.map((m) => (m.id === modelMsgId ? { ...m, thinking: modelMsg.thinking } : m))
          );
          if (!hasStarted) {
            hasStarted = true;
            setIsChatLoading(false);
          }
        } else if (chunk.type === "text") {
          fullText += chunk.text;
          modelMsg.text = fullText;
          if (!hasStarted) {
            hasStarted = true;
            setIsChatLoading(false);
          }
          setChatMessages((prev) =>
            prev.map((m) => (m.id === modelMsgId ? { ...m, text: fullText, isResponding: false } : m))
          );
        } else if (chunk.type === "done") {
          break;
        }
      }

      const finalMsg = { ...modelMsg, text: fullText || t("chat.noResponse"), isResponding: false };
      if (user) {
        void setDoc(doc(db, `users/${user.uid}/chats/${currentChatId}/messages`, modelMsgId), {
          ...finalMsg,
          timestamp: serverTimestamp(),
        }).catch(console.error);
      } else {
        await saveChatMessage(finalMsg);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("errors.tryAgain");
      setChatError(
        message.includes("429") || message.includes("quota") || message.includes("rate") || message.includes("529") || message.includes("overloaded")
          ? t("errors.rateLimit")
          : message.includes("fetch")
          ? t("errors.network")
          : message
      );
      void deleteDoc(doc(db, `users/${user.uid}/chats/${currentChatId}/messages`, modelMsgId)).catch(
        console.error
      );
      setChatMessages((prev) => prev.filter((m) => m.id !== modelMsgId));
    } finally {
      setIsChatLoading(false);
      isSendingRef.current = false;
    }
  }, [chatInput, chatMessages, contextItem, user, setContextItem, currentChatId, t]);

  const clearChatError = useCallback(() => setChatError(null), []);

  return (
    <ChatContext.Provider
      value={{
        chatMessages,
        chatInput,
        isChatLoading,
        isChatOpen,
        isLiveActive,
        isMicMuted,
        liveTranscription,
        chatError,
        setChatInput,
        setIsMicMuted,
        openChatWithItem,
        closeChat,
        clearChat,
        sendMessage,
        startLiveSessionHandler: _handleStartLiveSession,
        stopLiveSession,
        clearChatError,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
