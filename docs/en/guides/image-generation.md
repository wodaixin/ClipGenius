# Image Generation

ClipGenius can generate images from text prompts using Gemini. Two modes are available: **Standard** (free) and **Pro** (paid AI Studio key).

## Standard Mode (Free)

Uses `VITE_GEMINI_API_KEY` from the environment. The model is `gemini-2.5-flash-image`. This mode has generous free tier quotas.

```typescript
await generateImage({
  prompt: "A cyberpunk cityscape at night",
  quality: "standard",
  size: "1K", // or "2K" or "4K"
  contextItem: null,
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});
```

## Pro Mode (Paid)

Pro mode uses a **paid Gemini API key selected via `window.aistudio`**. This is the `window.aistudio` global provided by the Google AI Studio host environment (used when running on Cloud Run via AI Studio):

```typescript
window.aistudio = {
  hasSelectedApiKey: () => Promise<boolean>,
  openSelectKey: () => void,
  getSelectedApiKey?: () => Promise<string>,
};
```

When the user clicks **Pro** in the Image Generation modal:

1. `window.aistudio.openSelectKey()` opens the AI Studio key selector
2. The selected key is retrieved via `window.aistudio.getSelectedApiKey()`
3. If the standard mode call fails with a permission error, the app falls back to the paid key
4. The model used is `gemini-3-pro-image-preview`

## Image Editing

When a paste item is attached to the image generation modal (via **Edit Image** on a card), `contextItem` is set and the image is passed as inline data to the model along with the text prompt. The model generates a modified version of the source image.

## Resolution

Three resolution options are available:

| Size | Approximate Dimensions |
|---|---|
| `1K` | 1024 × 1024 |
| `2K` | 1792 × 1024 |
| `4K` | 1024 × 1792 |

The aspect ratio is fixed (1:1, 16:9, or 9:16 depending on size).

## Download

The generated image is stored as a base64 PNG data URI. Clicking **Download Generation** triggers a `<a download>` click with `gen_{timestamp}.png` as the filename.

## Error Handling

- If `generateImage` throws and `imageQuality === "pro"` and the error contains `PERMISSION_DENIED`, `not found`, `quota`, or `has no`, the app prompts the user to select a paid key via `window.aistudio`.
- If the paid key call also fails, the error is surfaced to the user and the modal remains open.
- Standard mode errors are surfaced directly without fallback.
