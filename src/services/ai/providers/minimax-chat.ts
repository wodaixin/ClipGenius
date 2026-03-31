import { ChatProvider, ChatProviderParams, ChatProviderResponse, ChatStreamChunk } from "./chat-types";

function getMinimaxBaseUrl(): string {
  // In dev mode, route through Vite proxy (Node.js, bypasses system proxy)
  if (import.meta.env.DEV) return "/api/minimax";
  return (import.meta.env.VITE_MINIMAX_BASE_URL || "https://api.minimax.chat").replace(/\/$/, "");
}

export const minimaxChatProvider: ChatProvider = {
  async chat(params): Promise<ChatProviderResponse> {
    const apiKey = import.meta.env.VITE_MINIMAX_API_KEY;
    const baseUrl = getMinimaxBaseUrl();

    const messages = params.messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: params.model || "MiniMax-Text-01",
        messages,
        max_tokens: 4096,
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Minimax API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((block: any) => block.type === "text");
    const text: string = textBlock?.text || "";

    return { text: text || "I couldn't generate a response." };
  },

  async *streamChat(params): AsyncIterable<ChatStreamChunk> {
    const apiKey = import.meta.env.VITE_MINIMAX_API_KEY;
    const baseUrl = getMinimaxBaseUrl();

    const messages = params.messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: params.model || "MiniMax-Text-01",
        messages,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Minimax API error ${res.status}: ${err}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let currentEventType = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE: events start with "event:", data lines follow with "data:"
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEventType = line.slice(6).trim();
            continue;
          }
          if (!line.startsWith("data:")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            yield { type: "done" };
            return;
          }

          try {
            const event = JSON.parse(json);

            // content_block_start: init thinking block
            if (currentEventType === "content_block_start" || event.type === "content_block_start") {
              const block = event.content_block || event;
              if (block?.type === "thinking") {
                yield { type: "thinking", text: "" };
              }
              continue;
            }

            // content_block_delta: incremental updates
            if (currentEventType === "content_block_delta" || event.type === "content_block_delta") {
              const delta = event.delta;
              if (delta?.type === "thinking_delta") {
                yield { type: "thinking", text: delta.thinking };
              } else if (delta?.type === "text_delta") {
                yield { type: "text", text: delta.text };
              }
              continue;
            }

            // message_delta / content_block_stop: done
            if (currentEventType === "message_delta" || currentEventType === "content_block_stop") {
              continue;
            }
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: "done" };
  },
};
