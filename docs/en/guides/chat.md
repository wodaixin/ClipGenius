# AI Chat

ClipGenius integrates a full conversational AI assistant with multimodal context support, streaming responses, and live voice interaction.

## Opening Chat

Click the chat icon on any PasteCard to open the chat modal with that item attached as context. You can also open chat without any context from the Paste Zone header.

**Chat ID mapping**: The chat ID equals the attached paste item's `id`, or `"default"` when no paste is attached. This means each paste item has its own chat history.

## Context Attachment

When a paste item is attached to chat:

- **Images and videos**: Stored as base64 `StoredAttachment` objects in the message's `attachments` array, sent as inline data to the model.
- **Text, URL, markdown, code**: Included as plain text in the system prompt.
- The `chatId` (paste item ID) is persisted in IndexedDB.

## Streaming

Gemini chat streams two types of chunks simultaneously:

1. **Thinking chunks** (`turnComplete` events with `candidate.supplements?.thought`): accumulated into the `thinking` field of the model message.
2. **Text chunks** (`contentBlocks`): appended to the `text` field.

The `isStreaming` flag is `true` while chunks are arriving. When `turnComplete` fires, streaming ends.

## Aborting

Clicking **Cancel** during a streaming response calls `abortController.abort()`, which stops the fetch and closes the Gemini session. The partial response is discarded. The user can then send a new message.

## Live Voice Session

Click the microphone button to start a live voice session. This opens a Gemini 3.1 Flash Live session (`gemini-3.1-flash-live-preview`):

1. Browser requests microphone permission
2. Audio is streamed bidirectionally to Gemini
3. Transcripts appear in `liveTranscription` in real time
4. Model responses are spoken via `AudioContext` with a pending chunk queue for sequential playback

Live sessions use the `live` feature's configured provider and model (defaults to Gemini). The session is closed via `LiveSessionConnection.close()`.

## Provider Capabilities

| Content Type | Gemini | Minimax |
|---|---|---|
| Text | ✅ | ✅ |
| Image | ✅ | ❌ |
| Video | ✅ | ❌ |

If you attach an image or video context with Minimax selected, the app shows a `providerNotSupported` error from `src/i18n/locales/en.json` / `zh.json`. Users are prompted to switch to Gemini in Settings.
