# Settings

All settings are accessible via the settings icon in the Paste Zone header, which opens the `SettingsModal` component.

## Storage

Settings are stored in `localStorage["clipgenius_settings"]` as a `StoredSettings` object. They persist across sessions but are browser-local (not synced to Firebase).

> **Warning**: Do not save sensitive information on public/shared devices. Settings are stored in plain localStorage.

## Settings Sections

### Firebase Configuration

Stores Firebase credentials used by the app. Changes require a page reload to take effect.

| Field | Env Var Equivalent |
|---|---|
| API Key | `VITE_FIREBASE_API_KEY` |
| Auth Domain | `VITE_FIREBASE_AUTH_DOMAIN` |
| Project ID | `VITE_FIREBASE_PROJECT_ID` |
| Storage Bucket | `VITE_FIREBASE_STORAGE_BUCKET` |
| Messaging Sender ID | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| App ID | `VITE_FIREBASE_APP_ID` |

### AI Configuration

Stores AI API keys and endpoints. These override `VITE_*` environment variables when set.

| Field | Env Var Equivalent |
|---|---|
| Gemini API Key | `VITE_GEMINI_API_KEY` |
| Minimax API Key | `VITE_MINIMAX_API_KEY` |
| Minimax Base URL | `VITE_MINIMAX_BASE_URL` |

### Provider Selection

Configures which AI provider to use for each feature. Options: `gemini` or `minimax`.

| Feature | Env Var |
|---|---|
| Content Analysis | `VITE_ANALYSIS_PROVIDER` |
| Chat | `VITE_CHAT_PROVIDER` |
| Live Voice | `VITE_LIVE_PROVIDER` |
| Image Generation (Standard) | `VITE_IMAGE_STANDARD_PROVIDER` |
| Image Generation (Pro) | `VITE_IMAGE_PRO_PROVIDER` |

Optional model override fields allow specifying a non-default model for each feature.

### Per-Content-Type Analysis Provider

Allows setting a different AI provider for each content type (image, text, url, video, markdown, code). This is stored in `analysisProvidersByType` within `StoredSettings`.

Default routing:

| Type | Default Provider |
|---|---|
| `image` | Gemini |
| `text` | Minimax |
| `url` | Gemini |
| `video` | Gemini |
| `markdown` | Minimax |
| `code` | Minimax |

## Auto-Analyze Toggle

The auto-analyze toggle in the Paste Zone header (not in the Settings modal) controls whether new items are analyzed on capture. This is stored in `localStorage["autoAnalyze"]` separately from `clipgenius_settings`.

## Applying Settings

All settings take effect after a page reload. The Settings UI shows a confirmation prompt: "Settings saved. Page reload required to apply changes. Reload now?"
