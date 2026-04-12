# ClipGenius Documentation

> **ClipGenius** — Professional-grade AI clipboard manager. Captures images, videos, text, URLs, markdown, and code snippets; analyzes them with AI (Gemini / Minimax); all data stored locally via IndexedDB.

## Navigation

### [Getting Started](./getting-started/)
Install, configure, and get up and running in minutes.

- [Installation](./getting-started/installation.md)
- [Quick Start](./getting-started/quick-start.md)

### [Guides](./guides/)
Step-by-step explanations of every feature.

- [Clipboard Capture](./guides/clipboard-capture.md)
- [AI Analysis](./guides/ai-analysis.md)
- [AI Chat](./guides/chat.md)
- [Image Generation](./guides/image-generation.md)
- [Settings](./guides/settings.md)
- [Managing History](./guides/managing-history.md)

### [Architecture](./architecture/)
Deep dives into system design and key technical decisions.

- [Overview](./architecture/overview.md)
- [Provider Model](./architecture/provider-model.md)
- [Cross-Tab Sync](./architecture/cross-tab-sync.md)

### [Reference](./reference/)
Complete API surface: hooks, contexts, services, types.

- [Hooks](./reference/api-hooks.md)
- [Contexts](./reference/api-contexts.md)
- [Services](./reference/api-services.md)
- [Types](./reference/api-types.md)
- [Environment Variables](./reference/env-variables.md)
- [Prompts](./reference/prompts.md)

### [Deployment](./deployment/)
Host ClipGenius on Cloud Run, static hosting, or CI/CD.

- [Google Cloud Run](./deployment/google-cloud-run.md)
- [CI/CD](./deployment/ci-cd.md)

### [Development](./development/)
Contribute code, add new AI providers, add new paste types.

- [Project Structure](./development/project-structure.md)
- [Adding an AI Provider](./development/adding-provider.md)
- [Adding a Paste Type](./development/adding-paste-type.md)
- [Internationalization](./development/internationalization.md)
- [Contributing](./development/contributing.md)

## Feature Highlights

| Feature | Description |
|---|---|
| **Clipboard Capture** | Six content types: image, video, text, URL, markdown, code |
| **AI Analysis** | Auto-generates suggested name and summary per item |
| **AI Chat** | Multimodal chat with streaming thinking, live voice support |
| **Image Generation** | Standard (free) and Pro (paid AI Studio key) modes |
| **Local Storage** | IndexedDB, fully offline-capable |
| **Cross-Tab Sync** | BroadcastChannel + localStorage fallback |
| **i18n** | English and Chinese UI |
