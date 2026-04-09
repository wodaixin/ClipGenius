import { GoogleGenAI } from "@google/genai";
import { PasteItem } from "../../../types";
import { AnalysisProvider, AnalysisResult } from "./types";
import i18n from "../../../i18n";
import { getPrompts, fillTemplate } from "../../../config/prompts";
import { getStoredSettings } from "../../../lib/settings";

function buildAnalysisPrompt(item: PasteItem): string {
  const prompts = getPrompts(i18n.language);
  
  let prompt: string;
  if (item.type === "image") {
    prompt = prompts.analyze.image;
  } else if (item.type === "video") {
    prompt = prompts.analyze.video;
  } else if (item.type === "url") {
    prompt = fillTemplate(prompts.analyze.url, { content: item.content });
  } else {
    prompt = fillTemplate(prompts.analyze.text, { content: item.content.substring(0, 1000) });
  }
  return `${prompt}\n${prompts.analyze.langSuffix}`;
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
    const stored = getStoredSettings();
    const apiKey = stored.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
    const model = stored.analysisModel || import.meta.env.VITE_ANALYSIS_MODEL || "gemini-3-flash-preview";
    const ai = new GoogleGenAI({ apiKey });
    const { parts, config } = buildAnalysisParts(item);

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config,
    });

    const rawText = response.text || "{}";
    console.log("[Analysis] Raw response:", rawText);
    
    let result: { suggestedName?: string; summary?: string } = {};
    
    try {
      // Try direct parse first
      result = JSON.parse(rawText);
    } catch {
      // Strip markdown code fences: ```json ... ``` or ``` ... ```
      const stripped = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      try {
        result = JSON.parse(stripped);
      } catch {
        // Fallback: find the first { to last } with greedy matching
        const match = stripped.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            result = JSON.parse(match[0]);
          } catch (error) {
            console.error("[Analysis] All JSON parse attempts failed:", error, "Text:", rawText);
          }
        } else {
          console.error("[Analysis] No JSON object found in response:", rawText);
        }
      }
    }
    
    // Format suggestedName as "type_title"
    let suggestedName = result.suggestedName || item.suggestedName;
    if (suggestedName && !suggestedName.startsWith(`${item.type}_`)) {
      suggestedName = `${item.type}_${suggestedName}`;
    }
    
    return {
      suggestedName,
      summary: result.summary || i18n.t("analyze.noSummary"),
    } as AnalysisResult;
  },
};
