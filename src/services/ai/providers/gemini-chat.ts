import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { ChatProvider, ChatProviderParams, ChatProviderResponse, ChatStreamChunk } from "./chat-types";

export const geminiChatProvider: ChatProvider = {
  async chat(params): Promise<ChatProviderResponse> {
    const ai = new GoogleGenAI({ apiKey: params.apiKey });

    const history = params.messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: params.model || "gemini-3.1-pro-preview",
      contents: history,
      config: {
        systemInstruction: params.systemInstruction,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });

    // response.text excludes thinking parts; extract full parts for thinking
    const text = response.text || "I couldn't generate a response.";
    return { text };
  },

  async *streamChat(params): AsyncIterable<ChatStreamChunk> {
    const ai = new GoogleGenAI({ apiKey: params.apiKey });

    const history = params.messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const stream = await ai.models.generateContentStream({
      model: params.model || "gemini-3.1-pro-preview",
      contents: history,
      config: {
        systemInstruction: params.systemInstruction,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });

    for await (const chunk of stream) {
      const part = chunk.candidates?.[0]?.content?.parts?.[0] as any;
      const thoughtSummary = part?.thoughtSummary as { content?: { text?: string } } | undefined;
      if (thoughtSummary?.content?.text) {
        yield { type: "thinking", text: thoughtSummary.content.text };
      }
      const text = part?.text;
      if (text) {
        yield { type: "text", text };
      }
    }

    yield { type: "done" };
  },
};
