# ClipGenius Documentation

ClipGenius is a professional-grade AI clipboard manager built with React 19 and Vite. It captures clipboard content (images, videos, text, URLs, markdown, and code), analyzes it with Gemini AI, and syncs across devices via Firebase. Designed for Google Cloud Run deployment via AI Studio.

---

## Get Started

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 2rem 0;">

### New to ClipGenius?

Get up and running in under 5 minutes. Clone the repo, configure your API keys, and start capturing clipboard content.

**[Quick Start Guide](quick-start.md)**

### Deploy to Production?

Deploy ClipGenius to Google Cloud Run via AI Studio for production-grade hosting with automatic scaling.

**[Cloud Run Deployment](deployment/cloud-run-ai-studio.md)**

</div>

---

## Feature Guides

- **[Clipboard Capture](features/clipboard-capture.md)** — Automatic detection and classification of images, videos, text, URLs, markdown, and code from the system clipboard
- **[AI Analysis](features/ai-analysis.md)** — Automatic content analysis with Gemini AI to generate filenames and summaries
- **[AI Chat](features/ai-chat.md)** — Contextual AI conversations powered by Gemini, with optional paste attachments
- **[Image Generation](features/image-generation.md)** — Generate images from text prompts using Gemini's image capabilities
- **[Live Voice](features/live-voice.md)** — Real-time voice conversations with Gemini via WebSocket streaming
- **[Sync Modes](features/sync-modes.md)** — Local-first with optional cloud sync via Firebase Firestore

---

## Deployment

- **[Cloud Run via AI Studio](deployment/cloud-run-ai-studio.md)** — Production deployment on Google Cloud Run
- **[Firebase Setup](deployment/firebase-setup.md)** — Configure Firebase Auth and Firestore for cloud sync
- **[Environment Variables](deployment/environment-variables.md)** — Complete reference for all environment variables

---

## Guides

- **[AI Studio Pro Mode](guides/ai-studio-pro-mode.md)** — Use AI Studio paid API keys for enhanced image generation
- **[Internationalization](guides/i18n-guide.md)** — Understanding and extending i18n support

---

## Reference

- **[Architecture](reference/architecture.md)** — System architecture, data flow, and component relationships
- **[Firestore Security](reference/firestore-security.md)** — Security rules and data access patterns

---

## Language

English | [中文](zh/)
