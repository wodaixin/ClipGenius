import { GoogleGenAI } from "@google/genai";
import { PasteItem } from "../../types";
import { getStoredSettings } from "../../lib/settings";

interface GenerateImageParams {
  prompt: string;
  quality: "standard" | "pro";
  size: "1K" | "2K" | "4K";
  contextItem?: PasteItem | null;
  apiKey?: string;
}

/** Generate or edit an image with Gemini */
export async function generateImage(params: GenerateImageParams): Promise<string | null> {
  const { prompt, quality, size, contextItem, apiKey } = params;

  const stored = getStoredSettings();
  const effectiveApiKey = apiKey || stored.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

  let response;

  if (contextItem) {
    // Image editing mode
    response = await ai.models.generateContent({
      model: import.meta.env.VITE_IMAGE_STANDARD_MODEL || "gemini-2.5-flash-image",
      contents: {
        parts: [
          { inlineData: { data: contextItem.content.split(",")[1], mimeType: contextItem.mimeType } },
          { text: prompt },
        ],
      },
    });
  } else if (quality === "pro") {
    // PRO generation (may fail without paid key — caller should catch and prompt)
    response = await ai.models.generateContent({
      model: import.meta.env.VITE_IMAGE_PRO_MODEL || "gemini-3-pro-image-preview",
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1", imageSize: size },
      },
    });
  } else {
    // Standard generation
    response = await ai.models.generateContent({
      model: import.meta.env.VITE_IMAGE_STANDARD_MODEL || "gemini-2.5-flash-image",
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1" },
      },
    });
  }

  const imagePart = response.candidates?.[0]?.content?.parts.find((p: any) => p.inlineData);
  if (imagePart?.inlineData) {
    return `data:image/png;base64,${imagePart.inlineData.data}`;
  }
  return null;
}
