# Adding an AI Provider

This guide walks through adding a new AI provider (e.g. OpenAI, Claude, custom LLM) to ClipGenius.

## Overview

Each feature (analysis, chat) has a provider interface. You need to implement the relevant interface and register the provider in the router.

## Step 1: Define Provider Capabilities

Edit `src/services/ai/providers/capabilities.ts`:

```typescript
// Add your provider to the capabilities map
export const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
  // ... existing providers ...
  yourprovider: {
    supportsText: true,
    supportsImage: true,    // set based on your model
    supportsVideo: false,
  },
};
```

## Step 2: Implement the Analysis Provider

Create `src/services/ai/providers/yourprovider.ts`:

```typescript
import { PasteItem } from "../../../types";
import { AnalysisProvider, AnalysisResult } from "./types";

export const yourProviderAnalysisProvider: AnalysisProvider = {
  async analyze(item: PasteItem): Promise<AnalysisResult> {
    // Implement content analysis
    // Return { suggestedName, summary }
  },
};
```

For multimodal content (images/videos), include the base64 data URI in the API request.

## Step 3: Implement the Chat Provider

Create `src/services/ai/providers/yourprovider-chat.ts`:

```typescript
import { ChatProvider, ChatProviderParams } from "./chat-types";

export const yourProviderChatProvider: ChatProvider = {
  async streamChat(params: ChatProviderParams) {
    // Yield ChatChunk objects as the response streams
    // Yield { type: 'thinking', text } for reasoning chunks
    // Yield { type: 'text', text } for content chunks
    // Yield { type: 'done' } when complete
  },
  async chat(params) {
    // Non-streaming version
  },
};
```

## Step 4: Register in the Router

Edit `src/services/ai/providers/index.ts`:

```typescript
import { yourProviderAnalysisProvider } from "./yourprovider";
import { yourProviderChatProvider } from "./yourprovider-chat";

// Add to analysis providers map
const analysisProviders: Record<ProviderType, AnalysisProvider> = {
  gemini: geminiAnalysisProvider,
  minimax: minimaxAnalysisProvider,
  yourprovider: yourProviderAnalysisProvider,  // ← add here
};

// For chat, add to the chat router in chat-router.ts
```

## Step 5: Add Environment Variable Support

Edit `.env.example` and add the new provider to any relevant `VITE_*_PROVIDER` options in the documentation.

## Step 6: Add UI Strings

Add provider name translations to `src/i18n/locales/en.json` and `zh.json` if the provider name should be displayed in the Settings UI.

## Step 7: Test

1. Set `VITE_ANALYSIS_PROVIDER=yourprovider` (or use the Settings UI)
2. Capture a clipboard item — it should be analyzed by your provider
3. Open chat — it should use your chat provider
4. Verify error messages appear correctly if the provider fails
