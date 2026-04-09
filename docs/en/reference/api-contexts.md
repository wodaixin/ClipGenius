# Contexts API Reference

## AuthContext

**File**: `src/context/AuthContext.tsx`

```typescript
function useAuth(): AuthContextValue;
```

### AuthContextValue

```typescript
interface AuthContextValue {
  user: User | null;     // Firebase User; null for guests
  isLoaded: boolean;      // false until onAuthStateChanged fires
  login: () => Promise<void>;   // signInWithPopup(googleProvider)
  logout: () => Promise<void>;   // signOut()
}
```

**Throws**: `Error` if used outside `AuthProvider`.

---

## AppContext

**File**: `src/context/AppContext.tsx`

```typescript
function useAppContext(): AppContextValue;
```

### AppContextValue

```typescript
interface AppContextValue {
  // Item state
  items: PasteItem[];
  setItems: React.Dispatch<React.SetStateAction<PasteItem[]>>;
  contextItem: PasteItem | null;        // item attached to chat/image-gen
  setContextItem: (item: PasteItem | null) => void;
  updateItem: (updated: PasteItem, userId?: string) => Promise<void>;

  // Image Generation
  isImageGenOpen: boolean;
  imagePrompt: string;
  imageSize: ImageSize;                  // "1K" | "2K" | "4K"
  generatedImage: string | null;          // base64 PNG data URI
  isGeneratingImage: boolean;
  isEditingImage: boolean;               // true when contextItem is source image
  imageQuality: ImageQuality;             // "standard" | "pro"
  hasApiKey: boolean;
  openImageGen: () => void;
  openImageGenWithText: (text: string) => void;
  startImageEdit: (item: PasteItem) => void;
  closeImageGen: () => void;
  generateImageAction: () => Promise<void>;
  downloadGenerated: () => void;

  // Auto-analyze
  isAutoAnalyzeEnabled: boolean;
  setIsAutoAnalyzeEnabled: (v: boolean) => void;
}
```

**Throws**: `Error` if used outside `AppProvider`.

### Key Implementation Details

- `updateItem` is the centralized write path: saves to IndexedDB + triggers `syncEngine.writeWithSync()` if `userId` is provided.
- The auto-analyze `useEffect` deduplicates analysis using `analysisPromises.current` (a `Map<id, Promise>`) and `analyzingRef.current` (a `Set<id>`) to prevent duplicate analysis calls.
- `generatedImage` state is cleared when `closeImageGen()` is called.

---

## ChatContext

**File**: `src/context/ChatContext.tsx`

```typescript
function useChat(): ChatContextValue;
```

### ChatContextValue

```typescript
interface ChatContextValue {
  chatMessages: ChatMessage[];           // messages for current displayChatId
  chatInput: string;
  isChatLoading: boolean;               // user message sent, model not started
  isStreaming: boolean;                 // model is streaming chunks
  isChatOpen: boolean;
  isLiveActive: boolean;               // Gemini Live session active
  isMicMuted: boolean;
  liveTranscription: string;
  chatError: string | null;

  setChatInput: (v: string) => void;
  setIsMicMuted: (v: boolean) => void;
  clearChatError: () => void;

  openChatWithItem: (item: PasteItem | null) => void;
  closeChat: () => void;                // sets isChatOpen=false, keeps currentChatId
  clearChat: () => Promise<void>;       // deletes all messages for currentChatId

  sendMessage: (rawInput?: string) => void;
  cancelSend: () => void;

  startLiveSessionHandler: () => void;
  stopLiveSession: () => void;
}
```

**Throws**: `Error` if used outside `ChatProvider`.

### Chat ID Mapping

`displayChatId` is set to the attached paste item's `id` when `openChatWithItem(item)` is called with a non-null item, or `"default"` when called with `null`. Chat messages are stored separately per `chatId`.
