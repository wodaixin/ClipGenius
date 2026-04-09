# Clipboard Capture

ClipGenius listens globally for `paste` events on the `window` object and automatically classifies clipboard content into one of six types.

## How It Works

### Paste Event Handling

The `useClipboard` hook (`src/hooks/useClipboard.ts`) attaches a listener to `window` for the `paste` event. Key behaviors:

- **Ignores input fields**: Paste events from `<input>`, `<textarea>`, or `contenteditable` elements are ignored so that normal text editing is unaffected.
- **Ignores hidden tabs**: If `document.hidden` is true (another browser tab is active), the event is ignored.
- **StrictMode debounce**: A 500ms module-level guard prevents double-capture when React StrictMode mounts components twice in development.
- **File reader async**: Images and videos are read as base64 data URIs via `FileReader.readAsDataURL()`, which is asynchronous. The paste event completes before the file is read; the item is added to the store on `reader.onload`.

### Content Type Classification

Type is determined in priority order:

1. **Image** — `file.type.startsWith("image/")`
2. **Video** — `file.type.startsWith("video/")`
3. **FB Video URL** — URL matching `scontent-*.xx.fbcdn.net` or `video*.fbcdn.net` patterns containing `.mp4` → downloaded via CORS proxy and stored as video
4. **URL** — matches `/^https?:\/\/[^\s/$.?#].[^\s]*$/i`
5. **Markdown** — regex `/^#{1,6} |^\*\*|^- \*[^*]+\*|```|\[.+\]\(.+\)|^>\s/m` (headings, bold, lists, code fences, links, blockquotes)
6. **Code** — language detected by `detectCodeLanguage()` heuristic
7. **Text** — fallback for all plain text

### Code Language Detection

The `detectCodeLanguage()` function uses regex rules on the first 200 characters of trimmed text:

| Regex Pattern | Detected Language |
|---|---|
| `^\s*\{[\s\S]*\}\s*$` or `^\s*\[[\s\S]*\]\s*$` | json |
| `<\?xml\|<\/[a-zA-Z]+>` | xml |
| `<!DOCTYPE html\|<html\|<\/div>\|<\/span>` | html |
| `^\s*SELECT\s\|^\s*INSERT\s\|^\s*UPDATE\s\|^\s*CREATE\s` | sql |
| `^def \|^from .+ import\|^async def /m` | python |
| `^func \|^package \|^import \(|:= /` | go |
| `^fn \|^let mut \|^use std::\|^impl \|^pub fn /m` | rust |
| `^#include\|^int main\(\|std::\|cout <` | cpp |
| `^import \|^export \|^const \|^let \|^var \|=>` | typescript |
| `^import \|^export \|^const \|^let \|^var \|=>` | javascript |
| `^public class \|^private \|^protected \|^import java\.` | java |
| `^using System\|^namespace \|^public class` | csharp |
| `^<\?php\|^\$[a-z_]+ =\|echo \|->` | php |
| `^#!\/bin\/bash\|^\$\(\|^if \[\|^fi$\|^echo` | bash |
| `^[a-z-]+:\s*$\|^\s{2,}[a-z-]+:` | yaml |
| `^\[.+\]\s*$\|^[a-z_]+ = /` | toml |
| Fallback: `[{};()=>]` + > 2 lines | `code` |

### Facebook Video Download

When a Facebook CDN URL (e.g. from a Facebook post or live stream) is pasted, ClipGenius attempts to download it as a video:

1. Try direct `fetch()` first (respects system proxy like Clash)
2. If direct fetch fails, fall back to CORS proxy (`VITE_CORS_PROXY_URL`, defaults to `https://corsproxy.io`)
3. If download succeeds: store as `video` type with base64 content
4. If download fails: store as `url` type (the original URL is preserved)

### Storage Format

| Type | Content Format | mimeType |
|---|---|---|
| `image` | Base64 data URI | `image/*` (from file) |
| `video` | Base64 data URI | `video/mp4` |
| `url` | Raw text URL | `text/uri-list` |
| `text` | Raw text | `text/plain` |
| `markdown` | Raw text | `text/plain` |
| `code` | Raw text | `code/{language}` |

## Drag and Drop

Drag-and-drop files onto the Paste Zone is also supported. The `useClipboard` hook exposes `handleDragOver`, `handleDragLeave`, and `handleDrop`, which set the `isDragging` state in `usePasteStore`. File drops are treated the same way as clipboard file captures.
