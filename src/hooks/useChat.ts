import { useState, useCallback, useEffect } from "react";
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

export function useChat() {
  const { user } = useAuth();
  const { contextItem, setContextItem } = useAppContext();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [liveSession, setLiveSession] = useState<LiveSessionConnection | null>(null);

  // Sync chat messages from cloud when chat is open
  useEffect(() => {
    if (!user || !isChatOpen) return;

    const chatId = contextItem?.id || "default";
    const q = query(
      collection(db, `users/${user.uid}/chats/${chatId}/messages`),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          timestamp: data.timestamp
            ? new Date(data.timestamp.seconds * 1000)
            : new Date(),
        } as ChatMessage;
      });
      setChatMessages(messages);
    });

    return () => unsubscribe();
  }, [user, isChatOpen, contextItem?.id]);

  // Load local chat messages on mount (for guest users)
  useEffect(() => {
    if (user) return;
    getChatMessages().then(setChatMessages);
  }, [user]);

  const openChatWithItem = useCallback(
    (item: typeof contextItem | null) => {
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
    const chatId = contextItem?.id || "default";
    setChatMessages([]);

    if (user) {
      try {
        const q = query(collection(db, `users/${user.uid}/chats/${chatId}/messages`));
        const snapshot = await getDocs(q);
        await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
      } catch (error) {
        console.error("Failed to clear chat:", error);
      }
    }
  }, [user, contextItem?.id]);

  const _handleStartLiveSession = useCallback(async () => {
    try {
      const session = await startLiveSession({
        onOpen: () => setIsLiveActive(true),
        onClose: () => setIsLiveActive(false),
        onTranscription: (text) => setLiveTranscription(text),
      });
      setLiveSession(session);
    } catch (error) {
      console.error("Live session failed:", error);
    }
  }, []);

  const stopLiveSession = useCallback(() => {
    liveSession?.close();
    setIsLiveActive(false);
    setLiveSession(null);
  }, [liveSession]);

  const sendMessage = useCallback(async () => {
    if (!chatInput.trim()) return;

    const { GoogleGenAI, ThinkingLevel } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

    const userMsgId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: chatInput,
      timestamp: new Date(),
    };

    setChatInput("");
    setIsChatLoading(true);

    const chatId = contextItem?.id || "default";

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

      if (contextItem) {
        if (contextItem.type === "image" || contextItem.type === "video") {
          parts.push({
            inlineData: {
              data: contextItem.content.split(",")[1],
              mimeType: contextItem.mimeType,
            },
          });
          finalPrompt = `[Context: ${contextItem.type} attached] ${chatInput}`;
        } else {
          finalPrompt = `Context: "${contextItem.content}"\n\nUser Question: ${chatInput}`;
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
  }, [chatInput, chatMessages, contextItem, user]);

  return {
    // State
    chatMessages,
    chatInput,
    isChatLoading,
    isChatOpen,
    isLiveActive,
    isMicMuted,
    liveTranscription,
    // Setters
    setChatInput,
    setIsMicMuted,
    // Actions
    openChatWithItem,
    closeChat,
    clearChat,
    sendMessage,
    startLiveSession: _handleStartLiveSession,
    stopLiveSession,
  };
}
