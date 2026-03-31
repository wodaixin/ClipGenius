import {
  ChatProvider,
  ChatProviderParams,
  ChatProviderResponse,
  ChatStreamChunk,
  ChatProviderType,
} from "./chat-types";
import { geminiChatProvider } from "./gemini-chat";
import { minimaxChatProvider } from "./minimax-chat";

const chatProviders: Record<ChatProviderType, ChatProvider> = {
  gemini: geminiChatProvider,
  minimax: minimaxChatProvider,
};

export function getChatProvider(): ChatProvider {
  const provider = (import.meta.env.VITE_CHAT_PROVIDER as ChatProviderType) || "gemini";
  const impl = chatProviders[provider];
  if (!impl) {
    console.warn(`Unknown chat provider "${provider}", falling back to gemini`);
    return geminiChatProvider;
  }
  return impl;
}

export function buildChatParams(
  messages: { role: "user" | "model"; content: string }[]
): ChatProviderParams {
  return {
    model:
      import.meta.env.VITE_CHAT_MODEL ||
      (import.meta.env.VITE_CHAT_PROVIDER === "minimax"
        ? "MiniMax-Text-01"
        : "gemini-3.1-pro-preview"),
    apiKey:
      import.meta.env.VITE_CHAT_PROVIDER === "minimax"
        ? import.meta.env.VITE_MINIMAX_API_KEY || import.meta.env.VITE_GEMINI_API_KEY
        : import.meta.env.VITE_GEMINI_API_KEY,
    baseUrl: import.meta.env.VITE_MINIMAX_BASE_URL,
    messages,
    systemInstruction:
      "You are ClipGenius AI, a professional-grade assistant for a clipboard manager. Always refer to the attached context (image, video, or text) to answer questions accurately.",
  };
}

export type { ChatProvider, ChatProviderParams, ChatProviderResponse, ChatStreamChunk };
