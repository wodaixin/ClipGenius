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
- **Clipboard capture**: Listens for `paste` events on `window` — detects images, videos, text, and URLs
- **Local-first**: All data persists immediately to IndexedDB via `src/lib/db.ts` (using `idb`)
- **Cloud sync**: Firebase Firestore stores user data under `/users/{userId}/pastes/` and `/users/{userId}/chats/`
- **AI analysis**: `GoogleGenAI` from `@google/genai` generates suggested names and summaries; initialized inside functions (not at module level) to pick up the latest API key

### Key Modules
- **`src/App.tsx`** — Single-file application containing all UI, state, and business logic (~1600 lines)
- **`src/firebase.ts`** — Firebase Auth + Firestore initialization and exports
- **`src/lib/db.ts`** — IndexedDB wrapper using `idb` for local persistence
- **`src/lib/utils.ts`** — `cn()` utility (clsx + tailwind-merge)
- **`src/types.ts`** — TypeScript interfaces (`PasteItem`, `ChatMessage`)

### Data Models
```typescript
PasteItem: { id, type, content, mimeType, timestamp, suggestedName, summary?, isAnalyzing, isPinned?, userId }
ChatMessage: { id, role, text, timestamp }
```

Firestore paths: `/users/{userId}/pastes/{pasteId}`, `/users/{userId}/chats/{chatId}/messages/{messageId}`

### AI Integration
- Package: `@google/genai` (v1.29.0)
- Used for: clipboard naming/summarization, chatbot responses, image generation, live voice sessions
- The `window.aistudio` global is used for AI Studio API key integration
- `GoogleGenAI` instances are created per-call (not singleton) to ensure fresh API key reads

## Environment Variables

Required in `.env` (see `.env.example`):
- `GEMINI_API_KEY` — Google Gemini API key
- `APP_URL` — Application URL (auto-injected by AI Studio)

## Deployment

Deployed on Google Cloud Run via AI Studio. Connect GitHub repo, configure secrets in AI Studio settings, and use AI Studio's Export to GitHub feature for syncing changes.

## Styling

Tailwind CSS v4 with `@tailwindcss/vite` plugin. Global styles in `src/index.css`. Motion animations via `motion/react`.

## No Test Suite

This project has no test scripts configured. The `lint` script only runs `tsc --noEmit` for type checking.
