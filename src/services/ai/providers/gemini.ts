import { GoogleGenAI } from "@google/genai";
import { PasteItem } from "../../../types";
import { AnalysisProvider, AnalysisResult } from "./types";
import i18n from "../../../i18n";

function buildAnalysisPrompt(item: PasteItem): string {
  const langSuffix = i18n.t("analyze.langSuffix");
  let prompt: string;
  if (item.type === "image") {
    prompt = i18n.t("analyze.prompt.image");
  } else if (item.type === "video") {
    prompt = i18n.t("analyze.prompt.video");
  } else if (item.type === "url") {
    prompt = i18n.t("analyze.prompt.url", { content: item.content });
  } else {
    prompt = i18n.t("analyze.prompt.text", { content: item.content.substring(0, 1000) });
  }
  return `${prompt}\n${langSuffix}`;
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
      config: { responseMimeType: "application/json" },
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
      summary: result.summary || i18n.t("analyze.noSummary"),
    } as AnalysisResult;
  },
};
