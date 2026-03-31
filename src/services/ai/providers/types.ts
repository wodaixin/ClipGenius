import { PasteItem } from "../../../types";

export interface AnalysisResult {
  suggestedName: string;
  summary: string;
}

export interface AnalysisProvider {
  analyze(item: PasteItem): Promise<AnalysisResult>;
}

export type ProviderType = "gemini" | "minimax";
