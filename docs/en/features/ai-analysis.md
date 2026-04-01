# AI Content Analysis

ClipGenius uses Gemini AI to automatically generate a suggested filename and one-sentence summary for each captured paste item. This helps organize clipboard history without manual effort.

---

## Overview

Content analysis runs automatically when:
- The user is authenticated
- Auto-analyze is enabled in settings
- The item has `isAnalyzing === true` and no existing `summary`

Analysis is performed by `analyzeContent()` in `src/services/ai/analyzeContent.ts`, which delegates to configurable providers via `getAnalysisProvider()`.

---

## Trigger Conditions

Analysis is dispatched only when all three conditions are true:

1. `user !== null` — User is authenticated
2. `isAutoAnalyzeEnabled === true` — Auto-analyze is enabled in app settings
3. `item.isAnalyzing === true && !item.summary` — Item needs analysis

---

## Auto-Analyze Loop

`usePasteStore` in `src/hooks/usePasteStore.ts` watches the `items` array via a `useEffect`. Items matching the trigger conditions are processed through an `analyzingRef` Set that prevents concurrent analysis of the same item:

```typescript
const analyzingRef = useRef<Set<string>>(new Set());

useEffect(() => {
  if (!user) return;
  
  const toAnalyze = items.filter(
    (item) => item.isAnalyzing && !analyzingRef.current.has(item.id)
  );
  
  toAnalyze.forEach((item) => {
    analyzingRef.current.add(item.id);
    
    analyzeContent(item)
      .then((result) => updateItem({ ...item, ...result, isAnalyzing: false }))
      .catch(() => updateItem({ ...item, isAnalyzing: false }))
      .finally(() => analyzingRef.current.delete(item.id));
  });
}, [items, user, updateItem]);
```

---

## Login Catch-Up

A `prevUserRef` detects the first login event and retroactively analyzes items captured before login that lack a summary:

```typescript
const prevUserRef = useRef(user);

useEffect(() => {
  // Only trigger on first login, not on re-renders
  if (!user || prevUserRef.current) return;
  prevUserRef.current = user;
  
  if (!isAutoAnalyzeEnabled) return;
  
  const toAnalyze = items.filter(
    (item) => !item.summary && !analyzingRef.current.has(item.id)
  );
  
  // Dispatch analysis for historical items
  toAnalyze.forEach((item) => {
    analyzingRef.current.add(item.id);
    analyzeContent(item)
      .then((result) => updateItem({ ...item, ...result, isAnalyzing: false }))
      .catch(() => updateItem({ ...item, isAnalyzing: false }))
      .finally(() => analyzingRef.current.delete(item.id));
  });
}, [user, items, isAutoAnalyzeEnabled, updateItem]);
```

This ensures that items captured while logged out are analyzed immediately upon login.

---

## Provider Routing

`analyzeContent()` delegates to the active provider via `getAnalysisProvider()`:

```typescript
const provider = getAnalysisProvider("analysis");
const result = await provider.analyze(item);
```

The provider is selected by `VITE_ANALYSIS_PROVIDER` environment variable (`"gemini"` or `"minimax"`). Each provider implements the `AnalysisProvider` interface:

```typescript
interface AnalysisProvider {
  analyze(item: PasteItem): Promise<{
    suggestedName: string;
    summary: string;
  }>;
}
```

---

## Prompt Templates

Each paste type has a dedicated i18n prompt defined in `src/i18n/locales/en.json`:

| Type | i18n Key | Prompt Purpose |
|------|----------|----------------|
| image | `analyze.prompt.image` | Analyze image content, suggest descriptive filename, provide 1-sentence summary |
| video | `analyze.prompt.video` | Analyze video content, suggest descriptive filename, provide 1-sentence summary |
| url | `analyze.prompt.url` | Analyze URL and suggest filename based on site content |
| text | `analyze.prompt.text` | Analyze text content, suggest descriptive filename, provide 1-sentence summary |
| markdown | `analyze.prompt.text` | Analyze markdown content |
| code | `analyze.prompt.code` | Analyze code and suggest filename with appropriate extension |

A language suffix is appended based on UI locale:
- English UI: `"Respond in English."`
- Chinese UI: `"请用中文回复。"`

---

## Result Merging

`analyzeContent()` returns `{ suggestedName, summary }`. The `updateItem()` call merges these fields:

```typescript
updateItem({
  ...item,
  suggestedName: result.suggestedName,
  summary: result.summary,
  isAnalyzing: false,
});
```

The update persists to both stores:
- **IndexedDB** — Synchronous, immediate local persistence
- **Firestore** — Asynchronous, cloud sync in background

---

## Related

- [Clipboard Capture](clipboard-capture.md) — How paste items are created
- [Sync Modes](sync-modes.md) — How results sync to Firestore
