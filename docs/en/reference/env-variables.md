# Environment Variables

All environment variables must be prefixed with `VITE_` and are embedded at build time. Copy `.env.example` to `.env` and fill in values.

## Firebase Configuration

| Variable | Description | Where to get |
|---|---|---|
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console → Project Settings → General |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | Firebase Console → Project Settings → Your apps |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | Firebase Console → Project Settings → Your apps |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | Firebase Console → Project Settings → Your apps |
| `VITE_FIREBASE_FIRESTORE_DB` | Firestore database ID | Firebase Console → Firestore → (default) |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket | Firebase Console → Project Settings → General |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM Sender ID (unused but required) | Firebase Console → Project Settings → Cloud Messaging |

## AI Configuration

| Variable | Description | Default | Where to get |
|---|---|---|---|
| `VITE_GEMINI_API_KEY` | Gemini API key (all AI features) | — | [Google AI Studio](https://aistudio.google.com/app/apikey) |

### Minimax

| Variable | Description | Default |
|---|---|---|
| `VITE_MINIMAX_API_KEY` | Minimax API key | — |
| `VITE_MINIMAX_BASE_URL` | Minimax API base URL | `https://api.minimaxi.com/anthropic` |

## Per-Feature Provider Override

Leave empty to use the default provider (Gemini for all features).

| Variable | Description | Default |
|---|---|---|
| `VITE_ANALYSIS_PROVIDER` | Provider for content analysis | `gemini` |
| `VITE_ANALYSIS_MODEL` | Model override for analysis | — |
| `VITE_CHAT_PROVIDER` | Provider for chat | `gemini` |
| `VITE_CHAT_MODEL` | Model override for chat | — |
| `VITE_LIVE_PROVIDER` | Provider for live voice | `gemini` |
| `VITE_LIVE_MODEL` | Model override for live voice | — |
| `VITE_IMAGE_STANDARD_PROVIDER` | Provider for image gen (standard) | `gemini` |
| `VITE_IMAGE_STANDARD_MODEL` | Model override for standard image gen | — |
| `VITE_IMAGE_PRO_PROVIDER` | Provider for image gen (pro) | `gemini` |
| `VITE_IMAGE_PRO_MODEL` | Model override for pro image gen | — |

**Valid provider values**: `gemini`, `minimax`

### Default Models

| Feature | Default Model |
|---|---|
| Content analysis | `gemini-3-flash-preview` |
| Chat | `gemini-3.1-pro-preview` |
| Live voice | `gemini-3.1-flash-live-preview` |
| Image generation (standard) | `gemini-2.5-flash-image` |
| Image generation (pro) | `gemini-3-pro-image-preview` |

## App

| Variable | Description | Default |
|---|---|---|
| `VITE_APP_URL` | Application URL | `http://localhost:3000` |
| `VITE_CORS_PROXY_URL` | CORS proxy for FB video download | `https://corsproxy.io` |
