# AI Prompts

Prompts are centralized in `src/config/prompts.en.json` and `src/config/prompts.zh.json`. The loader in `src/config/prompts.ts` selects the appropriate file based on `i18n.language`.

## Prompt Categories

### 1. Chat (`chat.systemInstruction`)

Used for basic chat interactions without attached context.

**Default (English)**:
```
You are ClipGenius Assistant. Be concise and helpful.
```

### 2. Chat Router (`chatRouter.systemInstruction`)

Used when chatting with a context item (image, video, or text) attached.

**Default (English)**:
```
You are ClipGenius AI, a professional-grade assistant for a clipboard manager. Analyze the attached context carefully and provide accurate, helpful responses. Be concise and precise.
```

### 3. Live Voice (`liveVoice.systemInstruction`)

Used for voice chat sessions.

**Default (English)**:
```
You are ClipGenius Voice Assistant. Be concise and helpful.
```

### 4. Content Analysis (`analyze.*`)

| Key | Purpose | Template Variables |
|---|---|---|
| `analyze.image` | Analyze images | — |
| `analyze.video` | Analyze videos | — |
| `analyze.url` | Analyze URLs | `{{content}}` |
| `analyze.text` | Analyze text | `{{content}}` |
| `analyze.langSuffix` | Language instruction appended to all analysis prompts | — |

## Customizing Prompts

1. Open `src/config/prompts.en.json` (English) or `src/config/prompts.zh.json` (Chinese)
2. Modify the prompt values
3. Reload the page — changes take effect immediately (no build required)

**Important**: Keep prompts concise. Include a language instruction in `langSuffix` (e.g., `"Respond in English."`) to ensure consistent output language.

## JSON Format Rules

- Use double quotes only
- No trailing commas
- Valid JSON (use a validator before saving)
- Template variables use `{{variableName}}` syntax and are replaced by `fillTemplate()` in `prompts.ts`

## Examples

### Custom Analysis Prompt for URLs

```json
{
  "analyze": {
    "url": "Analyze the following URL and provide: 1) A brief description of the page content, 2) A suggested filename, 3) Key topics covered. URL: {{content}}",
    "langSuffix": "Respond in English. Output valid JSON."
  }
}
```

### Custom Chat System Instruction

```json
{
  "chat": {
    "systemInstruction": "You are a technical programming assistant. Provide accurate, well-reasoned answers with code examples when relevant."
  }
}
```
