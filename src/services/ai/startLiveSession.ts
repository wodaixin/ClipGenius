import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { LiveSessionConnection } from "../../types";
import i18n from "../../i18n";
import { getPrompts } from "../../config/prompts";

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

  let audioCtx: AudioContext | null = null;
  let sourceNode: AudioBufferSourceNode | null = null;
  let pendingChunks: ArrayBuffer[] = [];
  let isPlaying = false;

  const playNext = async () => {
    if (!audioCtx || pendingChunks.length === 0 || isPlaying) return;
    isPlaying = true;
    while (pendingChunks.length > 0) {
      const chunk = pendingChunks.shift()!;
      try {
        const buffer = await audioCtx.decodeAudioData(chunk.slice(0));
        const src = audioCtx.createBufferSource();
        src.buffer = buffer;
        src.connect(audioCtx.destination);
        await new Promise((r) => {
          src.onended = r;
          src.start();
        });
      } catch {}
    }
    isPlaying = false;
  };

  const appendAndPlay = (buffer: ArrayBuffer) => {
    pendingChunks.push(buffer);
    playNext();
  };

  const initAudioCtx = () => {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
  };

  const session = await ai.live.connect({
    model: import.meta.env.VITE_LIVE_MODEL || "gemini-3.1-flash-live-preview",
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: getPrompts(i18n.language).liveVoice.systemInstruction,
    },
    callbacks: {
      onopen: () => {
        initAudioCtx();
        callbacks.onOpen();
      },
      onclose: callbacks.onClose,
      onmessage: (msg: LiveServerMessage) => {
        // Play audio chunks from server
        const chunk = (msg as any).audioChunk as { data?: string; mimeType?: string } | undefined;
        if (chunk?.data) {
          initAudioCtx();
          const binary = atob(chunk.data);
          const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
          appendAndPlay(bytes.buffer);
        }

        // Transcribe text
        const text =
          msg.serverContent?.modelTurn?.parts?.find((p) => "text" in p && p.text)?.["text"] ??
          msg.serverContent?.interrupted === true
            ? ""
            : undefined;
        if (text !== undefined) {
          callbacks.onTranscription(text);
        }
      },
    },
  });

  // Request microphone and stream audio to the session
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
  recorder.ondataavailable = async (e) => {
    if (e.data.size > 0) {
      const buffer = await e.data.arrayBuffer();
      const binary = String.fromCharCode.apply(
        null,
        Array.from(new Uint8Array(buffer))
      );
      const base64 = btoa(binary);
      session.sendRealtimeInput({ audio: { data: base64, mimeType: "audio/webm;codecs=opus" } });
    }
  };
  recorder.start(100);

  return {
    close: () => {
      recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
      session.close();
    },
  };
}
