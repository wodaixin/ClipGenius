import { GoogleGenAI } from "@google/genai";
import { PasteItem } from "../../../types";
import { AnalysisProvider, AnalysisResult } from "./types";

function buildAnalysisPrompt(item: PasteItem): string {
  if (item.type === "image" || item.type === "video") {
    return `Analyze this ${item.type}. Suggest a short, descriptive filename (no extension) and provide a 1-sentence summary of what's in the ${item.type}. Return as JSON: { "suggestedName": "...", "summary": "..." }`;
  }
  if (item.type === "url") {
    return `Analyze this URL: ${item.content}. Suggest a short, descriptive filename (no extension) based on the site and provide a 1-sentence summary of what it likely contains. Return as JSON: { "suggestedName": "...", "summary": "..." }`;
  }
  return `Analyze this text: "${item.content.substring(0, 1000)}...". Suggest a short, descriptive filename (no extension) based on the content and provide a 1-sentence summary. Return as JSON: { "suggestedName": "...", "summary": "..." }`;
}

function buildAnalysisParts(item: PasteItem): { parts: unknown[]; config: Record<string, unknown> } {
  const prompt = buildAnalysisPrompt(item);

  if (item.type === "image" || item.type === "video") {
    return {
      parts: [
        { text: prompt },
        { inlineData: { data: item.content.split(",")[1], mimeType: item.mimeType } },
      ],
      config: { responseMimeType: "application/json" },
    };
  }

  if (item.type === "url") {
    return {
      parts: [{ text: prompt }],
      config: { responseMimeType: "application/json", tools: [{ googleSearch: {} }] },
    };
  }

  return {
    parts: [{ text: prompt }],
    config: { responseMimeType: "application/json" },
  };
}

export const geminiAnalysisProvider: AnalysisProvider = {
  async analyze(item) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const model = import.meta.env.VITE_ANALYSIS_MODEL || "gemini-3-flash-preview";
    const ai = new GoogleGenAI({ apiKey });
    const { parts, config } = buildAnalysisParts(item);

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config,
    });

    const result = JSON.parse((response.text || "{}").replace(/^```json\s*/i, "").replace(/\s*```$/i, ""));
    return {
      suggestedName: result.suggestedName || item.suggestedName,
      summary: result.summary || "No summary available.",
    } as AnalysisResult;
  },
};
