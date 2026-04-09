# Data Flow

## End-to-End Path: Clipboard → Store → Sync → AI → UI

```
Clipboard Event (Cmd/Ctrl+V)
    │
    ▼
useClipboard.handlePaste()
    │
    ├─ [files] ── FileReader.readAsDataURL() ──► base64 content
    │
    └─ [text] ── type classification ──► PasteType
            │
            ▼
        PasteItem (id, type, content, suggestedName, isAnalyzing, ...)
            │
     ┌──────┴──────┐
     │             │
     ▼             ▼
usePasteStore    useFirestoreSync
.addItem()       (onSnapshot)
     │             │
     ▼             ▼
savePaste()      handleCloudChange()
(IndexedDB)      (syncRev comparison)
     │             │
     │   ┌─────────┘
     │   │
     ▼   ▼
AppContext.items (React state)
     │
     ▼
AppContext auto-analyze useEffect
(isAnalyzing === true detected)
     │
     ▼
analyzeContent(item) ──► getAnalysisProvider()
     │                        │
     │              ┌─────────┼─────────┐
     │              ▼         ▼         ▼
     │           Gemini   Minimax   (future)
     │              │         │
     │              ▼         ▼
     │         { suggestedName, summary }
     │              │
     ▼              ▼
updateItem({ ...item, suggestedName, summary, isAnalyzing: false })
     │
     ├─► savePaste() ──► IndexedDB
     │
     └─► syncEngine.writeWithSync() ──► Firestore
```

## Key Observations

- **UI never waits for the network**: IndexedDB writes are synchronous in the async call chain, meaning the UI updates before Firestore is contacted.
- **AI analysis is decoupled**: The auto-analyze `useEffect` runs as a side effect of the items array changing, not as part of `addItem`. This means `addItem` completes immediately and analysis runs in the background.
- **`GoogleGenAI` instances are fresh**: Created per-call in `analyzeContent`, `generateImage`, and `startLiveSession`, ensuring runtime API key changes in Settings are always picked up.
