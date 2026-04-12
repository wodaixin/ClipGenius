# Project Structure

## Top-Level Files

```
/
├── src/                      # All source code
├── docs/                     # Documentation (en/ and zh/)
├── public/                   # Static assets
├── .env.example              # Environment variable template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── Dockerfile
```

## `src/` Directory

```
src/
├── App.tsx                     # Thin composition: provider wrappers + AppContent
├── main.tsx                   # React 19 createRoot, StrictMode, i18n
├── types.ts                   # Core types: PasteItem, ChatMessage, PasteType, etc.
├── vite-env.d.ts
├── index.css                  # Tailwind v4 imports, global styles, scrollbar
│
├── config/                    # AI prompt configuration
│   ├── prompts.ts             # Prompt loader (selects en/zh based on i18n.language)
│   ├── prompts.en.json
│   ├── prompts.zh.json
│   └── README.md
│
├── context/                   # React Context providers
│   ├── AppContext.tsx          # Items, image gen, auto-analyze
│   └── ChatContext.tsx        # Chat state, streaming, live voice
│
├── hooks/                     # Custom hooks
│   ├── useClipboard.ts        # paste listener + type detection
│   ├── usePasteStore.ts       # CRUD, search
│   └── useImageGen.ts        # Image gen state re-export from AppContext
│
├── components/
│   ├── layout/
│   │   ├── PasteZone.tsx      # Left panel: drop zone, header, feature buttons
│   │   ├── HistoryPane.tsx   # Right panel: virtualized item list
│   │   └── SettingsModal.tsx  # Advanced settings form
│   ├── paste/
│   │   ├── PasteCard.tsx      # Individual item card with actions
│   │   └── PastePreview.tsx   # Full content preview modal
│   ├── chat/
│   │   ├── ChatModal.tsx     # AI chat modal with streaming
│   │   └── ChatContextItem.tsx # Inline context preview in chat
│   └── imagegen/
│       └── ImageGenModal.tsx  # Text-to-image generation UI
│
├── services/
│   ├── ai/
│   │   ├── analyzeContent.ts  # Analysis entry point (routes to provider)
│   │   ├── generateImage.ts   # Image generation
│   │   ├── startLiveSession.ts # Gemini Live voice session
│   │   └── providers/
│   │       ├── index.ts      # Provider registry and router
│   │       ├── types.ts      # AnalysisProvider, ChatProvider interfaces
│   │       ├── capabilities.ts # Provider capability definitions
│   │       ├── gemini.ts     # Gemini content analysis
│   │       ├── gemini-chat.ts # Gemini streaming chat + thinking
│   │       ├── minimax.ts   # Minimax content analysis
│   │       └── minimax-chat.ts # Minimax streaming chat
│   └── clipboard/
│       └── clipboardUtils.ts # copyItemToClipboard, downloadItem
│
├── lib/                       # Core utilities
│   ├── db.ts                 # IndexedDB via idb (paste + chat persistence)
│   ├── utils.ts              # cn() utility
│   ├── settings.ts           # localStorage settings management
│   ├── tabSync.ts           # BroadcastChannel + storage event cross-tab sync (local edit protection)
│   └── estimateCardHeight.ts # Virtual list item height estimation
│
└── i18n/
    ├── index.ts              # i18next configuration
    └── locales/
        ├── en.json          # English UI strings
        └── zh.json          # Chinese UI strings
```

## Naming Conventions

| Category | Convention | Example |
|---|---|---|
| Components | PascalCase, named export | `PasteCard.tsx` → `export function PasteCard` |
| Hooks | camelCase, `use` prefix | `useClipboard.ts` → `export function useClipboard` |
| Context | PascalCase, `Context` suffix | `AuthContext.tsx` → `AuthContext` |
| Services | camelCase, descriptive | `analyzeContent.ts` |
| Providers | camelCase, `Provider` suffix | `geminiAnalysisProvider` |
| Types/Interfaces | PascalCase | `interface PasteItem` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES`, `RETRY_DELAYS` |
| CSS/Tailwind | Tailwind utility classes | `className="flex items-center"` |
