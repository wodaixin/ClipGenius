import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
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
} from "../lib/db";
import { startLiveSession } from "../services/ai/startLiveSession";
import { LiveSessionConnection } from "../types";
import {
  getChatProvider,
  buildChatParams,
} from "../services/ai/providers/chat-router";

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
  sendMessage: () => void;
  startLiveSessionHandler: () => void;
  stopLiveSession: () => void;
  clearChatError: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
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
  const liveSessionRef = useRef<LiveSessionConnection | null>(null);

  // Sync chat messages from cloud when chat is open
  useEffect(() => {
    if (!user || !isChatOpen) return;

    const q = query(
      collection(db, `users/${user.uid}/chats/default/messages`),
      orderBy("timestamp", "asc")
    );

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

      // Merge: keep local-only fields (e.g. attachments) that Firestore may not return
      setChatMessages((prev) => {
        const merged: ChatMessage[] = firestoreMessages.map((fm) => {
          const local = prev.find((m) => m.id === fm.id);
          if (local) {
            return { ...fm, attachments: local.attachments ?? fm.attachments };
          }
          return fm;
        });
        return merged;
      });
    });

    return () => unsubscribe();
  }, [user, isChatOpen]);

  // Load local chat messages on mount (for guest users)
  useEffect(() => {
    if (user) return;
    getChatMessages().then(setChatMessages);
  }, [user]);

  const openChatWithItem = useCallback(
    (item: import("../types").PasteItem | null) => {
      if (!user && item) return;
      setIsChatOpen(true);
      setContextItem(item);
      setChatMessages([]);
      setChatInput("");
    },
    [user, setContextItem]
  );

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setContextItem(null);
  }, [setContextItem]);

  const clearChat = useCallback(async () => {
    setChatMessages([]);

    if (user) {
      try {
        const q = query(collection(db, `users/${user.uid}/chats/default/messages`));
        const snapshot = await getDocs(q);
        await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
      } catch (error) {
        console.error("Failed to clear chat:", error);
      }
    }
  }, [user]);

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

  const sendMessage = useCallback(async () => {
    const hasText = chatInput.trim().length > 0;
    if (!hasText && !contextItem) return;

    const userMsgId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: chatInput.trim(),
      timestamp: new Date(),
      attachments: contextItem
        ? [{ id: contextItem.id, type: contextItem.type, content: contextItem.content, mimeType: contextItem.mimeType, suggestedName: contextItem.suggestedName }]
        : undefined,
    };

    setChatInput("");
    setIsChatLoading(true);

    const sentItem = contextItem;
    setContextItem(null);

    // Save user message
    if (user) {
      await setDoc(doc(db, `users/${user.uid}/chats/default/messages`, userMsgId), {
        ...userMsg,
        timestamp: serverTimestamp(),
      });
    } else {
      await saveChatMessage(userMsg);
      setChatMessages((prev) => [...prev, userMsg]);
    }

    // Build chat history
    const allMessages = [...chatMessages, userMsg];
    const history: { role: "user" | "model"; content: string }[] = allMessages.map((m) => ({
      role: m.role as "user" | "model",
      content: m.text,
    }));

    let finalPrompt = chatInput.trim();
    if (sentItem) {
      if (sentItem.type === "image" || sentItem.type === "video") {
        finalPrompt = `[Context: ${sentItem.type} attached] ${chatInput}`;
      } else {
        finalPrompt = `Context: "${sentItem.content}"\n\nUser Question: ${chatInput}`;
      }
    }

    // Create placeholder model message for streaming updates
    const modelMsgId = crypto.randomUUID();
    const modelMsg: ChatMessage = {
      id: modelMsgId,
      role: "model",
      text: "",
      thinking: "",
      timestamp: new Date(),
    };

    if (user) {
      await setDoc(doc(db, `users/${user.uid}/chats/default/messages`, modelMsgId), {
        ...modelMsg,
        timestamp: serverTimestamp(),
      });
    } else {
      setChatMessages((prev) => [...prev, modelMsg]);
    }

    const provider = getChatProvider();
    const params = buildChatParams(history);
    // Append the new prompt with context
    params.messages.push({ role: "user", content: finalPrompt });

    try {
      const chunks = provider.streamChat(params);
      let fullText = "";

      for await (const chunk of chunks) {
        if (chunk.type === "thinking") {
          modelMsg.thinking = (modelMsg.thinking || "") + chunk.text;
          setChatMessages((prev) =>
            prev.map((m) => (m.id === modelMsgId ? { ...m, thinking: modelMsg.thinking } : m))
          );
        } else if (chunk.type === "text") {
          fullText += chunk.text;
          modelMsg.text = fullText;
          setChatMessages((prev) =>
            prev.map((m) => (m.id === modelMsgId ? { ...m, text: fullText } : m))
          );
        } else if (chunk.type === "done") {
          break;
        }
      }

      // Final save
      const finalMsg = { ...modelMsg, text: fullText || "I couldn't generate a response." };
      if (user) {
        await setDoc(doc(db, `users/${user.uid}/chats/default/messages`, modelMsgId), {
          ...finalMsg,
          timestamp: serverTimestamp(),
        });
      } else {
        await saveChatMessage(finalMsg);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const message = error instanceof Error ? error.message : "Request failed. Please try again.";
      setChatError(
        message.includes("429") || message.includes("quota") || message.includes("rate")
          ? "API rate limit exceeded. Please try again later."
          : message.includes("fetch")
          ? "Network error. Please check your connection."
          : message
      );
      // Remove placeholder message on error
      if (user) {
        await deleteDoc(doc(db, `users/${user.uid}/chats/default/messages`, modelMsgId));
      } else {
        setChatMessages((prev) => prev.filter((m) => m.id !== modelMsgId));
      }
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, chatMessages, contextItem, user, setContextItem]);

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
