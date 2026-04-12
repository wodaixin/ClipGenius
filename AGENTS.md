Project Overview
ClipGenius is a professional-grade AI clipboard manager built with React 19 + Vite + TypeScript. It captures clipboard content (images, videos, text, URLs), analyzes it with AI (Gemini, Minimax). All data stored locally via IndexedDB. Designed for local-first usage.

Commands
- npm run dev: Start dev server
- npm run build: Production build (dist/)
- npm run preview: Preview production build locally
- npm run clean: Remove dist/ directory
- npm run lint: TypeScript type checking only (tsc --noEmit)

Code Style Guidelines
- TypeScript conventions
  - Use interfaces for object shapes; use type for unions and aliases
  - Avoid any; use unknown when truly unknown
  - Enable strict mode; all types explicit
- Imports
  - Always import React explicitly
  - Organize imports: external → internal → relative
- Components
  - Functional components only; named exports
  - File name matches component name
- State management
  - React Context for global app state
  - Custom hooks prefixed with use
  - Local state with useState; derived state with useMemo; callbacks with useCallback
- Styling
  - Tailwind CSS v4 with @tailwindcss/vite
  - Use cn() utility
- Naming conventions
  - Table with conventions of types, components, constants, etc.

- Error Handling
  - Use try/catch; log errors with console.error and context
  - Never swallow errors silently; handle or rethrow
- File Organization
  - src/config, src/components, src/context, src/hooks, src/lib, src/services, src/styles, src/types.ts, App.tsx

Architecture Overview
- Data flow
  - Clipboard capture → App context/state → IndexedDB persistence → AI analysis
- Provider Architecture
  - Gemini default; Minimax alternative; per-feature routing via VITE provider settings
  - Capability table listing features and supported models

Environment Variables
- VITE_GEMINI_API_KEY or VITE_MINIMAX_API_KEY: AI service keys
- VITE_<FEATURE>_PROVIDER: Select provider for a feature (gemini or minimax)
- VITE_<FEATURE>_MODEL: Optional model override
- Other VITE_ variables for provider configuration

Key Conventions for AI Integration
- GoogleGenAI instances created per call
- window.aistudio integration for paid keys
- Image generation behavior depends on provider and model

Adding New Features
- New AI feature: place provider logic in src/services/ai/providers/; register in index.ts
- New AI prompts: add to src/config/prompts.en.json and prompts.zh.json
- New component: create in src/components/, exported by name
- New hook: add in src/hooks/ with use prefix
- New context: add in src/context/ with Provider pattern
- PasteType changes: update union in src/types.ts
