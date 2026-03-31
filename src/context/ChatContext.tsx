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

interface ChatContextValue {
  chatMessages: ChatMessage[];
  chatInput: string;
  isChatLoading: boolean;
  isChatOpen: boolean;
  isLiveActive: boolean;
  isMicMuted: boolean;
  liveTranscription: string;
  setChatInput: (input: string) => void;
  setIsMicMuted: (muted: boolean) => void;
  openChatWithItem: (item: import("../types").PasteItem | null) => void;
  closeChat: () => void;
  clearChat: () => void;
  sendMessage: () => void;
  startLiveSessionHandler: () => void;
  stopLiveSession: () => void;
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
    if (!chatInput.trim() && !contextItem) return;

    const { GoogleGenAI, ThinkingLevel } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

    const userMsgId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: chatInput,
      timestamp: new Date(),
      // Only store serializable fields — PasteItem has Date which Firestore can't serialize reliably
      attachments: contextItem
        ? [{ id: contextItem.id, type: contextItem.type, content: contextItem.content, mimeType: contextItem.mimeType, suggestedName: contextItem.suggestedName }]
        : undefined,
    };

    setChatInput("");
    setIsChatLoading(true);

    // Move contextItem into message, then clear it so it disappears from sticky panel
    const sentItem = contextItem;
    setContextItem(null);

    const chatId = "default";

    if (user) {
      await setDoc(doc(db, `users/${user.uid}/chats/${chatId}/messages`, userMsgId), {
        ...userMsg,
        timestamp: serverTimestamp(),
      });
    } else {
      await saveChatMessage(userMsg);
      setChatMessages((prev) => [...prev, userMsg]);
    }

    try {
      const history = chatMessages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      const parts: any[] = [];
      let finalPrompt = chatInput;

      if (sentItem) {
        if (sentItem.type === "image" || sentItem.type === "video") {
          parts.push({
            inlineData: {
              data: sentItem.content.split(",")[1],
              mimeType: sentItem.mimeType,
            },
          });
          finalPrompt = `[Context: ${sentItem.type} attached] ${chatInput}`;
        } else {
          finalPrompt = `Context: "${sentItem.content}"\n\nUser Question: ${chatInput}`;
        }
      }

      parts.push({ text: finalPrompt });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          ...history.map((h) => ({ role: h.role, parts: h.parts })),
          { role: "user", parts },
        ],
        config: {
          systemInstruction:
            "You are ClipGenius AI, a professional-grade assistant for a clipboard manager. Always refer to the attached context (image, video, or text) to answer questions accurately.",
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        },
      });

      const modelMsgId = crypto.randomUUID();
      const modelMsg: ChatMessage = {
        id: modelMsgId,
        role: "model",
        text: response.text || "I couldn't generate a response.",
        timestamp: new Date(),
      };

      if (user) {
        await setDoc(doc(db, `users/${user.uid}/chats/default/messages`, modelMsgId), {
          ...modelMsg,
          timestamp: serverTimestamp(),
        });
      } else {
        await saveChatMessage(modelMsg);
        setChatMessages((prev) => [...prev, modelMsg]);
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, chatMessages, contextItem, user, setContextItem]);

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
        setChatInput,
        setIsMicMuted,
        openChatWithItem,
        closeChat,
        clearChat,
        sendMessage,
        startLiveSessionHandler: _handleStartLiveSession,
        stopLiveSession,
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
