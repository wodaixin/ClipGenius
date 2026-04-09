# Provider Model

All AI features are routed through a configurable provider abstraction layer. Currently two providers are implemented: **Gemini** and **Minimax**.

## Provider Interface

The `AnalysisProvider` interface (`src/services/ai/providers/types.ts`) defines the contract:

```typescript
interface AnalysisProvider {
  analyze(item: PasteItem): Promise<AnalysisResult>;
}
```

For chat, the `ChatProvider` interface defines streaming chat:

```typescript
interface ChatProvider {
  streamChat(params: ChatProviderParams): Promise<AsyncGenerator<ChatChunk>>;
  chat(params: ChatProviderParams): Promise<ChatResponse>;
}
```

## Provider Registry

Each feature has a router function that selects the provider:

| Feature | Router | Default |
|---|---|---|
| Content analysis | `getAnalysisProvider(type)` | Gemini |
| Chat | `getChatProvider()` | Gemini |
| Live voice | `getLiveProvider()` | Gemini |
| Image gen (standard) | `getImageStandardProvider()` | Gemini |
| Image gen (pro) | `getImageProProvider()` | Gemini |

Providers are selected in this order:
1. In-app Settings (stored in `localStorage["clipgenius_settings"]`)
2. `VITE_<FEATURE>_PROVIDER` environment variable
3. Hardcoded default (`gemini`)

## Capability Checking

Before routing to a provider, the app checks whether the provider supports the content type via `canProviderHandle(provider, contentType)` in `src/services/ai/providers/capabilities.ts`:

| Provider | Text | Image | Video |
|---|---|---|---|
| **Gemini** | ✅ `supportsText: true` | ✅ `supportsImage: true` | ✅ `supportsVideo: true` |
| **Minimax** | ✅ `supportsText: true` | ❌ `supportsImage: false` | ❌ `supportsVideo: false` |

If a provider does not support the content type, the app falls back to Gemini:

```typescript
// In analyzeContent.ts
if (!canProviderHandle(providerType, item.type)) {
  console.warn(`Provider "${providerType}" does not support "${item.type}" content, falling back to gemini`);
  providerType = "gemini";
}
```

For chat, if the user attempts to attach an image with Minimax, the UI shows a `providerNotSupported` error message from the i18n strings.

## Adding a New Provider

See [Adding an AI Provider](../development/adding-provider.md) for the step-by-step guide.
