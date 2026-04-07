# AI Prompts Configuration

ClipGenius uses centralized AI prompt templates for all AI features. Prompts are separated by language and loaded based on the current UI language.

---

## File Structure

```
src/config/
├── prompts.ts          # Prompt loader and utilities
├── prompts.en.json     # English prompts
└── prompts.zh.json     # Chinese prompts
```

The `prompts.ts` module provides `getPrompts(language)` to load the appropriate prompts and `fillTemplate()` for template variable substitution.

---

## Available Prompt Categories

### 1. Chat System Instructions (`chat.systemInstruction`)

Used for basic chat interactions without context.

**Default:** "You are ClipGenius Assistant. Be concise and helpful."

### 2. Chat Router System Instructions (`chatRouter.systemInstruction`)

Used when chatting with attached context (image, video, or text).

**Default:** "You are ClipGenius AI, a professional-grade assistant for a clipboard manager..."

### 3. Live Voice System Instructions (`liveVoice.systemInstruction`)

Used for voice chat sessions.

**Default:** "You are ClipGenius Voice Assistant. Be concise and helpful."

### 4. Content Analysis Prompts (`analyze.*`)

Used when AI analyzes clipboard content:

| Key | Description |
|---|---|
| `analyze.image` | Prompt for analyzing images |
| `analyze.video` | Prompt for analyzing videos |
| `analyze.url` | Prompt for analyzing URLs (supports `{{content}}` template) |
| `analyze.text` | Prompt for analyzing text (supports `{{content}}` template) |
| `analyze.langSuffix` | Language instruction appended to all analysis prompts |

---

## Customizing Prompts

### Step 1: Edit the JSON file

For English prompts, edit `src/config/prompts.en.json`:

```json
{
  "chat": {
    "systemInstruction": "You are a helpful AI assistant specialized in clipboard management."
  },
  "chatRouter": {
    "systemInstruction": "You are ClipGenius AI. Always analyze the attached context carefully."
  },
  "liveVoice": {
    "systemInstruction": "You are a voice assistant. Be brief and clear."
  },
  "analyze": {
    "image": "Describe this image and suggest a filename...",
    "video": "Describe this video and suggest a filename...",
    "url": "Analyze this URL: {{content}}...",
    "text": "Analyze this text: \"{{content}}\"...",
    "langSuffix": "Respond in English."
  }
}
```

For Chinese prompts, edit `src/config/prompts.zh.json`.

### Step 2: Reload the page

Changes take effect immediately after page reload.

---

## Template Variables

Some prompts support template variables using `{{variableName}}` syntax:

| Variable | Supported Prompts |
|---|---|
| `{{content}}` | `analyze.url`, `analyze.text` |

The `fillTemplate()` function in `prompts.ts` automatically replaces these variables.

---

## Language Switching

Prompts are loaded based on `i18n.language`:
- English UI → `prompts.en.json`
- Chinese UI → `prompts.zh.json`

When you switch the UI language, AI responses will also be in that language because `langSuffix` is appended to analysis prompts.

---

## Best Practices

1. **Keep prompts concise** — Shorter prompts often produce better results
2. **Include language instructions** — Always set `langSuffix` appropriately for consistent responses
3. **Valid JSON** — Use double quotes, no trailing commas
4. **Test after changes** — Reload the page and test the AI feature

---

## Related

- [Internationalization Guide](i18n-guide.md) — UI translation system
