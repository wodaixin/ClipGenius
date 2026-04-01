# Multimodal AI Chat

## Overview

ClipGenius includes a full conversational AI assistant. It can attach any clipboard item as context, streams thinking/reasoning from the model, and persists chat history per paste item.

## Chat Identity

Each chat is scoped to a paste item ID. Opening a chat from a specific paste card creates a dedicated conversation thread for that item. Without a paste context, the chat defaults to ID `"default"`. This means every paste with an opened chat retains its own conversation history.

## Context Injection

When `contextItem` is set (an attached paste):

- **Image/Video** — the prompt becomes: `[Context: {{type}} attached] {{question}}` (from i18n key `chat.contextMedia`)
- **Text/Markdown/Code/URL** — the prompt becomes: `Context: "{{content}}"\n\nUser Question: {{question}}` (from i18n key `chat.contextText`)

```typescript
// From ChatContext.tsx line 233-238
if (sentItem) {
  if (sentItem.type === "image" || sentItem.type === "video") {
    finalPrompt = t("chat.contextMedia", { type: sentItem.type, question: chatInputValue });
  } else {
    finalPrompt = t("chat.contextText", { content: sentItem.content, question: chatInputValue });
  }
}
```

## Streaming Architecture

`getChatProvider().streamChat()` yields `ChatStreamChunk` objects with `type: "thinking" | "text" | "done"`:

- `thinking` — accumulated in `modelMsg.thinking`, rendered in real-time in the UI
- `text` — accumulated in `modelMsg.text`, rendered as the model's response
- `done` — signals the end of the stream

The `isResponding` flag goes `true` immediately on send (spinner shown), then `false` on the first chunk received.

## Message History

The history sent to the model is capped at the 30 most recent messages:

```typescript
const allMessages = [...chatMessages, userMsg].slice(-30);
```

## Dual Persistence

- **User message** — optimistically added to local state immediately, then written to IndexedDB (guests) or Firestore (logged-in). Firestore writes use `.catch(console.error)` (fire-and-forget).
- **Model response** — streamed chunks are written to Firestore in real-time. If the stream fails, the partial message is deleted.

## Firestore Merge Strategy

The `onSnapshot` subscription uses a merge strategy: cloud messages are merged with local-only messages (identified by ID not present in the cloud snapshot):

```typescript
setChatMessages((prev) => {
  const firestoreIds = new Set(firestoreMessages.map((fm) => fm.id));
  const localOnly = prev.filter((m) => !firestoreIds.has(m.id));
  // ... merge cloud + local-only
  return [...merged, ...localOnly];
});
```

This preserves optimistic local messages during reconnection.

## Error Handling

Errors are classified by message content:

- Rate limit: `includes("429") || includes("quota") || includes("rate") || includes("529") || includes("overloaded")` → i18n `errors.rateLimit`
- Network: `includes("fetch")` → i18n `errors.network`
- Generic → raw error message

## Thinking Display

Model thinking chunks (`thoughtSummary.content.text`) are accumulated in `modelMsg.thinking` and rendered as a collapsible section in the chat UI.
