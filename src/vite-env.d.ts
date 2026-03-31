/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_FIRESTORE_DB: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_APP_URL: string;

  // Per-feature model overrides (API key defaults to VITE_GEMINI_API_KEY)
  readonly VITE_ANALYSIS_MODEL?: string;
  readonly VITE_CHAT_MODEL?: string;
  readonly VITE_LIVE_MODEL?: string;
  readonly VITE_IMAGE_STANDARD_MODEL?: string;
  readonly VITE_IMAGE_PRO_MODEL?: string;

  // Provider config (defaults to "gemini")
  readonly VITE_ANALYSIS_PROVIDER?: string;
  readonly VITE_CHAT_PROVIDER?: string;
  readonly VITE_LIVE_PROVIDER?: string;
  readonly VITE_IMAGE_PROVIDER?: string;

  // Minimax API Key & Base URL (used when any provider is "minimax")
  readonly VITE_MINIMAX_API_KEY?: string;
  readonly VITE_MINIMAX_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
