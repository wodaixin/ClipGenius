# AGENTS.md - ClipGenius Development Guide

## Project Overview

ClipGenius is a professional-grade AI clipboard manager built with React 19 + Vite + TypeScript. It captures clipboard content (images, videos, text, URLs), analyzes it with AI (Gemini, Minimax), and syncs across devices via Firebase. Designed for Google Cloud Run deployment.

## Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build (outputs to dist/)
npm run preview  # Preview production build locally
npm run clean    # Remove dist/ directory
npm run lint     # TypeScript type checking only (tsc --noEmit)
```

**Note:** No test suite is configured. The `lint` script only runs `tsc --noEmit` for type checking.

---

## Code Style Guidelines

### TypeScript

- Use **interfaces** for object shapes, **type** for unions and aliases
- Avoid `any`; use `unknown` when type is truly unknown
- Enable strict mode; all types must be explicit
- Use `import type` for type-only imports

```typescript
// Good
interface PasteItem {
  id: string;
  type: PasteType;
  content: string;
}

// Bad
const handleThing = (data: any) => { ... }
```

### Imports

- Always import React explicitly: `import React from "react"`
- Use path aliases: `@/*` maps to project root (e.g., `@/context/AuthContext`)
- Group imports: external → internal → relative

```typescript
import React, { useState, useCallback } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { PasteItem } from "@/types";
import { cn } from "@/lib/utils";
```

### Components

- **Functional components only** with hooks
- Use **named exports** for components (not default export except for App)
- File name matches component name: `PasteCard.tsx` contains `function PasteCard`
- Props interfaces defined at top of file, prefixed with component name

```typescript
interface PasteCardProps {
  item: PasteItem;
}

export function PasteCard({ item }: PasteCardProps) {
  // ...
}
```

### State Management

- **React Context** for global app state (see `src/context/`)
- Custom hooks (`use*`) for business logic - always prefix with `use`
- Local UI state with `useState`, derived state with `useMemo`
- Callbacks wrapped in `useCallback` when passed as props

```typescript
export function useClipboard() {
  const { user } = useAuth();
  const { addItem } = usePasteStore();

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    // ...
  }, [user, addItem]);

  return { handlePaste };
}
```

### Styling

- **Tailwind CSS v4** with `@tailwindcss/vite` plugin
- Use `cn()` utility from `@/lib/utils` to merge Tailwind classes

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "flex flex-col gap-4",
  isActive && "bg-blue-50",
  className
)} />
```

- Custom theme properties in `src/index.css` under `@theme`
- Use `font-sans`, `font-mono`, `font-serif` from theme (not hardcoded families)
- Use `group` and `group-hover` patterns for nested hover states

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `PasteCard`, `HistoryPane` |
| Hooks | camelCase, prefix `use` | `useClipboard`, `usePasteStore` |
| Variables | camelCase | `isAnalyzing`, `filteredItems` |
| Constants | UPPER_SNAKE | `STORE_PASTES`, `DB_NAME` |
| Types/Interfaces | PascalCase | `PasteItem`, `ChatMessage` |
| CSS classes | kebab-case (Tailwind) | `gap-4`, `text-center` |

### Error Handling

- Always use try/catch for async operations
- Log errors with `console.error` and meaningful context
- Never silently swallow errors; always handle or re-throw

```typescript
try {
  const result = await analyzeContent(item);
  updateItem({ ...item, ...result, isAnalyzing: false });
} catch (error) {
  console.error("AI Analysis failed:", error);
  updateItem({ ...item, isAnalyzing: false });
}
```

### File Organization

```
src/
├── config/          # AI Prompts configuration (prompts.ts, prompts.*.json)
├── components/     # UI components grouped by feature
│   ├── chat/
│   ├── imagegen/
│   ├── layout/
│   └── paste/
├── context/        # React Context providers
├── hooks/          # Custom React hooks
├── i18n/           # Internationalization
├── lib/            # Utilities (db.ts, utils.ts)
├── services/      # External services
│   ├── ai/        # AI providers (gemini, minimax)
│   ├── clipboard/
│   └── sync/
├── types.ts        # Global type definitions
└── App.tsx         # Root component
```

---

## Architecture Overview

### Data Flow

1. **Clipboard capture**: `useClipboard` hook listens for `paste` events on `window`
2. **State management**: `usePasteStore` manages all paste items; state lives in `AppContext`
3. **Persistence**: IndexedDB via `src/lib/db.ts` (using `idb` library)
4. **Cloud sync**: `useFirestoreSync` subscribes to Firestore; cloud wins for metadata
5. **AI analysis**: Triggered automatically for logged-in users when `isAutoAnalyzeEnabled`

### Provider Architecture

All AI features route through configurable providers (set via `VITE_*_PROVIDER` env vars):

| Feature | Default Provider | Default Model |
|---------|------------------|---------------|
| Content analysis | `gemini` | `gemini-3-flash-preview` |
| Chat | `gemini` | `gemini-3.1-pro-preview` |
| Live voice | `gemini` | `gemini-3.1-flash-live-preview` |
| Image generation (standard) | `gemini` | `gemini-2.5-flash-image` |
| Image generation (pro) | `gemini` | `gemini-3-pro-image-preview` |

Provider implementations in `src/services/ai/providers/`. Provider capabilities are defined in `capabilities.ts`:
- **Gemini**: supports text, image, video
- **Minimax**: supports text only (no image/video)

To add a new provider:
1. Create provider file implementing the appropriate interface
2. Register in `index.ts` exports
3. Set `VITE_*_PROVIDER=providername` in environment

### Auth Pattern

- Firebase Auth handles Google sign-in via popup
- Guests (no login) can use the app locally
- Cloud sync is gated on `user.uid`; guests have empty string as userId
- Guest items are NOT synced to cloud

### Firebase Paths

```
/users/{userId}/pastes/{pasteId}
/users/{userId}/chats/{chatId}/messages/{messageId}
```

---

## Environment Variables

All prefixed with `VITE_` (required in `.env`, see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_*` | Firebase project config |
| `VITE_GEMINI_API_KEY` | Default API key for all AI features |
| `VITE_*_PROVIDER` | Per-feature provider selection (`gemini` or `minimax`) |
| `VITE_*_MODEL` | Per-feature model override |
| `VITE_MINIMAX_API_KEY`, `VITE_MINIMAX_BASE_URL` | Minimax config |

---

## Key Conventions for AI Integration

- `GoogleGenAI` instances are created **per-call** (not singleton) to ensure fresh API key reads
- `window.aistudio` global provides `hasSelectedApiKey()`, `openSelectKey()`, `getSelectedApiKey()` for AI Studio paid key integration
- Image generation: standard mode uses env `VITE_GEMINI_API_KEY`; pro mode prompts user to select AI Studio paid key via `window.aistudio`

---

## Adding New Features

1. **New AI feature**: Add provider in `src/services/ai/providers/`, register in `index.ts`
2. **New AI prompt**: Add prompts in `src/config/prompts.en.json` and `src/config/prompts.zh.json`
3. **New component**: Create in appropriate `components/` subdirectory, use named export
4. **New hook**: Create in `hooks/`, prefix with `use`, return object with state and callbacks
5. **New context**: Create in `context/`, follow existing pattern (createContext, Provider, use hook)
6. **New PasteType**: Add to `PasteType` union in `types.ts`
