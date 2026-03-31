# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClipGenius is a professional-grade AI clipboard manager built with React + Vite. It captures clipboard content (images, videos, text, URLs), analyzes it with Gemini AI, and syncs across devices via Firebase. Designed for Google Cloud Run deployment via AI Studio.

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

- **Clipboard capture**: `useClipboard` hook listens for `paste` events on `window` — detects images, videos, text, and URLs
- **Paste handling**: `usePasteStore` manages all paste items with Zustand-like state; persisted to IndexedDB via `src/lib/db.ts` (using `idb`)
- **Cloud sync**: `useFirestoreSync` syncs local IndexedDB to Firebase Firestore under `/users/{userId}/pastes/` and `/users/{userId}/chats/`
- **AI analysis**: `GoogleGenAI` from `@google/genai` generates suggested names, summaries, chat responses, and images; initialized inside functions (not at module level) to pick up the latest API key

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
| `src/lib/` | `db.ts`, `utils.ts` | IndexedDB wrapper, `cn()` utility |

### Data Models

```typescript
PasteItem: { id, type, mimeType, content, timestamp, suggestedName, summary?, isAnalyzing, isPinned?, userId }
ChatMessage: { id, role, text, thinking?, timestamp, attachments? }
StoredAttachment: { id, type, content, mimeType, suggestedName }
```

Firestore paths: `/users/{userId}/pastes/{pasteId}`, `/users/{userId}/chats/{chatId}/messages/{messageId}`

### AI Integration

- Package: `@google/genai` (v1.29.0)
- Used for: clipboard naming/summarization (`analyzeContent`), chatbot responses (`ChatContext`), image generation (`useImageGen`), live voice sessions (`startLiveSession`)
- AI providers: `gemini` (primary), `minimax` (alternative), selectable via `chat-router`
- The `window.aistudio` global is used for AI Studio API key integration
- `GoogleGenAI` instances are created per-call (not singleton) to ensure fresh API key reads

### Auth

Firebase Auth handles Google sign-in. Auth state is consumed via `useAuth()` from `AuthContext`.

## Environment Variables

Required in `.env` (see `.env.example`):

- `GEMINI_API_KEY` — Google Gemini API key
- `APP_URL` — Application URL (auto-injected by AI Studio)

## Deployment

Deployed on Google Cloud Run via AI Studio. Connect GitHub repo, configure secrets in AI Studio settings, and use AI Studio's Export to GitHub feature for syncing changes.

## Styling

Tailwind CSS v4 with `@tailwindcss/vite` plugin. Global styles in `src/index.css`. Motion animations via `motion/react`. React Markdown rendering via `react-markdown`.

## Dependencies

Key packages:

- `react`, `react-dom` — UI framework
- `@google/genai` — Gemini AI SDK
- `firebase` — Auth + Firestore
- `idb` — IndexedDB wrapper
- `motion/react` — Animations
- `react-markdown` — Markdown rendering
- `lucide-react` — Icons
- `date-fns` — Date formatting
- `clsx`, `tailwind-merge` — Class utilities via `cn()`
- `@tailwindcss/vite` — Tailwind CSS v4 integration

## No Test Suite

This project has no test scripts configured. The `lint` script only runs `tsc --noEmit` for type checking.
