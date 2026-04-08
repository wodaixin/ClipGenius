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
import { getPrompts } from "../../../config/prompts";
import { getStoredSettings } from "../../../lib/settings";

const chatProviders: Record<ChatProviderType, ChatProvider> = {
  gemini: geminiChatProvider,
  minimax: minimaxChatProvider,
};

export function getChatProvider(): ChatProvider {
  const stored = getStoredSettings();
  const provider = (stored.chatProvider || import.meta.env.VITE_CHAT_PROVIDER || "gemini") as ChatProviderType;
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
  const prompts = getPrompts(i18n.language);
  const stored = getStoredSettings();

  const provider = stored.chatProvider || import.meta.env.VITE_CHAT_PROVIDER || "gemini";
  const model =
    stored.chatModel ||
    import.meta.env.VITE_CHAT_MODEL ||
    (provider === "minimax" ? "MiniMax-M2.7" : "gemini-3.1-pro-preview");
  const apiKey =
    provider === "minimax"
      ? stored.minimaxApiKey || import.meta.env.VITE_MINIMAX_API_KEY || import.meta.env.VITE_GEMINI_API_KEY
      : stored.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  const baseUrl = stored.minimaxBaseUrl || import.meta.env.VITE_MINIMAX_BASE_URL;

  return {
    model,
    apiKey,
    baseUrl,
    messages,
    systemInstruction: prompts.chatRouter.systemInstruction,
  };
}

export type { ChatProvider, ChatProviderParams, ChatProviderResponse, ChatStreamChunk };
