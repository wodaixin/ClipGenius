# ClipGenius — AI Clipboard Manager

> A professional-grade AI clipboard manager built with React 19 + Vite. Captures images, videos, text, URLs, markdown, and code snippets — then analyzes them via AI (Gemini, Minimax). All data stored locally via IndexedDB.

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

### AI Content Analysis
When auto-analyze is enabled, AI generates:
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

### Local Storage (IndexedDB)
All data persisted to IndexedDB via `idb` library. App is fully functional offline.

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 19 + Vite 6 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Animations | motion/react |
| AI SDK | `@google/genai` v1.29.0 |
| Backend | Local-only (IndexedDB) |
| Local DB | IndexedDB via `idb` v8 |
| Markdown | `react-markdown` + `rehype-highlight` + `react-syntax-highlighter` |
| Icons | `lucide-react` |
| i18n | `i18next` + `react-i18next` + `i18next-browser-languagedetector` |
| Virtual Scroll | `@tanstack/react-virtual` |
| Text Preprocessing | `@chenglou/pretext` |

## Documentation

See [`docs/en/`](./docs/en/) for full documentation including:

- [Getting Started](./docs/en/getting-started/) — Installation, setup, first steps
- [Guides](./docs/en/guides/) — Feature-by-feature usage guides
- [Architecture](./docs/en/architecture/) — System design and data flow
- [Reference](./docs/en/reference/) — API, hooks, types, environment variables
- [Deployment](./docs/en/deployment/) — Google Cloud Run, CI/CD

## Architecture

```
src/
├── App.tsx                      # Thin composition layer
├── types.ts                     # PasteItem, ChatMessage, StoredAttachment
├── main.tsx                     # React entry point
├── vite-env.d.ts               # Vite type definitions
├── config/                      # AI Prompts configuration
│   ├── prompts.ts              # Prompt loader and utilities
│   ├── prompts.en.json          # English prompts
│   └── prompts.zh.json          # Chinese prompts
├── context/
│   ├── AppContext.tsx            # App-level state (drag, modals, settings)
│   └── ChatContext.tsx           # Chat state
├── hooks/
│   ├── useClipboard.ts           # paste event listener + type detection
│   ├── usePasteStore.ts          # paste item CRUD, auto-analyze toggle
│   └── useImageGen.ts            # image generation state
├── components/
│   ├── layout/
│   │   ├── PasteZone.tsx         # Left panel — paste drop zone
│   │   ├── HistoryPane.tsx       # Right panel — clipboard history list
│   │   └── SettingsModal.tsx     # Advanced settings modal
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
│   │       ├── capabilities.ts   # Provider capability definitions
│   │       ├── gemini.ts         # Gemini content analysis
│   │       ├── gemini-chat.ts   # Gemini chat + thinking stream
│   │       ├── minimax.ts        # Minimax content analysis
│   │       └── minimax-chat.ts   # Minimax chat
│   └── clipboard/
│       └── clipboardUtils.ts
├── lib/
│   ├── db.ts                     # IndexedDB operations (idb wrapper)
│   ├── settings.ts                # localStorage settings management
│   ├── tabSync.ts               # BroadcastChannel cross-tab sync (local)
│   └── utils.ts
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

**Provider Capabilities:**

| Provider | Text | Image | Video |
|---|---|---|---|
| **Gemini** | ✅ | ✅ | ✅ |
| **Minimax** | ✅ | ❌ | ❌ |

Minimax text models only support text input. The app includes capability checks that display user-friendly errors when attempting to use unsupported features.

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in all required values:

```env
# Gemini API key (required for AI features)
VITE_GEMINI_API_KEY="your-gemini-api-key"

# App URL
VITE_APP_URL="http://localhost:3000"
```

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Run

```bash
npm run dev       # Dev server on http://localhost:3000
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
npm run lint      # TypeScript type check (tsc --noEmit)
npm run clean     # Remove dist/
```

## Deployment

### Docker (Recommended)

The easiest way to deploy ClipGenius is using Docker:

```bash
# Using Docker Compose
docker-compose up -d

# Or using Docker CLI
docker build -t clipgenius:latest .
docker run -d -p 8080:80 --name clipgenius clipgenius:latest
```

Access the application at `http://localhost:8080`

See [DOCKER.md](./DOCKER.md) for detailed Docker deployment instructions including:
- Configuration options
- Production deployment to cloud platforms
- Troubleshooting

### Google Cloud Run

Deploy to Google Cloud Run for seamless AI Studio integration:

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/clipgenius
gcloud run deploy clipgenius \
  --image gcr.io/YOUR_PROJECT_ID/clipgenius \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

See [`docs/en/deployment/`](./docs/en/deployment/) for full deployment instructions including:
- [Google Cloud Run](./docs/en/deployment/google-cloud-run.md) — Primary deployment target (AI Studio integration)
- [CI/CD](./docs/en/deployment/ci-cd.md) — GitHub Actions workflow

## Advanced Settings

The app includes an in-app Settings modal (accessible from the PasteZone header) for configuring:
- AI provider selection per feature (analysis, chat, live voice, image generation)
- API keys for Gemini and Minimax
- Per-feature model overrides

Settings are stored in browser `localStorage` and persist across sessions.

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
