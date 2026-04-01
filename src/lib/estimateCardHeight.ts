import { prepare, layout } from "@chenglou/pretext";
import { PasteItem } from "../types";

const CARD_BASE_HEIGHT = 320;
const TEXT_WIDTH = 480;
const LINE_HEIGHT = 28;

const cache = new Map<string, number>();

export function estimateCardHeight(item: PasteItem): number {
  if (item.type === "image" || item.type === "video") return CARD_BASE_HEIGHT;

  const cached = cache.get(item.id);
  if (cached) return cached;

  const textToMeasure = [item.suggestedName, item.summary ?? "", item.content.slice(0, 200)]
    .filter(Boolean)
    .join(" ");

  let height = CARD_BASE_HEIGHT;
  try {
    const prepared = prepare(textToMeasure, "16px Inter");
    const { lineCount } = layout(prepared, TEXT_WIDTH, LINE_HEIGHT);
    height = CARD_BASE_HEIGHT + Math.max(0, lineCount - 3) * LINE_HEIGHT;
  } catch {}

  cache.set(item.id, height);
  return height;
}
