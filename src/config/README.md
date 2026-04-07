# AI Prompts Configuration

This directory contains centralized AI prompt templates for ClipGenius.

## File Structure

- `prompts.ts` - Prompt loader and utilities
- `prompts.en.json` - English prompts
- `prompts.zh.json` - Chinese prompts

## Customizing Prompts

All AI prompts are defined in JSON files, separated by language.

### Available Prompt Categories

1. **Chat System Instructions** (`chat.systemInstruction`)
   - Used for basic chat interactions
   - Default: "You are ClipGenius Assistant. Be concise and helpful."

2. **Chat Router System Instructions** (`chatRouter.systemInstruction`)
   - Used when chatting with context (image, video, or text)
   - Default: "You are ClipGenius AI, a professional-grade assistant for a clipboard manager..."

3. **Live Voice System Instructions** (`liveVoice.systemInstruction`)
   - Used for voice chat sessions
   - Default: "You are ClipGenius Voice Assistant. Be concise and helpful."

4. **Content Analysis Prompts** (`analyze.*`)
   - `image` - Prompt for analyzing images
   - `video` - Prompt for analyzing videos
   - `url` - Prompt for analyzing URLs (supports `{{content}}` template variable)
   - `text` - Prompt for analyzing text (supports `{{content}}` template variable)
   - `langSuffix` - Language instruction appended to all analysis prompts

### How to Customize

1. Open `src/config/prompts.en.json` (English) or `src/config/prompts.zh.json` (Chinese)
2. Modify the prompts in the JSON file
3. Save the file - changes will take effect immediately after page reload

### Template Variables

Some prompts support template variables using `{{variableName}}` syntax:

- `analyze.url` and `analyze.text` support `{{content}}` variable
- The `fillTemplate()` function automatically replaces these variables

### Example

Edit `prompts.en.json`:

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

## Notes

- Prompts are loaded based on the current UI language (`i18n.language`)
- Changes require a page reload to take effect
- Keep prompts concise for better AI performance
- Always include language instructions in `langSuffix` to ensure consistent responses
- JSON files must be valid JSON format (use double quotes, no trailing commas)
