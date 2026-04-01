# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClipGenius is a professional-grade AI clipboard manager built with React 19 + Vite. It captures clipboard content (images, videos, text, URLs), analyzes it with Gemini AI, and syncs across devices via Firebase. Designed for Google Cloud Run deployment via AI Studio.

## Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build (outputs to dist/)
npm run preview  # Preview production build locally
npm run lint     # TypeScript type checking (tsc --noEmit)
npm run clean    # Remove dist/ directory
```

## Architecture

### Data Flow

- **Clipboard capture**: `useClipboard` hook listens for `paste` events on `window` — detects images, videos, text, URLs, markdown, and code (with language detection)
- **Paste handling**: `usePasteStore` manages all paste items; state lives in `AppContext` and is persisted to IndexedDB via `src/lib/db.ts` (using `idb`)
- **Cloud sync**: `useFirestoreSync` subscribes to Firestore `onSnapshot` — cloud wins for metadata (remote changes overwrite local). `dualSync` writes local changes to cloud only when user is authenticated
- **AI analysis**: triggered automatically for logged-in users (when `isAutoAnalyzeEnabled` is true); `GoogleGenAI` instances are created per-call to pick up the latest API key

### App Structure

`src/App.tsx` is a thin composition layer (~40 lines). All logic is split into:

| Directory | Files | Purpose |
|---|---|---|
| `src/context/` | `AuthContext`, `AppContext`, `ChatContext` | Auth, app state, chat state |
| `src/hooks/` | `useClipboard`, `usePasteStore`, `useImageGen`, `useFirestoreSync` | Core business logic |
| `src/components/chat/` | `ChatModal`, `ChatContextItem` | Chat UI and inline context preview |
| `src/components/imagegen/` | `ImageGenModal` | Image generation UI |
| `src/components/layout/` | `PasteZone`, `HistoryPane` | Main layout panels |
| `src/components/paste/` | `PasteCard`, `PastePreview` | Paste item display |
| `src/services/ai/` | `analyzeContent`, `generateImage`, `startLiveSession`, plus `providers/` | AI service layer |
| `src/services/clipboard/` | `clipboardUtils` | Clipboard utility functions |
| `src/services/sync/` | `dualSync` | Firestore + IndexedDB dual-write logic |
| `src/lib/` | `db.ts`, `utils.ts`, `estimateCardHeight.ts` | IndexedDB wrapper, utilities |
| `src/i18n/` | `index.ts`, `locales/en.json`, `locales/zh.json` | i18next configuration and translations |

### Provider Architecture

All AI features are routed through configurable providers (selected via `VITE_*_PROVIDER` env vars):

| Feature | Default Provider | Default Model |
|---|---|---|
| Content analysis | `gemini` | `gemini-3-flash-preview` |
| Chat | `gemini` | `gemini-3.1-pro-preview` |
| Live voice | `gemini` | `gemini-3.1-flash-live-preview` |
| Image generation (standard) | `gemini` | `gemini-2.5-flash-image` |
| Image generation (pro) | `gemini` | `gemini-3-pro-image-preview` |

Alternative: `minimax`. Per-feature overrides can be set in `.env`.

### Data Models

```typescript
PasteType = "image" | "text" | "url" | "video" | "markdown" | "code"

PasteItem: {
  id: string
  type: PasteType
  content: string       // Base64 for images/videos, raw text for others
  mimeType: string
  timestamp: Date
  suggestedName: string
  summary?: string
  isAnalyzing: boolean
  isPinned: boolean     // always present (initialized to false), optional in type
  userId: string         // Firebase UID; empty string for guests (guests are not synced to cloud)
}

ChatMessage: {
  id: string
  role: "user" | "model"
  text: string
  thinking?: string
  timestamp: Date
  attachments?: StoredAttachment[]
  isResponding?: boolean // true when model started streaming but no content yet
}

StoredAttachment: {
  id: string
  type: PasteType
  content: string        // base64 data URI
  mimeType: string
  suggestedName: string
}

LiveSessionConnection: { close: () => void }
```

Firestore paths: `/users/{userId}/pastes/{pasteId}`, `/users/{userId}/chats/{chatId}/messages/{messageId}`

Chat ID equals the attached paste's `id`, or `"default"` when no paste is attached.

### AI Integration

- Primary package: `@google/genai` (v1.29.0)
- `GoogleGenAI` instances are created per-call (not singleton) to ensure fresh API key reads
- `window.aistudio` global: provides `hasSelectedApiKey()`, `openSelectKey()`, `getSelectedApiKey()` for AI Studio paid key integration
- Image generation: standard mode uses env `VITE_GEMINI_API_KEY`; pro mode prompts user to select AI Studio paid key via `window.aistudio`
- Content analysis auto-detects code language (json, xml, html, sql, python, go, rust, cpp, typescript, javascript, java, csharp, php, bash, yaml, toml)
- Chat supports thinking/reasoning chunks streamed from the model

### Auth

Firebase Auth handles Google sign-in via popup. Auth state consumed via `useAuth()` from `AuthContext`. Guests (no login) can use the app locally; cloud sync is gated on `user.uid`.

## Environment Variables

All prefixed with `VITE_` (required in `.env`, see `.env.example`):

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_*` | Firebase project config (projectId, appId, apiKey, authDomain, firestoreDb, storageBucket, messagingSenderId) |
| `VITE_GEMINI_API_KEY` | Default API key for all AI features |
| `VITE_*_PROVIDER` | Per-feature provider selection (`gemini` or `minimax`) |
| `VITE_*_MODEL` | Per-feature model override |
| `VITE_MINIMAX_API_KEY`, `VITE_MINIMAX_BASE_URL` | Minimax config |
| `VITE_APP_URL` | Application URL |

## Deployment

Deployed on Google Cloud Run via AI Studio. Connect GitHub repo, configure secrets in AI Studio settings, and use AI Studio's Export to GitHub feature for syncing changes.

## Styling

Tailwind CSS v4 with `@tailwindcss/vite` plugin. Global styles in `src/index.css`. Motion animations via `motion/react`. React Markdown rendering via `react-markdown`. Syntax highlighting via `react-syntax-highlighter` + `rehype-highlight`. i18next with `i18next-browser-languagedetector` for auto language detection.

## Dependencies

Key packages:

- `react`, `react-dom` — UI framework (v19)
- `@google/genai` — Gemini AI SDK (v1.29.0)
- `firebase` — Auth + Firestore (v12)
- `idb` — IndexedDB wrapper (v8)
- `motion` — Animations (v12)
- `react-markdown`, `rehype-highlight`, `react-syntax-highlighter` — Markdown and code rendering
- `lucide-react` — Icons
- `date-fns` — Date formatting
- `clsx`, `tailwind-merge` — Class utilities via `cn()`
- `@tanstack/react-virtual` — Virtual scrolling
- `i18next`, `react-i18next` — Internationalization
- `@chenglou/pretext` — Text preprocessing
- `@tailwindcss/vite`, `tailwindcss` — Tailwind CSS v4

## No Test Suite

This project has no test scripts configured. The `lint` script only runs `tsc --noEmit` for type checking.
