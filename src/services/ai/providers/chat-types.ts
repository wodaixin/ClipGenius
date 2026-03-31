export interface ChatProvider {
  chat(params: ChatProviderParams): Promise<ChatProviderResponse>;
  streamChat(
    params: ChatProviderParams
  ): AsyncIterable<ChatStreamChunk>;
}

export interface ChatProviderParams {
  model: string;
  apiKey: string;
  baseUrl?: string;
  messages: { role: "user" | "model"; content: string }[];
  systemInstruction?: string;
  signal?: AbortSignal;
}

export interface ChatProviderResponse {
  text: string;
}

export interface ChatStreamChunk {
  type: "text" | "thinking" | "done";
  text?: string;
}

export type ChatProviderType = "gemini" | "minimax";
