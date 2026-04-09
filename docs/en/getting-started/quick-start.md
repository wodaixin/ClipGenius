# Quick Start

Make your first capture in under 5 minutes.

## Step 1: Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the Paste Zone.

## Step 2: Capture Content

Press `Cmd/Ctrl+V` anywhere outside input fields to capture what is on your clipboard. ClipGenius will automatically classify the content type:

| You copy... | ClipGenius classifies it as... |
|---|---|
| An image from a browser | `image` |
| A video from Facebook | `video` |
| A web URL | `url` |
| Markdown text | `markdown` |
| Source code | `code` |
| Plain text | `text` |

## Step 3: Sign In (Optional)

Click **Login with Google** to enable cloud sync. Your clipboard history will be backed up to Firebase and available across devices.

- Guest mode works fully offline without login
- Cloud sync requires a Google account

## Step 4: Explore Features

### Preview and Edit

Click any card in the History Pane to preview it. Double-click the name or summary to edit inline.

### Search

Use the search bar at the top of the History Pane to find items by name, summary, or content. Fuzzy search is supported.

### Pin Items

Click the pin icon on any card to pin it. Pinned items appear at the top and survive **Clear Unpinned**.

### AI Chat

Click the chat icon on any card to open AI Chat with that item as context. Ask questions about the content.

### AI Image Generation

Click **Generate Image** to open the image generation modal. Describe what you want to generate.

### Settings

Click the settings icon in the Paste Zone header to configure:
- Firebase credentials
- AI provider selection (Gemini / Minimax)
- Per-content-type AI routing
- API keys and model overrides

## Next Steps

- [Firebase Setup](./firebase-setup.md) — Full Firebase configuration including security rules
- [AI Analysis Guide](../guides/ai-analysis.md) — How auto-analyze works
- [AI Chat Guide](../guides/chat.md) — Chat with your clipboard content
