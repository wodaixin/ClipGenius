# ClipGenius — AI Clipboard Manager

> A professional-grade AI clipboard manager built with React 19 + Vite. Captures images, videos, text, URLs, markdown, and code snippets — then analyzes and syncs them across devices via AI (Gemini, Minimax) and Firebase.

[中文版](README_zh.md)

## Features

### Intelligent Clipboard Capture
Listens globally for `paste` events and automatically classifies clipboard content into six types:

| Type | Detection Logic |
|---|---|
| `image` | `file.type.startsWith("image/")` |
| `video` | `file.type.startsWith("video/")` |
| `url` | Matches `https?://...` regex |
| `markdown` | Contains `#`, `**`, `-`, `*`, `` ``` ``, `[text](url)`, `>` |
| `code` | Language-aware heuristics (json/xml/html/sql/python/go/rust/cpp/typescript/javascript/java/csharp/php/bash/yaml/toml) |
| `text` | Fallback for plain text |

Images and videos are stored as base64 data URIs. All other types are stored as raw text.

### AI Analysis
When signed in and auto-analyze is enabled, AI generates:
- **Suggested filename** — e.g. `img_20260402_143052`
- **Content summary** — one-paragraph description

Analysis is triggered per-item after capture and is provider-agnostic (supports `gemini` and `minimax`, configurable per feature).

### Multimodal AI Chat
Full conversational AI assistant integrated into the app:
- Attach any clipboard item to the chat context
- Streams thinking/reasoning chunks from Gemini 3.1 Pro
- Web search support via Gemini
- Coding assistance with syntax-highlighted responses
- Supports markdown rendering and code blocks

### Image Generation
Text-to-image via Gemini:
- **Standard mode** — free tier, uses `VITE_GEMINI_API_KEY`
- **Pro mode** — paid AI Studio key selection via `window.aistudio` global

### Live Voice Session
Real-time voice interaction powered by Gemini 3.1 Flash Live (`gemini-3.1-flash-live-preview`).

### Cloud Sync (Firebase)
- **Firestore** stores clipboard history at `/users/{userId}/pastes/{pasteId}`
- **Firebase Auth** with Google sign-in (popup)
- **Dual-write logic**: local changes write to IndexedDB immediately; remote Firestore changes overwrite local (cloud wins for metadata)
- Cloud sync is gated on authentication — guests use the app locally only
- Chat messages stored at `/users/{userId}/chats/{chatId}/messages/{messageId}` (chat ID = attached paste ID or `"default"`)

### Local Storage (IndexedDB)
All data persisted to IndexedDB via `idb` library. App is fully functional offline for guests.

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 19 + Vite 6 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Animations | motion/react |
| AI SDK | `@google/genai` v1.29.0 |
| Backend | Firebase Auth + Firestore v12 |
| Local DB | IndexedDB via `idb` v8 |
| Markdown | `react-markdown` + `rehype-highlight` + `react-syntax-highlighter` |
| Icons | `lucide-react` |
| i18n | `i18next` + `react-i18next` + `i18next-browser-languagedetector` |
| Virtual Scroll | `@tanstack/react-virtual` |
| Text Preprocessing | `@chenglou/pretext` |

## Documentation

For full documentation, see the [docs/](docs/en/) directory.

- [Quick Start](docs/en/quick-start.md) — Set up ClipGenius from scratch
- [Feature Guides](docs/en/features/) — Deep dives on every feature
- [Deployment](docs/en/deployment/cloud-run-ai-studio.md) — Deploy to Cloud Run via AI Studio
- [Environment Variables](docs/en/deployment/environment-variables.md) — Complete `.env` reference
- [Architecture Reference](docs/en/reference/architecture.md) — System design
- [Firestore Security Rules](docs/en/reference/firestore-security.md) — Rules walkthrough
- [中文文档](docs/zh/) — 中文文档

## Architecture

```
src/
├── App.tsx                      # Thin composition layer
├── types.ts                     # PasteItem, ChatMessage, StoredAttachment
├── context/
│   ├── AuthContext.tsx           # Firebase Auth state
│   ├── AppContext.tsx            # App-level state (drag, modals, settings)
│   └── ChatContext.tsx           # Chat state
├── hooks/
│   ├── useClipboard.ts           # paste event listener + type detection
│   ├── usePasteStore.ts          # paste item CRUD, auto-analyze toggle
│   ├── useFirestoreSync.ts       # Firestore onSnapshot subscription
│   └── useImageGen.ts            # image generation state
├── components/
│   ├── layout/
│   │   ├── PasteZone.tsx         # Left panel — paste drop zone
│   │   └── HistoryPane.tsx       # Right panel — clipboard history list
│   ├── paste/
│   │   ├── PasteCard.tsx         # Individual paste item card
│   │   └── PastePreview.tsx      # Full preview modal with syntax highlighting
│   ├── chat/
│   │   ├── ChatModal.tsx         # AI chat modal
│   │   └── ChatContextItem.tsx   # Inline context preview of attached paste
│   └── imagegen/
│       └── ImageGenModal.tsx     # Image generation UI
├── services/
│   ├── ai/
│   │   ├── analyzeContent.ts     # Re-exports from providers/
│   │   ├── generateImage.ts
│   │   ├── startLiveSession.ts
│   │   └── providers/
│   │       ├── index.ts          # Provider router
│   │       ├── types.ts
│   │       ├── gemini.ts         # Gemini content analysis
│   │       ├── gemini-chat.ts    # Gemini chat + thinking stream
│   │       ├── minimax.ts        # Minimax content analysis
│   │       └── minimax-chat.ts   # Minimax chat
│   ├── clipboard/
│   │   └── clipboardUtils.ts
│   └── sync/
│       └── dualSync.ts           # Firestore + IndexedDB dual-write
├── lib/
│   ├── db.ts                     # IndexedDB operations (idb wrapper)
│   ├── utils.ts
│   └── estimateCardHeight.ts
└── i18n/
    ├── index.ts
    └── locales/{en,zh}.json
```

### Provider Architecture

All AI features are routed through configurable providers selected via `VITE_*_PROVIDER` env vars:

| Feature | Default Provider | Default Model |
|---|---|---|
| Content analysis | `gemini` | `gemini-3-flash-preview` |
| Chat | `gemini` | `gemini-3.1-pro-preview` |
| Live voice | `gemini` | `gemini-3.1-flash-live-preview` |
| Image generation (standard) | `gemini` | `gemini-2.5-flash-image` |
| Image generation (pro) | `gemini` | `gemini-3-pro-image-preview` |

Alternative provider: `minimax`. Override per-feature with `VITE_ANALYSIS_PROVIDER`, `VITE_CHAT_PROVIDER`, etc.

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in all required values:

```env
# Firebase (required for cloud sync)
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_FIRESTORE_DB="your-firestore-database-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"

# Gemini API key (required for AI features)
VITE_GEMINI_API_KEY="your-gemini-api-key"

# App URL
VITE_APP_URL="http://localhost:3000"
```

Get your Firebase config from [Firebase Console](https://console.firebase.google.com/). Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Run

```bash
npm run dev       # Dev server on http://localhost:3000
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
npm run lint      # TypeScript type check (tsc --noEmit)
npm run clean     # Remove dist/
```

## Deployment

Designed for **Google Cloud Run via AI Studio**:

1. Connect your GitHub repo in AI Studio
2. Configure secrets (API keys) in AI Studio settings
3. Use **Export to GitHub** to sync changes
4. AI Studio deploys to Cloud Run automatically

## Data Models

```typescript
PasteItem {
  id: string
  type: PasteType         // "image" | "text" | "url" | "video" | "markdown" | "code"
  content: string         // base64 data URI (images/videos) or raw text
  mimeType: string
  timestamp: Date
  suggestedName: string
  summary?: string
  isAnalyzing: boolean
  isPinned?: boolean      // default false
  userId: string          // Firebase UID (empty string for guests)
}

ChatMessage {
  id: string
  role: "user" | "model"
  text: string
  thinking?: string       // streamed reasoning
  timestamp: Date
  attachments?: StoredAttachment[]
  isResponding?: boolean  // true when model started streaming, no content yet
}

StoredAttachment {
  id: string
  type: PasteType
  content: string         // base64 data URI
  mimeType: string
  suggestedName: string
}
```

## License

MIT
