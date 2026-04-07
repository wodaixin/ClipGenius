import { prepare, layout } from "@chenglou/pretext";
import { PasteItem } from "../types";

// Narrow: 128x128 thumbnail + padding, Wide: 256x256 thumbnail
const CARD_BASE_HEIGHT_NARROW = 200;
const CARD_BASE_HEIGHT_WIDE = 320;
const TEXT_WIDTH_NARROW = 280;
const TEXT_WIDTH_WIDE = 480;
const LINE_HEIGHT = 28;

const cache = new Map<string, number>();

function isWideLayout(): boolean {
  return window.innerWidth >= 1280; // xl breakpoint
}

// Clear cache when window is resized across narrow/wide breakpoint
let wasWide = isWideLayout();
window.addEventListener('resize', () => {
  const nowWide = isWideLayout();
  if (nowWide !== wasWide) {
    cache.clear();
    wasWide = nowWide;
  }
});

export function estimateCardHeight(item: PasteItem): number {
  const wide = isWideLayout();
  const baseHeight = wide ? CARD_BASE_HEIGHT_WIDE : CARD_BASE_HEIGHT_NARROW;
  
  if (item.type === "image" || item.type === "video") return baseHeight;

  const cacheKey = `${item.id}-${wide ? 'wide' : 'narrow'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const textToMeasure = [item.suggestedName, item.summary ?? "", item.content.slice(0, 200)]
    .filter(Boolean)
    .join(" ");

  let height = baseHeight;
  try {
    const textWidth = wide ? TEXT_WIDTH_WIDE : TEXT_WIDTH_NARROW;
    const prepared = prepare(textToMeasure, "16px Inter");
    const { lineCount } = layout(prepared, textWidth, LINE_HEIGHT);
    height = baseHeight + Math.max(0, lineCount - 3) * LINE_HEIGHT;
  } catch {}

  cache.set(cacheKey, height);
  return height;
}
