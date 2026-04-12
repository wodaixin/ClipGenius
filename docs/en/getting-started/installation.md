# Installation

## 1. Clone and Install

```bash
git clone <repo-url>
cd ClipGenius
npm install
```

## 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with the following values. See the [Environment Variables Reference](../reference/env-variables.md) for where to get each key.

### Required for All Users

```env
# Gemini API Key (get from https://aistudio.google.com/app/apikey)
VITE_GEMINI_API_KEY="your-gemini-api-key"

# App URL
VITE_APP_URL="http://localhost:3000"
```

### Optional: Minimax (Alternative AI Provider)

```env
VITE_MINIMAX_API_KEY=""
VITE_MINIMAX_BASE_URL="https://api.minimaxi.com/anthropic"
```

### Optional: Per-Feature Provider Overrides

```env
# Leave empty to use defaults (Gemini for all features)
VITE_ANALYSIS_PROVIDER=""
VITE_ANALYSIS_MODEL=""
VITE_CHAT_PROVIDER=""
VITE_CHAT_MODEL=""
VITE_LIVE_PROVIDER=""
VITE_LIVE_MODEL=""
VITE_IMAGE_STANDARD_PROVIDER=""
VITE_IMAGE_STANDARD_MODEL=""
VITE_IMAGE_PRO_PROVIDER=""
VITE_IMAGE_PRO_MODEL=""
```

### Optional: CORS Proxy for FB Video Download

```env
# Defaults to https://corsproxy.io if not set
VITE_CORS_PROXY_URL=""
```

## 3. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 4. Verify

You should see the ClipGenius Paste Zone. Press `Cmd/Ctrl+V` anywhere outside of input fields to capture clipboard content.

## Common Issues

### "API key not valid"

Make sure `VITE_GEMINI_API_KEY` in `.env` matches the key from [Google AI Studio](https://aistudio.google.com/app/apikey). Keys are prefixed with `AIza...`.

### "Paste events not captured"

- ClipGenius ignores paste events inside `<input>`, `<textarea>`, or `contenteditable` elements. Paste somewhere with no input focused.
- Check that you are not on a hidden browser tab.

### "CORS error on FB video download"

Set `VITE_CORS_PROXY_URL` to a working CORS proxy. The default `https://corsproxy.io` may be rate-limited or blocked in some environments.

## Next Steps

- [Quick Start](./quick-start.md) — Make your first capture
