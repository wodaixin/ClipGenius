# Hooks API Reference

## useClipboard

```typescript
function useClipboard(): {
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
}
```

Attaches a `paste` event listener to `window`. Ignores events from input elements and hidden tabs. Debounces with a 500ms module-level guard for React StrictMode.

**Parameters**: None.

**Returns**:
- `handleDragOver` — call in the `onDragOver` prop of a drop zone
- `handleDragLeave` — call in the `onDragLeave` prop
- `handleDrop` — call in the `onDrop` prop

---

## usePasteStore

```typescript
function usePasteStore(): {
  // State (from AppContext)
  items: PasteItem[];
  filteredItems: PasteItem[];
  // UI state
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
  // Actions
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

Manages clipboard items and UI state. `filteredItems` is derived state: sorted by pin status then timestamp, or Fuse.js search results if `searchQuery` is non-empty.

---

## useFirestoreSync

```typescript
function useFirestoreSync(): void
```

Side-effect-only hook. Subscribes to Firestore `onSnapshot` on mount when the user is logged in. On login, calls `syncEngine.migrateLocalItems()`. Handles soft-delete propagation from cloud changes.

**Parameters**: None.

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

Convenience re-export of image generation state and actions from `AppContext`. See [AppContext](./api-contexts.md) for details.
