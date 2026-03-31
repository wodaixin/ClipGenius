import { PasteItem } from "../../../types";
import { AnalysisProvider, AnalysisResult, ProviderType } from "./types";
import { geminiAnalysisProvider } from "./gemini";
import { minimaxAnalysisProvider } from "./minimax";

const analysisProviders: Record<ProviderType, AnalysisProvider> = {
  gemini: geminiAnalysisProvider,
  minimax: minimaxAnalysisProvider,
};

export function getAnalysisProvider(): AnalysisProvider {
  const provider = (import.meta.env.VITE_ANALYSIS_PROVIDER as ProviderType) || "gemini";
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
