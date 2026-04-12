# Types Reference

All types are defined in `src/types.ts`.

## PasteType

```typescript
export type PasteType = "image" | "text" | "url" | "video" | "markdown" | "code";
```

The content type of a clipboard item. Used for type narrowing throughout the codebase and for per-type AI provider routing.

## PasteItem

```typescript
export interface PasteItem {
  id: string;
  type: PasteType;
  content: string;         // base64 data URI for image/video; raw text otherwise
  mimeType: string;
  timestamp: Date;         // when the item was first captured
  suggestedName: string;   // AI-generated or timestamp-based default
  summary?: string;         // AI-generated; undefined if not yet analyzed
  isAnalyzing: boolean;    // true while AI analysis is in progress
  isPinned?: boolean;      // default false
  updatedAt?: Date;        // last modification time
  isDeleted?: boolean;     // soft-delete flag
  deletedAt?: Date;        // soft-delete timestamp
}
```

## ChatMessage

```typescript
export interface ChatMessage {
  id: string;
  chatId?: string;          // undefined = "default" for backward compat
  role: "user" | "model";
  text: string;
  thinking?: string;        // streamed reasoning from Gemini
  timestamp: Date;
  attachments?: StoredAttachment[];  // base64 images/videos attached to the message
  isResponding?: boolean;   // true when model started streaming but no content yet
}
```

## StoredAttachment

```typescript
export interface StoredAttachment {
  id: string;
  type: PasteType;
  content: string;           // base64 data URI
  mimeType: string;
  suggestedName: string;
}
```

## LiveSessionConnection

```typescript
export interface LiveSessionConnection {
  close: () => void;
}
```

## ImageQuality / ImageSize

```typescript
export type ImageQuality = "standard" | "pro";
export type ImageSize = "1K" | "2K" | "4K";
```

## ProviderType

```typescript
export type ProviderType = "gemini" | "minimax";
```
