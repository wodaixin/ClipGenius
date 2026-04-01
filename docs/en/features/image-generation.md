# Image Generation

## Overview

ClipGenius generates images from text prompts via Gemini. There are two tiers: Standard (free) and Pro (paid AI Studio key).

## Standard Mode

Uses `VITE_GEMINI_API_KEY` with model `gemini-2.5-flash-image` (configurable via `VITE_IMAGE_STANDARD_MODEL`). Free tier with standard rate limits.

## Pro Mode

Uses a paid AI Studio API key selected via `window.aistudio`. Model: `gemini-3-pro-image-preview` (configurable via `VITE_IMAGE_PRO_MODEL`). Supports three sizes: `1K` (1024×1024), `2K` (2048×2048), `4K` (4096×4096).

## `window.aistudio` Integration

`window.aistudio` is a global injected by the AI Studio runtime (only available in AI Studio deployments, not in local dev or generic Cloud Run). It provides three methods:

| Method | Returns | Description |
|---|---|---|
| `hasSelectedApiKey()` | `Promise<boolean>` | Check if a paid key is selected |
| `openSelectKey()` | `void` | Open the AI Studio key picker UI |
| `getSelectedApiKey()` | `Promise<string>` | Retrieve the selected key |

The check runs when the image gen modal opens:

```typescript
// From AppContext.tsx line 72-80
useEffect(() => {
  const checkApiKey = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    }
  };
  if (isImageGenOpen) checkApiKey();
}, [isImageGenOpen]);
```

## Permission Error Fallback

When Pro generation fails with a permission error, the app prompts the user to select a paid key and retries:

```typescript
// From AppContext.tsx line 126-150
const isPermissionError =
  error?.message?.includes("PERMISSION_DENIED") ||
  error?.message?.includes("not found") ||
  error?.message?.includes("quota") ||
  error?.message?.includes("has no");

if (imageQuality === "pro" && isPermissionError) {
  window.aistudio?.openSelectKey?.();
  const hasKey = await window.aistudio?.hasSelectedApiKey?.();
  if (hasKey) {
    const paidKey = await window.aistudio?.getSelectedApiKey?.();
    // retry with paidKey
  }
}
```

## Image Editing

When `contextItem` (a PasteItem of type `image`) is provided, the model receives both the base64 image data and the prompt text. This is the "edit" mode vs "generate" mode.

## Generation Flow

`generateImageAction` in `AppContext` orchestrates:

1. Validate prompt is non-empty
2. Call `generateImage({ prompt, quality, size, contextItem, apiKey })`
3. On permission error in Pro mode → trigger AI Studio picker → retry
4. Set `generatedImage` to the returned base64 data URI

## Download

Generated images are downloaded as `gen_{timestamp}.png` via a programmatic anchor element:

```typescript
const link = document.createElement("a");
link.href = generatedImage;
link.download = `gen_${Date.now()}.png`;
link.click();
```

## PasteCard Integration

- **"Generate Image"** — calls `openImageGenWithText(text)`, pre-filling the prompt with `"Create a high-quality visual representation of: <text>"`
- **"Edit Image"** — calls `startImageEdit(item)`, pre-filling the prompt with `"Add a futuristic neon glow to this image"` and setting `contextItem`
