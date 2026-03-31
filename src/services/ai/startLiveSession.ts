import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { LiveSessionConnection } from "../../types";

interface LiveSessionCallbacks {
  onOpen: () => void;
  onClose: () => void;
  onTranscription: (text: string) => void;
}

/** Start a Gemini Live voice session */
export async function startLiveSession(
  callbacks: LiveSessionCallbacks
): Promise<LiveSessionConnection> {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

  const session = await ai.live.connect({
    model: "gemini-3.1-flash-live-preview",
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: "You are ClipGenius Voice Assistant. Be concise and helpful.",
    },
    callbacks: {
      onopen: callbacks.onOpen,
      onclose: callbacks.onClose,
      onmessage: (msg: LiveServerMessage) => {
        if (msg.serverContent?.modelTurn?.parts?.[0]?.text) {
          callbacks.onTranscription(msg.serverContent.modelTurn.parts[0].text);
        }
      },
    },
  });

  return { close: () => session.close() };
}
