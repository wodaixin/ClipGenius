# Types 参考

所有类型定义在 `src/types.ts` 中。

## PasteType

```typescript
export type PasteType = "image" | "text" | "url" | "video" | "markdown" | "code";
```

剪贴板条目的内容类型。用于整个代码库的类型收窄和按类型的 AI 提供商路由。

## PasteItem

```typescript
export interface PasteItem {
  id: string;
  type: PasteType;
  content: string;         // 图片/视频为 base64 数据 URI；其他为原始文本
  mimeType: string;
  timestamp: Date;         // 首次捕获时间
  suggestedName: string;   // AI 生成或基于时间戳的默认值
  summary?: string;         // AI 生成；未分析时为 undefined
  isAnalyzing: boolean;    // AI 分析进行中时为 true
  isPinned?: boolean;      // 默认为 false
  updatedAt?: Date;        // 最后修改时间
  isDeleted?: boolean;     // 软删除标志
  deletedAt?: Date;        // 软删除时间戳
}
```

## ChatMessage

```typescript
export interface ChatMessage {
  id: string;
  chatId?: string;          // undefined = "default"（向后兼容）
  role: "user" | "model";
  text: string;
  thinking?: string;        // Gemini 流式输出的推理过程
  timestamp: Date;
  attachments?: StoredAttachment[];  // 附加到消息的 base64 图片/视频
  isResponding?: boolean;   // 模型已开始流式传输但尚无内容时为 true
}
```

## StoredAttachment

```typescript
export interface StoredAttachment {
  id: string;
  type: PasteType;
  content: string;           // base64 数据 URI
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
