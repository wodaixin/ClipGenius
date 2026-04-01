# Environment Variables

**Overview** — All environment variables are prefixed with `VITE_` (Vite convention). They are embedded at build time. In AI Studio deployments, they are injected as runtime secrets.

Copy `.env.example` to `.env` for local development. For AI Studio deployments, configure them as secrets in the AI Studio settings.

---

### Firebase Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_FIREBASE_PROJECT_ID` | Yes | — | Firebase project identifier |
| `VITE_FIREBASE_APP_ID` | Yes | — | Firebase web app ID |
| `VITE_FIREBASE_API_KEY` | Yes | — | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | — | Auth domain (e.g., `clipgenius.firebaseapp.com`) |
| `VITE_FIREBASE_FIRESTORE_DB` | No | `(default)` | Firestore database ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | — | Cloud Storage bucket URL |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | — | FCM sender ID |

---

### AI — Gemini

| Variable | Default | Description |
|---|---|---|
| `VITE_GEMINI_API_KEY` | **Required** | Default API key for all Gemini features |
| `VITE_ANALYSIS_MODEL` | `gemini-3-flash-preview` | Model for content analysis |
| `VITE_CHAT_MODEL` | `gemini-3.1-pro-preview` | Model for multimodal chat |
| `VITE_LIVE_MODEL` | `gemini-3.1-flash-live-preview` | Model for live voice sessions |
| `VITE_IMAGE_STANDARD_MODEL` | `gemini-2.5-flash-image` | Model for standard image generation |
| `VITE_IMAGE_PRO_MODEL` | `gemini-3-pro-image-preview` | Model for Pro image generation |

---

### AI — Provider Selection

| Variable | Default | Description |
|---|---|---|
| `VITE_ANALYSIS_PROVIDER` | `gemini` | Provider for content analysis (`gemini` or `minimax`) |
| `VITE_CHAT_PROVIDER` | `gemini` | Provider for chat (`gemini` or `minimax`) |
| `VITE_MINIMAX_API_KEY` | — | API key when `minimax` is selected as provider |
| `VITE_MINIMAX_BASE_URL` | — | Base URL for MiniMax API |

---

### Application

| Variable | Default | Description |
|---|---|---|
| `VITE_APP_URL` | `http://localhost:3000` | Application URL (used in Firebase config) |
| `DISABLE_HMR` | `false` | Set to `true` in AI Studio to disable Vite HMR |
