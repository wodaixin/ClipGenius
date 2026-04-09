# Contributing

## Code Style

- **TypeScript**: Strict mode enabled. No `any`. Explicit types on all function signatures.
- **React**: Functional components only. Named exports. `use` prefix for hooks.
- **Imports**: Organize as: external packages → internal packages → relative paths.
- **Styling**: Tailwind CSS v4 utilities. Use `cn()` from `src/lib/utils.ts` to merge conditional classes.
- **Error handling**: Always handle or re-throw. Never silently swallow errors. Use `console.error` with context.
- **File organization**: `src/config`, `src/components`, `src/context`, `src/hooks`, `src/lib`, `src/services`, `src/types.ts`, `App.tsx`.

## Git Workflow

### Branch Naming

```
feature/xyz-description
bugfix/xyz-description
docs/xyz-description
```

### Commit Messages

Follow conventional commits:

```
feat: add audio paste type support
fix: prevent duplicate analysis on StrictMode remount
docs: add AI chat guide
chore: update Gemini SDK to v1.30.0
refactor: extract sync logic into syncEngine
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.

### Pull Requests

1. Create a feature branch from `main`
2. Make changes with clear, atomic commits
3. Run `npm run lint` — must pass with no errors
4. Open a PR with a clear description of what changed and why
5. At least one approval required before merging
6. Squash and merge to `main`

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # TypeScript type check only
npm run preview  # Preview production build
npm run clean    # Remove dist/
```

## Adding New Features

- New AI feature: implement provider in `src/services/ai/providers/`, register in the router
- New component: create in `src/components/` with named export
- New hook: add in `src/hooks/` with `use` prefix
- New context: add in `src/context/` with Provider pattern
- New PasteType: update `src/types.ts` PasteType union and all affected files
- New translations: add to both `src/i18n/locales/en.json` and `zh.json`
