import { PasteType } from "../types";
import { ProviderType } from "../services/ai/providers/types";

const SETTINGS_KEY = "clipgenius_settings";

export interface ContentTypeAnalysisSettings {
  image: ProviderType;
  text: ProviderType;
  url: ProviderType;
  video: ProviderType;
  markdown: ProviderType;
  code: ProviderType;
}

export interface StoredSettings {
  // AI Providers
  geminiApiKey: string;
  minimaxApiKey: string;
  minimaxBaseUrl: string;

  // Provider Selection (legacy global fallback)
  analysisProvider: ProviderType;
  chatProvider: ProviderType;
  liveProvider: ProviderType;
  imageStandardProvider: ProviderType;
  imageProProvider: ProviderType;

  // Per-content-type analysis providers
  analysisProvidersByType: ContentTypeAnalysisSettings;

  // Models
  analysisModel: string;
  chatModel: string;
  liveModel: string;
  imageStandardModel: string;
  imageProModel: string;
}

const DEFAULT_ANALYSIS_PROVIDERS: ContentTypeAnalysisSettings = {
  image: "gemini",
  text: "minimax",
  url: "gemini",
  video: "gemini",
  markdown: "minimax",
  code: "minimax",
};

export function getStoredSettings(): Partial<StoredSettings> {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.analysisProvidersByType) {
        parsed.analysisProvidersByType = { ...DEFAULT_ANALYSIS_PROVIDERS };
      }
      return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return {};
}

export function getAnalysisProviderForType(type: PasteType): ProviderType {
  const stored = getStoredSettings();
  const byType = stored.analysisProvidersByType;
  if (byType && byType[type]) {
    return byType[type];
  }
  return (stored.analysisProvider || import.meta.env.VITE_ANALYSIS_PROVIDER || "gemini") as ProviderType;
}
