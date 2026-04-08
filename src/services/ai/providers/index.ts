import { PasteItem } from "../../../types";
import { AnalysisProvider, AnalysisResult, ProviderType } from "./types";
import { geminiAnalysisProvider } from "./gemini";
import { minimaxAnalysisProvider } from "./minimax";
import { getStoredSettings, getAnalysisProviderForType } from "../../../lib/settings";
import { canProviderHandle } from "./capabilities";

const analysisProviders: Record<ProviderType, AnalysisProvider> = {
  gemini: geminiAnalysisProvider,
  minimax: minimaxAnalysisProvider,
};

export function getAnalysisProvider(typeOverride?: ProviderType): AnalysisProvider {
  const provider = typeOverride || (getStoredSettings().analysisProvider as ProviderType) || (import.meta.env.VITE_ANALYSIS_PROVIDER as ProviderType) || "gemini";
  const impl = analysisProviders[provider];
  if (!impl) {
    console.warn(`Unknown analysis provider "${provider}", falling back to gemini`);
    return geminiAnalysisProvider;
  }
  return impl;
}

export async function analyzeContent(item: PasteItem): Promise<AnalysisResult> {
  let providerType = getAnalysisProviderForType(item.type);
  if (!canProviderHandle(providerType, item.type)) {
    console.warn(`Provider "${providerType}" does not support "${item.type}" content, falling back to gemini`);
    providerType = "gemini";
  }
  const provider = getAnalysisProvider(providerType);
  return provider.analyze(item);
}
