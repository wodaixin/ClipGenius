# Firestore 数据结构

## 集合

### `/users/{userId}/pastes/{pasteId}`

存储剪贴板条目。本地 `PasteItem` 类型的镜像。

```typescript
// Firestore 文档字段（与 PasteItem 相同）：
{
  id: string;
  type: "image" | "text" | "url" | "video" | "markdown" | "code";
  content: string;         // base64 数据 URI 或原始文本
  mimeType: string;
  timestamp: Timestamp;     // 存储为 Timestamp，反序列化为 Date
  suggestedName: string;
  summary?: string;
  isAnalyzing: boolean;
  isPinned?: boolean;
  userId: string;
  updatedAt: Timestamp;
  syncRev: number;          // 每次写入时 increment(1)
  isDeleted?: boolean;
  deletedAt?: Timestamp;
}
```

### `/users/{userId}/chats/{chatId}/messages/{messageId}`

存储聊天消息。`chatId` 等于所附粘贴条目的 `id`，无上下文时为 `"default"`。

```typescript
{
  id: string;
  chatId?: string;         // "default" 聊天时为 undefined
  role: "user" | "model";
  text: string;
  thinking?: string;
  timestamp: Timestamp;
  attachments?: StoredAttachment[];
  isResponding?: boolean;
}
```

## 必需索引

需要两个复合索引。部署项目根目录的 `firestore.indexes.json`：

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

## 安全规则

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

## 存储

图片和视频以 base64 数据 URI 形式存储在 Firestore 文档中，而非 Firebase Storage。这避免了 CORS 复杂性，但也意味着大型剪贴板条目会增加 Firestore 存储成本和文档大小限制（每个文档 1 MiB）。视频因体积过大在登录后迁移中被跳过。
