const SETTINGS_KEY = "clipgenius_settings";

export interface StoredSettings {
  // Firebase (not used by AI, but part of Settings interface)
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;

  // AI Providers
  geminiApiKey: string;
  minimaxApiKey: string;
  minimaxBaseUrl: string;

  // Provider Selection
  analysisProvider: "gemini" | "minimax";
  chatProvider: "gemini" | "minimax";
  liveProvider: "gemini" | "minimax";
  imageStandardProvider: "gemini" | "minimax";
  imageProProvider: "gemini" | "minimax";

  // Models
  analysisModel: string;
  chatModel: string;
  liveModel: string;
  imageStandardModel: string;
  imageProModel: string;
}

export function getStoredSettings(): Partial<StoredSettings> {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return {};
}
