import { prepare, layout } from "@chenglou/pretext";
import { PasteItem } from "../types";

const CARD_BASE_HEIGHT = 320; // preview + padding + divider
const TEXT_WIDTH = 480;       // approx info column width
const LINE_HEIGHT = 28;

/**
 * Estimate PasteCard height using pretext for text-heavy items.
 * For image/video the height is fixed. For text types we measure
 * the summary + content snippet to get an accurate row height.
 */
export function estimateCardHeight(item: PasteItem): number {
  if (item.type === "image" || item.type === "video") return CARD_BASE_HEIGHT;

  const textToMeasure = [item.suggestedName, item.summary ?? "", item.content.slice(0, 200)]
    .filter(Boolean)
    .join(" ");

  try {
    const prepared = prepare(textToMeasure, "16px Inter");
    const { lineCount } = layout(prepared, TEXT_WIDTH, LINE_HEIGHT);
    return CARD_BASE_HEIGHT + Math.max(0, lineCount - 3) * LINE_HEIGHT;
  } catch {
    return CARD_BASE_HEIGHT;
  }
}
