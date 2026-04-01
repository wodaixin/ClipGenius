# Live Voice Session

## Overview

ClipGenius supports real-time voice interaction via `gemini-3.1-flash-live-preview`. The session is bidirectional: audio is streamed from the microphone to the model while audio responses are played back in real-time.

## Session Model

`src/services/ai/startLiveSession.ts` creates a `GoogleGenAI.live.connect()` session. The returned `LiveSessionConnection` exposes a `close()` function that tears down all audio resources.

```typescript
const session = await ai.live.connect({
  model: import.meta.env.VITE_LIVE_MODEL || "gemini-3.1-flash-live-preview",
  config: {
    responseModalities: [Modality.AUDIO],
    systemInstruction: i18n.t("liveVoice.systemInstruction"),
  },
  callbacks: { onopen, onclose, onmessage },
});
```

## Microphone Streaming

The microphone is accessed via `navigator.mediaDevices.getUserMedia({ audio: true })`. A `MediaRecorder` with `mimeType: "audio/webm;codecs=opus"` collects 100ms chunks and sends them to the session:

```typescript
const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
recorder.ondataavailable = async (e) => {
  if (e.data.size > 0) {
    const buffer = await e.data.arrayBuffer();
    // Convert to base64 and send
    session.sendRealtimeInput({ audio: { data: base64, mimeType: "audio/webm;codecs=opus" } });
  }
};
recorder.start(100); // Collect every 100ms
```

## Audio Response Playback

Incoming audio chunks from the model are buffered in `pendingChunks[]`. The `playNext()` function decodes and plays audio sequentially using `AudioContext` and `AudioBufferSourceNode`. New chunks appended while playing are automatically queued:

```typescript
let pendingChunks: ArrayBuffer[] = [];
let isPlaying = false;

const playNext = async () => {
  if (!audioCtx || pendingChunks.length === 0 || isPlaying) return;
  isPlaying = true;
  while (pendingChunks.length > 0) {
    const chunk = pendingChunks.shift()!;
    const buffer = await audioCtx.decodeAudioData(chunk.slice(0));
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(audioCtx.destination);
    await new Promise((r) => { src.onended = r; src.start(); });
  }
  isPlaying = false;
};

const appendAndPlay = (buffer: ArrayBuffer) => {
  pendingChunks.push(buffer);
  playNext();
};
```

## Transcription

Model text output (`serverContent.modelTurn.parts.text`) is captured in `onmessage` and passed to `callbacks.onTranscription`, which accumulates it in `liveTranscription` state and displays it in the chat UI.

## Session Lifecycle

| Event | Action |
|---|---|
| Session opens | Initialize `AudioContext`, start microphone recording |
| Audio chunk received | Append to `pendingChunks`, call `playNext()` |
| Text output received | Update `liveTranscription` via callback |
| `session.close()` called | Stop recorder, stop all mic tracks, close `AudioContext`, close live connection |

## System Instruction

Loaded from i18n key `liveVoice.systemInstruction` (English: `"You are ClipGenius Voice Assistant. Be concise and helpful. Respond in English."`).

## Browser Compatibility

Requires `audio/webm;codecs=opus` support. No polyfill is present; this may not work in all browsers.
