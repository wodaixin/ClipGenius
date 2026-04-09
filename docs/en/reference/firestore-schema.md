# Firestore Schema

## Collections

### `/users/{userId}/pastes/{pasteId}`

Stores clipboard items. Mirror of the local `PasteItem` type.

```typescript
// Firestore document fields (same as PasteItem):
{
  id: string;
  type: "image" | "text" | "url" | "video" | "markdown" | "code";
  content: string;         // base64 data URI or raw text
  mimeType: string;
  timestamp: Timestamp;     // stored as Timestamp, deserialized as Date
  suggestedName: string;
  summary?: string;
  isAnalyzing: boolean;
  isPinned?: boolean;
  userId: string;
  updatedAt: Timestamp;
  syncRev: number;          // increment(1) on every write
  isDeleted?: boolean;
  deletedAt?: Timestamp;
}
```

### `/users/{userId}/chats/{chatId}/messages/{messageId}`

Stores chat messages. `chatId` equals the attached paste item's `id`, or `"default"` when no paste is attached.

```typescript
{
  id: string;
  chatId?: string;         // undefined for "default" chat
  role: "user" | "model";
  text: string;
  thinking?: string;
  timestamp: Timestamp;
  attachments?: StoredAttachment[];
  isResponding?: boolean;
}
```

## Required Indexes

Two composite indexes are required. Deploy `firestore.indexes.json` from the project root:

```json
{
  "indexes": [
    {
      "collectionGroup": "pastes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "pastes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "syncRev", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/pastes/{pasteId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/chats/{chatId}/messages/{messageId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Storage

Images and videos are stored as base64 data URIs within Firestore documents, not in Firebase Storage. This avoids CORS complexity but means large clipboard items contribute to Firestore storage costs and document size limits (1 MiB per document). Videos are skipped from post-login migration due to their size.
