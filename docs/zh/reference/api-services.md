# Services API 参考

## analyzeContent

**文件**：`src/services/ai/analyzeContent.ts`

```typescript
export async function analyzeContent(item: PasteItem): Promise<AnalysisResult>

interface AnalysisResult {
  suggestedName: string;
  summary: string;
}
```

内容分析的入口点。根据内容类型和设置路由到配置的提供商。如果所选提供商无法处理该内容类型，则 fallback 到 Gemini。

---

## generateImage

**文件**：`src/services/ai/generateImage.ts`

```typescript
interface GenerateImageParams {
  prompt: string;
  quality: "standard" | "pro";
  size: "1K" | "2K" | "4K";
  contextItem?: PasteItem | null;   // 如设置 → 编辑模式
  apiKey?: string;
}

export async function generateImage(params: GenerateImageParams): Promise<string | null>
// 返回值：base64 PNG 数据 URI，生成失败则返回 null
```

通过 Gemini 生成图片。当设置了 `contextItem` 时，将图片作为内联数据传递以进行编辑。权限错误时抛出（调用方处理 → 提示选择 AI Studio 密钥）。

---

## startLiveSession

**文件**：`src/services/ai/startLiveSession.ts`

```typescript
interface LiveSessionCallbacks {
  onOpen: () => void;
  onClose: () => void;
  onTranscription: (text: string) => void;
}

export async function startLiveSession(callbacks: LiveSessionCallbacks): Promise<LiveSessionConnection>

interface LiveSessionConnection {
  close: () => void;  // 停止麦克风，关闭 AudioContext，关闭 Gemini 会话
}
```

打开 Gemini 3.1 Flash Live 会话。音频双向流式传输。转录文本通过 `onTranscription` 传递。模型响应通过 `AudioContext` 播放。

---

## copyItemToClipboard / downloadItem

**文件**：`src/services/clipboard/clipboardUtils.ts`

```typescript
export async function copyItemToClipboard(item: PasteItem): Promise<void>;
export function downloadItem(item: PasteItem): void;
```

`copyItemToClipboard` 将条目内容写入剪贴板（base64 blob 在写入前先解码）。`downloadItem` 触发 `<a download>` 点击，使用适当的文件名。

---

## IndexedDB 操作

**文件**：`src/lib/db.ts`

```typescript
export async function initDB(): Promise<IDBPDatabase>;
export async function savePaste(item: PasteItem): Promise<void>;
export async function getPastes(): Promise<PasteItem[]>;       // 按时间戳降序排序
export async function deletePaste(id: string): Promise<void>; // 硬删除
export async function clearUnpinnedPastes(): Promise<void>;
export async function updatePaste(item: PasteItem): Promise<void>;
export async function saveChatMessage(message: ChatMessage): Promise<void>;
export async function getChatMessages(chatId?: string): Promise<ChatMessage[]>;
export async function clearChatMessages(chatId?: string): Promise<void>;
```

---

## tabSync

**文件**：`src/lib/tabSync.ts`

```typescript
export function initTabSync(
  onItemUpdated: (item: PasteItem) => void,
  onItemDeleted: (id: string) => void,
): () => void;  // 返回清理函数

export function broadcastItemUpdated(item: PasteItem): void;
export function broadcastItemDeleted(id: string): void;
export function markItemEditing(id: string): void;
export function unmarkItemEditing(id: string): void;
export function isItemEditing(id: string): boolean;
```

---

## Settings

**文件**：`src/lib/settings.ts`

```typescript
export function getStoredSettings(): Partial<StoredSettings>;
export function getAnalysisProviderForType(type: PasteType): ProviderType;
```
