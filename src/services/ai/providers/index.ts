import { PasteItem } from "../../../types";
import { AnalysisProvider, AnalysisResult, ProviderType } from "./types";
import { geminiAnalysisProvider } from "./gemini";
import { minimaxAnalysisProvider } from "./minimax";
import { getStoredSettings } from "../../../lib/settings";

const analysisProviders: Record<ProviderType, AnalysisProvider> = {
  gemini: geminiAnalysisProvider,
  minimax: minimaxAnalysisProvider,
};

export function getAnalysisProvider(): AnalysisProvider {
  const stored = getStoredSettings();
  const provider = (stored.analysisProvider || import.meta.env.VITE_ANALYSIS_PROVIDER || "gemini") as ProviderType;
  const impl = analysisProviders[provider];
  if (!impl) {
    console.warn(`Unknown analysis provider "${provider}", falling back to gemini`);
    return geminiAnalysisProvider;
  }
  return impl;
}

export async function analyzeContent(item: PasteItem): Promise<AnalysisResult> {
  const provider = getAnalysisProvider();
  return provider.analyze(item);
}
