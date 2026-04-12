# Hooks API 参考

## useClipboard

```typescript
function useClipboard(): {
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
}
```

在 `window` 上注册 `paste` 事件监听器。忽略来自输入元素和隐藏标签页的事件。使用模块级 500ms 防抖处理 React StrictMode。

**参数**：无。

**返回值**：
- `handleDragOver` — 在拖放区的 `onDragOver` 属性中调用
- `handleDragLeave` — 在 `onDragLeave` 属性中调用
- `handleDrop` — 在 `onDrop` 属性中调用

---

## usePasteStore

```typescript
function usePasteStore(): {
  // 状态（来自 AppContext）
  items: PasteItem[];
  filteredItems: PasteItem[];
  // UI 状态
  searchQuery: string;
  isDragging: boolean;
  copiedId: string | null;
  editingItemId: string | null;
  editName: string;
  editSummary: string;
  isAutoAnalyzeEnabled: boolean;
  // Setters
  setSearchQuery: (q: string) => void;
  setIsDragging: (v: boolean) => void;
  setEditingItemId: (id: string | null) => void;
  setEditName: (name: string) => void;
  setEditSummary: (summary: string) => void;
  setIsAutoAnalyzeEnabled: (v: boolean) => void;
  // 操作
  addItem: (item: PasteItem) => Promise<void>;
  updateItem: (item: PasteItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  clearUnpinned: () => Promise<void>;
  saveEdit: (id: string) => Promise<void>;
  startEditing: (item: PasteItem) => void;
  copyToClipboard: (item: PasteItem) => Promise<void>;
  downloadItem: (item: PasteItem) => void;
}
```

管理剪贴板条目和 UI 状态。`filteredItems` 是派生状态：先按置顶状态再按时间戳排序；如果 `searchQuery` 非空则为 Fuse.js 搜索结果。

---

## useImageGen

```typescript
function useImageGen(): {
  isImageGenOpen: boolean;
  imagePrompt: string;
  imageSize: ImageSize;
  generatedImage: string | null;
  isGeneratingImage: boolean;
  isEditingImage: boolean;
  imageQuality: ImageQuality;
  hasApiKey: boolean;
  isAutoAnalyzeEnabled: boolean;
  setIsAutoAnalyzeEnabled: (v: boolean) => void;
  setImagePrompt: (v: string) => void;
  setImageSize: (v: ImageSize) => void;
  setImageQuality: (v: ImageQuality) => void;
  openImageGen: () => void;
  openImageGenWithText: (text: string) => void;
  startImageEdit: (item: PasteItem) => void;
  closeImageGen: () => void;
  generateImageAction: () => Promise<void>;
  downloadGenerated: () => void;
}
```

从 `AppContext` 重新导出的图片生成状态和操作的便捷封装。详见 [AppContext](./api-contexts.md)。
