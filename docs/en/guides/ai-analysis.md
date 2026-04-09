# AI Analysis

When auto-analyze is enabled, ClipGenius sends each captured clipboard item to an AI provider to generate a **suggested filename** and **content summary**.

## How Auto-Analyze Works

The analysis flow is centralized in `AppContext` (`src/context/AppContext.tsx`):

```
Paste item captured (isAnalyzing = true)
    ↓
AppContext auto-analyze effect detects isAnalyzing = true
    ↓
analyzeContent(item) called → routed to correct provider
    ↓
Provider returns { suggestedName, summary }
    ↓
updateItem({ ...item, suggestedName, summary, isAnalyzing: false })
    ↓
Result saved to IndexedDB + synced to Firestore
```

The `AppContext` uses a `ref`-based deduplication map (`analysisPromises.current`) to prevent duplicate analysis calls if the same item ID appears in the items array multiple times (e.g. due to StrictMode re-renders).

## Provider Routing

Analysis is routed to a provider based on the item's content type and the per-type routing settings. See [Provider Model](../architecture/provider-model.md) for the full routing table.

Default routing (from `src/lib/settings.ts`):

| Content Type | Default Provider |
|---|---|
| `image` | Gemini |
| `text` | Minimax |
| `url` | Gemini |
| `video` | Gemini |
| `markdown` | Minimax |
| `code` | Minimax |

The in-app Settings UI allows per-type provider overrides, stored in `localStorage["clipgenius_settings"].analysisProvidersByType`.

## Response Format

The AI is instructed to return a JSON object:

```json
{
  "suggestedName": "project_notes_20260409",
  "summary": "Meeting notes from Q2 planning session covering roadmap priorities..."
}
```

Gemini uses `responseMimeType: "application/json"` for structured output. Minimax uses prompt engineering with 3-pass JSON parsing (direct parse → strip code fences → greedy match).

## Error Handling

- If analysis **succeeds**: `isAnalyzing` is set to `false`, `suggestedName` and `summary` are saved.
- If analysis **fails**: `isAnalyzing` is set to `false`, the item remains in the store with its original `suggestedName` (the timestamp-based default). No error is silently discarded; all failures are logged to the console.
- **No retries**: A failed analysis is not automatically retried. Users can manually re-trigger via the "Re-analyze" button on the card.

## Manual Re-analysis

Click the **Re-analyze** button on any PasteCard to re-run analysis on that item. This sets `isAnalyzing: true` again, triggering the auto-analyze effect.

## Settings

The auto-analyze toggle in the Paste Zone header controls whether new items are analyzed on capture. When disabled, items are saved with `isAnalyzing: false` and no AI call is made. The toggle state is stored in `localStorage["autoAnalyze"]`.
