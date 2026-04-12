# Services API Reference

## analyzeContent

**File**: `src/services/ai/analyzeContent.ts`

```typescript
export async function analyzeContent(item: PasteItem): Promise<AnalysisResult>

interface AnalysisResult {
  suggestedName: string;
  summary: string;
}
```

Entry point for content analysis. Routes to the configured provider based on content type and settings. Falls back to Gemini if the selected provider cannot handle the content type.

---

## generateImage

**File**: `src/services/ai/generateImage.ts`

```typescript
interface GenerateImageParams {
  prompt: string;
  quality: "standard" | "pro";
  size: "1K" | "2K" | "4K";
  contextItem?: PasteItem | null;   // if set → edit mode
  apiKey?: string;
}

export async function generateImage(params: GenerateImageParams): Promise<string | null>
// Returns: base64 PNG data URI, or null if generation failed
```

Generates an image via Gemini. When `contextItem` is set, passes the image as inline data for editing. Throws on permission errors (caller handles → prompts for AI Studio key).

---

## startLiveSession

**File**: `src/services/ai/startLiveSession.ts`

```typescript
interface LiveSessionCallbacks {
  onOpen: () => void;
  onClose: () => void;
  onTranscription: (text: string) => void;
}

export async function startLiveSession(callbacks: LiveSessionCallbacks): Promise<LiveSessionConnection>

interface LiveSessionConnection {
  close: () => void;  // stops mic, closes AudioContext, closes Gemini session
}
```

Opens a Gemini 3.1 Flash Live session. Audio is streamed bidirectionally. Transcripts are delivered via `onTranscription`. Model responses are played via `AudioContext`.

---

## copyItemToClipboard / downloadItem

**File**: `src/services/clipboard/clipboardUtils.ts`

```typescript
export async function copyItemToClipboard(item: PasteItem): Promise<void>;
export function downloadItem(item: PasteItem): void;
```

`copyItemToClipboard` writes the item's content to the clipboard (base64 blobs are decoded before writing). `downloadItem` triggers a `<a download>` click with the appropriate filename.

---

## IndexedDB Operations

**File**: `src/lib/db.ts`

```typescript
export async function initDB(): Promise<IDBPDatabase>;
export async function savePaste(item: PasteItem): Promise<void>;
export async function getPastes(): Promise<PasteItem[]>;       // sorted desc by timestamp
export async function deletePaste(id: string): Promise<void>; // hard delete
export async function clearUnpinnedPastes(): Promise<void>;
export async function updatePaste(item: PasteItem): Promise<void>;
export async function saveChatMessage(message: ChatMessage): Promise<void>;
export async function getChatMessages(chatId?: string): Promise<ChatMessage[]>;
export async function clearChatMessages(chatId?: string): Promise<void>;
```

---

## tabSync

**File**: `src/lib/tabSync.ts`

```typescript
export function initTabSync(
  onItemUpdated: (item: PasteItem) => void,
  onItemDeleted: (id: string) => void,
): () => void;  // returns cleanup function

export function broadcastItemUpdated(item: PasteItem): void;
export function broadcastItemDeleted(id: string): void;
export function markItemEditing(id: string): void;
export function unmarkItemEditing(id: string): void;
export function isItemEditing(id: string): boolean;
```

---

## Settings

**File**: `src/lib/settings.ts`

```typescript
export function getStoredSettings(): Partial<StoredSettings>;
export function getAnalysisProviderForType(type: PasteType): ProviderType;
```
