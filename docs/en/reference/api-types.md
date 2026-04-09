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
  userId: string;          // Firebase UID; empty string "" for guests
  // Sync fields
  updatedAt?: Date;        // last modification time
  syncRev?: number;        // monotonically increasing; 0 = never synced to cloud
  isDeleted?: boolean;     // soft-delete flag
  deletedAt?: Date;        // soft-delete timestamp
}
```

## SyncState

```typescript
export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface SyncState {
  status: SyncStatus;
  localUpdatedAt: Date;        // updatedAt of the local version
  localSyncRev: number;        // syncRev of the local version (-1 if never synced)
  pendingCloudRev?: number;    // syncRev waiting for cloud acknowledgement
  retryCount: number;          // current retry attempt count
  lastError?: string;          // last error message
}

export interface SyncStore {
  states: Record<string, SyncState>;
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
