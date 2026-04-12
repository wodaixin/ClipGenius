# Adding a Paste Type

This guide walks through adding a new `PasteType` to ClipGenius (e.g. adding `audio` support).

## Overview

Adding a new `PasteType` touches multiple files across the codebase: types, clipboard capture, content analysis, storage, and UI rendering.

## Step 1: Update the Type Union

Edit `src/types.ts`:

```typescript
export type PasteType = "image" | "text" | "url" | "video" | "markdown" | "code" | "audio";
```

## Step 2: Update Clipboard Capture Logic

Edit `src/hooks/useClipboard.ts`:

```typescript
// 1. Add MIME type detection for audio files
if (file.type.startsWith("audio/")) {
  // handle audio file — read as base64
  return;
}

// 2. Add audio URL detection (if pasting an audio URL)
const isAudioUrl = /\.mp3|\.wav|\.ogg|\.m4a$/i.test(trimmed);
```

## Step 3: Update Content Analysis

Edit `src/services/ai/providers/capabilities.ts`:

```typescript
export function canProviderHandle(provider: string, contentType: string): boolean {
  switch (contentType) {
    case "audio":
      return capabilities.supportsAudio ?? false;  // add to ProviderCapabilities
    // ...
  }
}
```

Add the `supportsAudio` field to `ProviderCapabilities` and set it for each provider.

## Step 4: Update Settings

Edit `src/lib/settings.ts` to add the new type to `ContentTypeAnalysisSettings`:

```typescript
export interface ContentTypeAnalysisSettings {
  image: ProviderType;
  text: ProviderType;
  url: ProviderType;
  video: ProviderType;
  markdown: ProviderType;
  code: ProviderType;
  audio: ProviderType;  // add default
}
```

Also update `DEFAULT_ANALYSIS_PROVIDERS`:

```typescript
const DEFAULT_ANALYSIS_PROVIDERS: ContentTypeAnalysisSettings = {
  // ...
  audio: "gemini",
};
```

## Step 5: Update PastePreview Rendering

Edit `src/components/paste/PastePreview.tsx` to add a render case for the new type:

```typescript
case "audio":
  return <audio controls src={item.content} className="max-w-full" />;
```

## Step 6: Update i18n Strings

Add translation keys for the new type in `src/i18n/locales/en.json` and `zh.json`:

```json
{
  "pasteZone": {
    "typeAudio": "Audio"
  }
}
```

## Step 7: Test

1. Capture an audio file (`Cmd/Ctrl+V`)
2. Verify it is classified as `audio`
3. Verify the preview renders the `<audio>` element
4. Verify AI analysis works (if supported)
