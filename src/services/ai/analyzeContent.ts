import { GoogleGenAI } from "@google/genai";
import { PasteItem, PasteType } from "../../types";

interface AnalysisResult {
  suggestedName: string;
  summary: string;
}

function buildAnalysisParts(item: PasteItem): {
  prompt: string;
  parts: unknown[];
  config: Record<string, unknown>;
} {
  if (item.type === "image" || item.type === "video") {
    const prompt = `Analyze this ${item.type}. Suggest a short, descriptive filename (no extension) and provide a 1-sentence summary of what's in the ${item.type}. Return as JSON: { "suggestedName": "...", "summary": "..." }`;
    return {
      prompt,
      parts: [
        { text: prompt },
        { inlineData: { data: item.content.split(",")[1], mimeType: item.mimeType } },
      ],
      config: { responseMimeType: "application/json" },
    };
  }

  if (item.type === "url") {
    const prompt = `Analyze this URL: ${item.content}. Suggest a short, descriptive filename (no extension) based on the site and provide a 1-sentence summary of what it likely contains. Return as JSON: { "suggestedName": "...", "summary": "..." }`;
    return {
      prompt,
      parts: [{ text: prompt }],
      config: { responseMimeType: "application/json", tools: [{ googleSearch: {} }] },
    };
  }

  // text
  const prompt = `Analyze this text: "${item.content.substring(0, 1000)}...". Suggest a short, descriptive filename (no extension) based on the content and provide a 1-sentence summary. Return as JSON: { "suggestedName": "...", "summary": "..." }`;
  return {
    prompt,
    parts: [{ text: prompt }],
    config: { responseMimeType: "application/json" },
  };
}

/** Analyze a PasteItem with Gemini and return suggested name + summary */
export async function analyzeContent(item: PasteItem): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const { parts, config } = buildAnalysisParts(item);

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config,
  });

  const result = JSON.parse(response.text || "{}");
  return {
    suggestedName: result.suggestedName || item.suggestedName,
    summary: result.summary || "No summary available.",
  };
}
