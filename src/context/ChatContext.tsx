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

  // Per-chat message storage: Map&lt;chatId, ChatMessage[]&gt;
  const [messagesMap, setMessagesMap] = useState<Map<string, ChatMessage[]>>(new Map());
  const [displayChatId, setDisplayChatId] = useState<string>("default");
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  // currentChatId: the chat that new messages are sent to (never changed by closeChat)
  const [currentChatId, setCurrentChatId] = useState<string>("default");
  const isSendingRef = useRef(false);
  const liveSessionRef = useRef<LiveSessionConnection | null>(null);

  // chatMessages shown in UI = messages for displayChatId
  const chatMessages = messagesMap.get(displayChatId) ?? [];

  // Reset sending guard on mount (handles case where a previous page's
  // in-flight request was aborted by navigation, leaving ref stuck at true)
  useEffect(() => {
    isSendingRef.current = false;
  }, []);

  // Sync chat messages from cloud when chat is open
  useEffect(() => {
    if (!user || !isChatOpen) return;

    const q = query(
      collection(db, `users/${user.uid}/chats/${displayChatId}/messages`),
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
      setMessagesMap((prev) => {
        const next = new Map(prev);
        next.set(displayChatId, firestoreMessages);
        return next;
      });
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
      setMessagesMap((prev) => {
        const prevChatMsgs = prev.get(displayChatId) ?? [];
        const firestoreIds = new Set(firestoreMessages.map((fm) => fm.id));
        const localOnly = prevChatMsgs.filter((m) => !firestoreIds.has(m.id) && m.chatId === displayChatId);
        const merged: ChatMessage[] = firestoreMessages.map((fm) => {
          const local = prevChatMsgs.find((m) => m.id === fm.id);
          if (local) {
            return { ...fm, attachments: local.attachments ?? fm.attachments };
          }
          return fm;
        });
        const next = new Map(prev);
        next.set(displayChatId, [...merged, ...localOnly]);
        return next;
      });
    });

    return () => unsubscribe();
  }, [user, isChatOpen, displayChatId]);

  // Load local chat messages on mount (for guest users)
  useEffect(() => {
    if (user) return;
    getChatMessages(displayChatId).then((msgs) => {
      setMessagesMap((prev) => {
        const next = new Map(prev);
        next.set(displayChatId, msgs);
        return next;
      });
    });
  }, [user, displayChatId]);

  const openChatWithItem = useCallback(
    (item: import("../types").PasteItem | null) => {
      const newChatId = item ? item.id : "default";
      const isNewChat = newChatId !== displayChatId || !isChatOpen;
      setIsChatOpen(true);
      // Only attach the card context when opening a fresh chat session
      if (isNewChat) {
        setContextItem(item);
        setChatInput("");
        setDisplayChatId(newChatId);
        // Don't clear messages here - let the effect load them from Firestore/IndexedDB
      }
    },
    [displayChatId, isChatOpen, setContextItem]
  );

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setContextItem(null);
    // DO NOT change currentChatId — streaming must continue writing to the active chat
  }, [setContextItem]);

  const clearChat = useCallback(async () => {
    setMessagesMap((prev) => {
      const next = new Map(prev);
      next.set(currentChatId, []);
      return next;
    });

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
            type: contentTypeName,
          })
        );
        isSendingRef.current = false;
        return;
      }
    }

    // Capture targetChatId at function start — this is the chat messages go to
    const targetChatId = currentChatId;
    const userMsgId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: userMsgId,
      chatId: targetChatId,
      role: "user",
      text: chatInputValue,
      timestamp: new Date(),
      attachments: contextItem
        ? [
            {
              id: contextItem.id,
              type: contextItem.type,
              content: contextItem.content,
              mimeType: contextItem.mimeType,
              suggestedName: contextItem.suggestedName,
            },
          ]
        : null,
    };
    setChatInput("");
    setIsChatLoading(true);

    const sentItem = contextItem;
    setContextItem(null);

    // Add userMsg to the target chat's message array in the Map
    setMessagesMap((prev) => {
      const chatMsgs = prev.get(targetChatId) ?? [];
      const next = new Map(prev);
      next.set(targetChatId, [...chatMsgs, userMsg]);
      return next;
    });

    if (user) {
      void setDoc(doc(db, `users/${user.uid}/chats/${targetChatId}/messages`, userMsgId), {
        ...userMsg,
        timestamp: serverTimestamp(),
      }).catch(console.error);
    } else {
      await saveChatMessage(userMsg);
    }

    // Build history from the target chat's current messages (captured from Map at function start)
    const targetMessages = messagesMap.get(targetChatId) ?? [];
    const allMessages = [...targetMessages, userMsg].slice(-30);
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
      chatId: targetChatId,
      role: "model",
      text: "",
      thinking: "",
      timestamp: new Date(),
      isResponding: true,
    };

    // Add modelMsg placeholder to the target chat's message array
    setMessagesMap((prev) => {
      const chatMsgs = prev.get(targetChatId) ?? [];
      const next = new Map(prev);
      next.set(targetChatId, [...chatMsgs, modelMsg]);
      return next;
    });

    if (user) {
      void setDoc(doc(db, `users/${user.uid}/chats/${targetChatId}/messages`, modelMsgId), {
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
          setMessagesMap((prev) => {
            const chatMsgs = prev.get(targetChatId) ?? [];
            const next = new Map(prev);
            next.set(
              targetChatId,
              chatMsgs.map((m) => (m.id === modelMsgId ? { ...m, thinking: modelMsg.thinking } : m))
            );
            return next;
          });
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
          setMessagesMap((prev) => {
            const chatMsgs = prev.get(targetChatId) ?? [];
            const next = new Map(prev);
            next.set(
              targetChatId,
              chatMsgs.map((m) => (m.id === modelMsgId ? { ...m, text: fullText, isResponding: false } : m))
            );
            return next;
          });
        } else if (chunk.type === "done") {
          break;
        }
      }

      const finalMsg = { ...modelMsg, text: fullText || t("chat.noResponse"), isResponding: false };
      if (user) {
        void setDoc(
          doc(db, `users/${user.uid}/chats/${targetChatId}/messages`, modelMsgId),
          {
            ...finalMsg,
            timestamp: serverTimestamp(),
          }
        ).catch(console.error);
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
      void deleteDoc(doc(db, `users/${user.uid}/chats/${targetChatId}/messages`, modelMsgId)).catch(
        console.error
      );
      setMessagesMap((prev) => {
        const chatMsgs = prev.get(targetChatId) ?? [];
        const next = new Map(prev);
        next.set(targetChatId, chatMsgs.filter((m) => m.id !== modelMsgId));
        return next;
      });
    } finally {
      setIsChatLoading(false);
      isSendingRef.current = false;
    }
  }, [chatInput, messagesMap, contextItem, user, setContextItem, currentChatId, t]);

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
