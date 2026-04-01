# AI Studio Pro Mode

**Overview** — AI Studio Pro mode uses a paid Gemini API key from Google AI Studio to access more capable image generation models (`gemini-3-pro-image-preview`) with higher rate limits.

**The `window.aistudio` Global**

`window.aistudio` is a global object injected by the AI Studio runtime environment. It provides three methods:

| Method | Signature | Description |
|---|---|---|
| `hasSelectedApiKey` | `() => Promise<boolean>` | Returns `true` if a paid key is currently selected |
| `openSelectKey` | `() => void` | Opens the AI Studio key picker UI |
| `getSelectedApiKey` | `() => Promise<string>` | Retrieves the selected paid key |

**Important:** This global is only available when running inside the AI Studio deployment environment. It is `undefined` in local development and generic Cloud Run deployments. The app checks for its availability before using it.

**Flow Diagram**

```
User selects Pro quality in image generator
         │
         ▼
Is window.aistudio.hasSelectedApiKey() true?
         │
    ┌────┴────┐
    │  YES    │  NO
    ▼         ▼
Use the     Show "Select API Key" prompt
paid key    │
for gen     ▼
            window.aistudio.openSelectKey() → user picks key
                      │
                      ▼
            window.aistudio.getSelectedApiKey() → retrieve key
                      │
                      ▼
            Retry generation with paid key
                      │
         ┌────────────┴────────────┐
         │ Permission error        │ Success
         ▼                        ▼
    Show AI Studio picker     Set generated image
    (user can dismiss)        and display
```

**Permission Error Detection**

The app detects these error patterns to trigger the AI Studio picker:

```typescript
const isPermissionError =
  error?.message?.includes("PERMISSION_DENIED") ||
  error?.message?.includes("not found") ||
  error?.message?.includes("quota") ||
  error?.message?.includes("has no");
```

**Detection in Code**

The check for `window.aistudio` runs when the image generation modal opens:

```typescript
// From src/context/AppContext.tsx
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

**Fallback Behavior**

If Pro generation fails and the user dismisses the AI Studio key picker, the operation aborts gracefully without crashing. The standard (free) tier remains available.
