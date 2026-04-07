# Advanced Settings

The app includes a comprehensive Settings Modal for configuring Firebase, AI providers, and API keys without requiring environment variables or rebuilds.

---

## Accessing Settings

Click the **Settings** button in the PasteZone header to open the Advanced Settings modal.

> Settings are stored in browser `localStorage` and persist across sessions. Do not use on public/shared devices.

---

## Settings Categories

### Firebase Configuration

Configure Firebase project settings for cloud sync:

| Field | Description |
|---|---|
| API Key | Firebase API key |
| Auth Domain | Firebase Auth domain (e.g., `your-app.firebaseapp.com`) |
| Project ID | Firebase project identifier |
| Storage Bucket | Cloud Storage bucket URL |
| Messaging Sender ID | FCM sender ID |
| App ID | Firebase web app ID |

### AI Configuration

Configure API keys for AI providers:

| Field | Description |
|---|---|
| Gemini API Key | API key for Gemini features |
| Minimax API Key | API key for Minimax features |
| Minimax Base URL | API endpoint for Minimax (default: `https://api.minimaxi.com/anthropic`) |

### Provider Selection

Choose which AI provider to use for each feature. These settings override environment variables:

| Feature | Options |
|---|---|
| Content Analysis Provider | Gemini / Minimax |
| Chat Provider | Gemini / Minimax |
| Live Voice Provider | Gemini / Minimax |
| Image Generation Provider (Standard) | Gemini / Minimax |
| Image Generation Provider (Pro) | Gemini / Minimax |

### Model Overrides

Optionally override the default model for each feature:

| Field | Placeholder |
|---|---|
| Analysis Model | `gemini-2.0-flash-exp` (optional) |
| Chat Model | `gemini-3.1-pro-preview` (optional) |
| Live Voice Model | `gemini-3.1-flash-live-preview` (optional) |
| Image Generation Model - Standard | `gemini-2.5-flash-image` (optional) |
| Image Generation Model - Pro | `gemini-3-pro-image-preview` (optional) |

---

## Provider Capabilities

Remember that providers have different capabilities:

| Provider | Text | Image | Video |
|---|---|---|---|
| **Gemini** | ✅ | ✅ | ✅ |
| **Minimax** | ✅ | ❌ | ❌ |

If you select Minimax for chat but attach an image, you'll receive an error message indicating the provider doesn't support multimodal input.

---

## Saving Settings

1. Click **Save** to persist settings to `localStorage`
2. A confirmation prompt will ask if you want to reload the page
3. Settings take effect after page reload

---

## Related

- [Environment Variables](deployment/environment-variables.md) — Server-side configuration
- [Provider Capabilities](deployment/environment-variables.md#provider-capabilities) — Provider feature comparison
