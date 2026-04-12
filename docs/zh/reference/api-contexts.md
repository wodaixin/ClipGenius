# Contexts API 参考

## AppContext

**文件**：`src/context/AppContext.tsx`

```typescript
function useAppContext(): AppContextValue;
```

### AppContextValue

```typescript
interface AppContextValue {
  // 条目状态
  items: PasteItem[];
  setItems: React.Dispatch<React.SetStateAction<PasteItem[]>>;
  contextItem: PasteItem | null;        // 附加到聊天/图片生成的条目
  setContextItem: (item: PasteItem | null) => void;
  updateItem: (updated: PasteItem) => Promise<void>;

  // 图片生成
  isImageGenOpen: boolean;
  imagePrompt: string;
  imageSize: ImageSize;                  // "1K" | "2K" | "4K"
  generatedImage: string | null;          // base64 PNG 数据 URI
  isGeneratingImage: boolean;
  isEditingImage: boolean;               // 当 contextItem 为源图片时为 true
  imageQuality: ImageQuality;             // "standard" | "pro"
  hasApiKey: boolean;
  openImageGen: () => void;
  openImageGenWithText: (text: string) => void;
  startImageEdit: (item: PasteItem) => void;
  closeImageGen: () => void;
  generateImageAction: () => Promise<void>;
  downloadGenerated: () => void;

  // 自动分析
  isAutoAnalyzeEnabled: boolean;
  setIsAutoAnalyzeEnabled: (v: boolean) => void;
}
```

**抛出**：在 `AppProvider` 外使用时抛出 `Error`。

### 关键实现细节

- `updateItem` 是集中化写入路径：保存到 IndexedDB。
- 自动分析 `useEffect` 使用 `analysisPromises.current`（`Map<id, Promise>`）和 `analyzingRef.current`（`Set<id>`）进行去重，防止重复调用分析。
- 调用 `closeImageGen()` 时会清除 `generatedImage` 状态。

---

## ChatContext

**文件**：`src/context/ChatContext.tsx`

```typescript
function useChat(): ChatContextValue;
```

### ChatContextValue

```typescript
interface ChatContextValue {
  chatMessages: ChatMessage[];           // 当前 displayChatId 的消息
  chatInput: string;
  isChatLoading: boolean;               // 用户消息已发送，模型尚未开始
  isStreaming: boolean;                 // 模型正在流式传输
  isChatOpen: boolean;
  isLiveActive: boolean;               // Gemini Live 会话处于活动状态
  isMicMuted: boolean;
  liveTranscription: string;
  chatError: string | null;

  setChatInput: (v: string) => void;
  setIsMicMuted: (v: boolean) => void;
  clearChatError: () => void;

  openChatWithItem: (item: PasteItem | null) => void;
  closeChat: () => void;                // 设置 isChatOpen=false，保留 currentChatId
  clearChat: () => Promise<void>;       // 删除当前 currentChatId 的所有消息

  sendMessage: (rawInput?: string) => void;
  cancelSend: () => void;

  startLiveSessionHandler: () => void;
  stopLiveSession: () => void;
}
```

**抛出**：在 `ChatProvider` 外使用时抛出 `Error`。

### 聊天 ID 映射

当调用 `openChatWithItem(item)` 且 `item` 非 null 时，`displayChatId` 被设置为所附粘贴条目的 `id`；传入 `null` 时设为 `"default"`。消息按 `chatId` 独立存储。
