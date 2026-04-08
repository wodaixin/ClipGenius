import { PasteItem } from "../../../types";
import { AnalysisProvider, AnalysisResult } from "./types";
import i18n from "../../../i18n";
import { getPrompts, fillTemplate } from "../../../config/prompts";
import { getStoredSettings } from "../../../lib/settings";

function getMinimaxBaseUrl(): string {
  if (import.meta.env.DEV) return "/api/minimax";
  return (import.meta.env.VITE_MINIMAX_BASE_URL || "https://api.minimaxi.com/anthropic").replace(/\/$/, "");
}

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

export const minimaxAnalysisProvider: AnalysisProvider = {
  async analyze(item) {
    const stored = getStoredSettings();
    const apiKey = stored.minimaxApiKey || import.meta.env.VITE_MINIMAX_API_KEY;
    if (!apiKey) throw new Error("Minimax API key not configured");

    const baseUrl = stored.minimaxBaseUrl || getMinimaxBaseUrl();
    const model = stored.analysisModel || import.meta.env.VITE_ANALYSIS_MODEL || "MiniMax-M2.7";

    const prompt = buildAnalysisPrompt(item);
    const isMultimodal = item.type === "image" || item.type === "video";

    const messages: Record<string, unknown>[] = [];

    if (isMultimodal && item.content) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: item.mimeType,
              data: item.content.split(",")[1] || item.content,
            },
          },
        ],
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ model, messages, max_tokens: 1024 }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Minimax API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    console.log("[Minimax Analysis] Raw response:", JSON.stringify(data, null, 2));
    
    // Content may contain thinking + text blocks; find the text block
    const textBlock = data.content?.find((block: any) => block.type === "text");
    const text: string = textBlock?.text || "";
    console.log("[Minimax Analysis] Extracted text:", text);

    let result: { suggestedName?: string; summary?: string } = {};
    try {
      result = JSON.parse(text);
      console.log("[Minimax Analysis] Parsed result:", result);
    } catch {
      // Strip markdown code fences: ```json ... ``` or ``` ... ```
      const stripped = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
      console.log("[Minimax Analysis] Stripped text:", stripped);
      try {
        result = JSON.parse(stripped);
        console.log("[Minimax Analysis] Parsed from stripped:", result);
      } catch {
        // Fallback: find the first { to last } with greedy matching
        const match = stripped.match(/\{[\s\S]*?\}/);
        console.log("[Minimax Analysis] Regex match:", match?.[0]);
        if (match) {
          try { 
            result = JSON.parse(match[0]);
            console.log("[Minimax Analysis] Parsed from regex match:", result);
          } catch (e) {
            console.error("[Minimax Analysis] All parse attempts failed:", e);
          }
        }
      }
    }

    return {
      suggestedName: result.suggestedName || item.suggestedName,
      summary: result.summary || i18n.t("analyze.noSummary"),
    } as AnalysisResult;
  },
};
