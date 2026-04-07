# Architecture Reference

**Overview** — ClipGenius follows a clean separation of concerns: clipboard events are captured in hooks, state is managed in React Contexts, AI features are routed through configurable providers, and persistence is handled by IndexedDB and Firestore.

**Project Structure**

```
src/
├── App.tsx                     # Thin composition layer
├── types.ts                    # PasteItem, ChatMessage, StoredAttachment
├── config/                     # AI Prompts configuration
│   ├── prompts.ts              # Prompt loader and utilities
│   ├── prompts.en.json         # English prompts
│   └── prompts.zh.json         # Chinese prompts
├── context/                    # React Context providers
├── hooks/                      # Custom React hooks
├── components/                 # UI components
├── services/
│   ├── ai/                    # AI providers (gemini, minimax)
│   ├── clipboard/
│   └── sync/
├── lib/                        # Utilities (db.ts, utils.ts)
└── i18n/                       # Internationalization
```

**High-Level Data Flow**

```
Clipboard paste event (Cmd/Ctrl+V)
         │
         ▼
  useClipboard hook
  (classifies type, generates ID + suggestedName)
         │
         ▼
  addItem → IndexedDB (sync) → Firestore (async, if logged in)
         │
         ▼
  React state updated → UI re-renders with new paste card
         │
         ▼
  Auto-analyze (if logged in + enabled)
  → Gemini API → suggestedName + summary
         │
         ▼
  updateItem → IndexedDB + Firestore (merged)
```

**Provider Architecture**

All AI features are routed through typed provider interfaces. AI prompts are centralized in `src/config/prompts.ts` (see [AI Prompts Configuration](../../src/config/README.md)):

```
Content Analysis  ──→ getAnalysisProvider() ──→ gemini │ minimax
Chat               ──→ getChatProvider()    ──→ gemini │ minimax
Image Generation   ──→ (direct Gemini call)
Live Voice         ──→ (direct Gemini call)
```

Each provider implements a typed interface. Swapping from `gemini` to `minimax` is a zero-code-change env var operation:

```typescript
// VITE_ANALYSIS_PROVIDER=gemini → uses GeminiAnalysisProvider
// VITE_ANALYSIS_PROVIDER=minimax → uses MinimaxAnalysisProvider
export function getAnalysisProvider(): AnalysisProvider {
  const provider = import.meta.env.VITE_ANALYSIS_PROVIDER ?? "gemini";
  if (provider === "minimax") return new MinimaxAnalysisProvider();
  return new GeminiAnalysisProvider();
}
```

**Context Hierarchy**

```
AuthProvider        → owns user identity (Firebase Auth state)
    │
    └── AppProvider  → owns paste items, image generation state, global UI state
           │
           └── ChatProvider → owns chat messages and live session state
```

`usePasteStore` is a hook that reads from `AppContext` and adds UI-specific derived state (search filtering, editing state, action helpers).

**Dual-Write Pattern**

Every mutation writes to IndexedDB synchronously first, then calls Firestore asynchronously (fire-and-forget):

```typescript
const updateItem = async (updated: PasteItem) => {
  await updateLocalPaste(updated);     // IndexedDB — synchronous
  setItems((prev) => prev.map(i => i.id === updated.id ? updated : i)); // instant re-render
  if (user) {
    syncPasteUpdateToCloud(updated.id, user.uid, {...}); // async, no await
  }
};
```

This ensures instant local feedback regardless of network conditions. Firestore failures are silently ignored.

**Cloud-Wins on Sync**

`useFirestoreSync` subscribes to Firestore `onSnapshot`. When a cloud document changes, it overwrites the local item in both IndexedDB and React state. This is intentional: the cloud is the source of truth for metadata (`suggestedName`, `summary`, `isPinned`). The actual pasted content is large and rarely changes, so the overwrite is effectively a no-op for content.

**Why `GoogleGenAI` Is Instantiated Per-Call**

`GoogleGenAI` instances are created per-call (not singleton) because `import.meta.env.VITE_*` variables are replaced with their values at **build time** by Vite. In AI Studio deployments, secrets are injected as **runtime** environment variables. Creating a new instance each time ensures the latest runtime values are picked up, bypassing Vite's build-time constant replacement.

**Vite Proxy for MiniMax**

During local development, the MiniMax API is proxied through the Vite dev server to bypass system proxy/CORS issues:

```typescript
// vite.config.ts
proxy: {
  '/api/minimax': {
    target: 'https://api.minimaxi.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/minimax/, '/anthropic'),
  },
}
```

Requests to `/api/minimax/*` are forwarded to `https://api.minimaxi.com/anthropic/*`.

**Text Preview Truncation**

Long text content (text/markdown/code/URL) is truncated to 2000 characters when loaded from IndexedDB (`PREVIEW_LIMIT = 2000` in `AppContext`). This prevents loading very large pastes on page load. The full content is preserved in IndexedDB and can be retrieved on demand.
