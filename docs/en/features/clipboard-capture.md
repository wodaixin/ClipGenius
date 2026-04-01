# Clipboard Capture

ClipGenius intercepts clipboard paste events system-wide within the app, classifying content into one of six types: image, video, URL, markdown, code, or text.

---

## Overview

The `useClipboard` hook in `src/hooks/useClipboard.ts` attaches a `paste` event listener to `window`. When a paste event fires:

1. `e.preventDefault()` suppresses the default browser behavior
2. Content is extracted from the clipboard data
3. The content is classified into one of six types
4. A `PasteItem` is created and saved to IndexedDB

---

## File-Based Content

When `clipboardData.files.length > 0`, each file is processed via `FileReader.readAsDataURL()`:

```typescript
const reader = new FileReader();
reader.onload = async (event) => {
  const base64 = event.target?.result as string;
  const type = file.type.startsWith("video/") ? "video" : "image";
  
  // Videos from clipboard may be truncated — skip if base64 is too short
  if (type === "video" && base64.length < 1024) return;
  
  // Create PasteItem with base64 content
  const item: PasteItem = {
    id: crypto.randomUUID(),
    type,
    content: base64,
    mimeType: file.type,
    timestamp: new Date(),
    suggestedName: generateName(type),
    isAnalyzing: true,
    isPinned: false,
    userId: currentUser?.uid ?? "",
  };
  
  await savePaste(item);
};
reader.readAsDataURL(file);
```

Only `image/*` and `video/*` MIME types are processed. Images and videos are stored as base64 data URIs.

---

## Text-Based Classification

When no files are present, `getData("text/plain")` retrieves the text content. Classification happens in priority order:

1. **URL** — matches `/^https?:\/\/[^\s/$.?#].[^\s]*$/i`
2. **Markdown** — contains `#`, `**`, `-`, `*`, triple backticks, `[text](url)`, or `>` at line start
3. **Code** — matched against language-specific patterns (see table below)
4. **Text** — fallback for plain text

---

## Language Detection Patterns

The `detectCodeLanguage()` function applies these regex rules in priority order:

| Pattern | Language |
|---------|----------|
| `/^\s*\{[\s\S]*\}\s*$\|^\s*\[[\s\S]*\]\s*$/` | json |
| `/<\?xml\|<\/[a-zA-Z]+>/` | xml |
| `/<!DOCTYPE html\|<html\|<\/div>\|<\/span>/` | html |
| `/^\s*SELECT\s\|^\s*INSERT\s\|^\s*UPDATE\s\|^\s*CREATE\s/im` | sql |
| `/^def \|^from .+ import\|^async def /m` | python |
| `/^func \|^package \|^import \(\|:= /` | go |
| `/^fn \|^let mut \|^use std::\|^impl \|^pub fn /m` | rust |
| `/^#include\|^int main\(\)\|std::\|cout <</` | cpp |
| `/^import \|^export \|^const \|^let \|^var \|\.tsx?$\|=>` | typescript |
| `/^import \|^export \|^const \|^let \|^var \|=>/` | javascript |
| `/^public class \|^private \|^protected \|^import java\./m` | java |
| `/^using System\|^namespace \|^public class /m` | csharp |
| `/^<\?php\|^\$[a-z_]+ =\|echo \||->/` | php |
| `/^#!\/bin\/bash\|^\$\(\|^if \[\|^fi$\|^echo /m` | bash |
| `/^[a-z-]+:\s*$\|^\s{2,}[a-z-]+:/m` | yaml |
| `/^\[.+\]\s*$\|^[a-z_]+ = /m` | toml |

**Fallback:** If the text has 3+ lines containing 4+ of the characters `{}[;()=>]`, it is classified as generic `code` without a language prefix.

---

## Naming Convention

Each paste gets a timestamp-based suggested name in the format `prefix_YYYYMMDD_HHMMSS`:

| Type | Prefix | Example |
|------|--------|---------|
| Image | `img` | `img_20260402_143052` |
| Video | `vid` | `vid_20260402_143052` |
| URL | `link` | `link_20260402_143052` |
| Markdown | `doc` | `doc_20260402_143052` |
| Code | `<lang>_snippet` | `python_snippet_20260402_143052` |
| Text | `note` | `note_20260402_143052` |

---

## StrictMode Debounce

A module-level `lastPasteTime` variable ignores paste events within 500ms:

```typescript
let lastPasteTime = 0;

window.addEventListener("paste", (e: ClipboardEvent) => {
  const now = Date.now();
  if (now - lastPasteTime < 500) return;
  lastPasteTime = now;
  
  // ... process paste
});
```

This prevents double-capture caused by React StrictMode's double-mount behavior in development.

---

## Persistence

Every new item is immediately saved to IndexedDB via `savePaste()`:

```typescript
const item = createPasteItem(content, type);
await savePaste(item);  // Synchronous write to IndexedDB
```

If the user is authenticated, `syncPasteToCloud()` fires asynchronously in the background. The local write operation completes immediately without waiting for the cloud sync to finish.

---

## Related

- [AI Analysis](ai-analysis.md) — Automatic content analysis after capture
- [Sync Modes](../features/sync-modes.md) — Understanding cloud sync behavior
