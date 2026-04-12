import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChatMessage } from "../types";
import { useAppContext } from "../context/AppContext";
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
  isStreaming: boolean;
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
  cancelSend: () => void;
  startLiveSessionHandler: () => void;
  stopLiveSession: () => void;
  clearChatError: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { contextItem, setContextItem } = useAppContext();

  // Per-chat message storage: Map<chatId, ChatMessage[]>
  const [messagesMap, setMessagesMap] = useState<Map<string, ChatMessage[]>>(new Map());
  const [displayChatId, setDisplayChatId] = useState<string>("default");
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  // currentChatId: the chat that new messages are sent to (never changed by closeChat)
  const [currentChatId, setCurrentChatId] = useState<string>("default");
  const isSendingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const liveSessionRef = useRef<LiveSessionConnection | null>(null);

  // chatMessages shown in UI = messages for displayChatId
  const chatMessages = messagesMap.get(displayChatId) ?? [];

  // Reset sending guard on mount (handles case where a previous page's
  // in-flight request was aborted by navigation, leaving ref stuck at true)
  useEffect(() => {
    isSendingRef.current = false;
  }, []);

  // Load local chat messages on mount
  useEffect(() => {
    getChatMessages(displayChatId).then((msgs) => {
      setMessagesMap((prev) => {
        const next = new Map(prev);
        next.set(displayChatId, msgs);
        return next;
      });
    });
  }, [displayChatId]);

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
        setCurrentChatId(newChatId);
        // Load messages for the new chat
        getChatMessages(newChatId).then((msgs) => {
          setMessagesMap((prev) => {
            const next = new Map(prev);
            next.set(newChatId, msgs);
            return next;
          });
        });
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

    // Clear from IndexedDB
    try {
      await clearChatMessages(currentChatId);
    } catch (error) {
      console.error("Failed to clear local chat:", error);
    }
  }, [currentChatId]);

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

    // Save to IndexedDB
    await saveChatMessage(userMsg);

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

    const provider = getChatProvider();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const params = buildChatParams(history, abortController.signal);
    params.messages.push({ role: "user", content: finalPrompt });

    try {
      setIsStreaming(true);
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
            setIsStreaming(true);
          }
        } else if (chunk.type === "text") {
          fullText += chunk.text;
          modelMsg.text = fullText;
          if (!hasStarted) {
            hasStarted = true;
            setIsStreaming(true);
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
        } else if (chunk.type === "aborted") {
          setMessagesMap((prev) => {
            const chatMsgs = prev.get(targetChatId) ?? [];
            const next = new Map(prev);
            next.set(targetChatId, chatMsgs.filter((m) => m.id !== modelMsgId));
            return next;
          });
          setIsChatLoading(false);
          setIsStreaming(false);
          isSendingRef.current = false;
          abortControllerRef.current = null;
          return;
        }
      }

      const finalMsg = { ...modelMsg, text: fullText || t("chat.noResponse"), isResponding: false };
      await saveChatMessage(finalMsg);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessagesMap((prev) => {
          const chatMsgs = prev.get(targetChatId) ?? [];
          const next = new Map(prev);
          next.set(targetChatId, chatMsgs.filter((m) => m.id !== modelMsgId));
          return next;
        });
        setIsStreaming(false);
      } else {
        const message = error instanceof Error ? error.message : t("errors.tryAgain");
        setChatError(
          message.includes("429") || message.includes("quota") || message.includes("rate") || message.includes("529") || message.includes("overloaded")
            ? t("errors.rateLimit")
            : message.includes("fetch")
            ? t("errors.network")
            : message
        );
        setMessagesMap((prev) => {
          const chatMsgs = prev.get(targetChatId) ?? [];
          const next = new Map(prev);
          next.set(targetChatId, chatMsgs.filter((m) => m.id !== modelMsgId));
          return next;
        });
        setIsStreaming(false);
      }
    } finally {
      setIsChatLoading(false);
      setIsStreaming(false);
      isSendingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [chatInput, messagesMap, contextItem, setContextItem, currentChatId, t]);

  const clearChatError = useCallback(() => setChatError(null), []);

  const cancelSend = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chatMessages,
        chatInput,
        isChatLoading,
        isStreaming,
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
        cancelSend,
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
