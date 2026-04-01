import {
  ChatProvider,
  ChatProviderParams,
  ChatProviderResponse,
  ChatStreamChunk,
  ChatProviderType,
} from "./chat-types";
import { geminiChatProvider } from "./gemini-chat";
import { minimaxChatProvider } from "./minimax-chat";
import i18n from "../../../i18n";

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
        ? "MiniMax-M2.7"
        : "gemini-3.1-pro-preview"),
    apiKey:
      import.meta.env.VITE_CHAT_PROVIDER === "minimax"
        ? import.meta.env.VITE_MINIMAX_API_KEY || import.meta.env.VITE_GEMINI_API_KEY
        : import.meta.env.VITE_GEMINI_API_KEY,
    baseUrl: import.meta.env.VITE_MINIMAX_BASE_URL,
    messages,
    systemInstruction:
      i18n.t("chatRouter.systemInstruction"),
  };
}

export type { ChatProvider, ChatProviderParams, ChatProviderResponse, ChatStreamChunk };
