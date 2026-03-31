# ClipGenius - AI Clipboard System

ClipGenius is a professional-grade AI clipboard manager that intelligently captures, analyzes, and organizes images, videos, text, and links using Gemini AI.

## Features

- **Intelligent Capture:** Automatically detects images, videos, URLs, and text from your clipboard.
- **AI Analysis:** Uses Gemini 3.1 Pro to provide summaries and suggested names for every item.
- **Multimodal Chat:** Integrated AI assistant that can answer questions about your captures, search the web, or help with coding.
- **Image Generation:** Create high-quality visual assets directly from text prompts.
- **Cloud Sync:** Securely stores your clipboard history in Firebase Firestore, synced across your devices.
- **Professional UI:** A clean, editorial-style interface designed for productivity.

## Setup

### Prerequisites

- Node.js 18+
- A Google Cloud Project with Firebase enabled.

### Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
GEMINI_API_KEY=your_gemini_api_key
APP_URL=your_app_url
```

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

This project is designed to be deployed on Google Cloud Run via AI Studio.

1. Connect your GitHub repository in AI Studio.
2. Use the **Export to GitHub** feature to sync your changes.
3. Configure your secrets (API keys) in the AI Studio settings.

## License

MIT
