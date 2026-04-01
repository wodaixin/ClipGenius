# Quick Start Guide

Get ClipGenius running locally in under 5 minutes.

---

## Prerequisites

- **Node.js** 18 or higher
- **npm** (bundled with Node.js)
- **Google Account** for Gemini API keys
- **Firebase Account** (optional, for cloud sync across devices)

---

## 1. Clone and Install

```bash
git clone <repo-url>
cd ClipGenius
npm install
```

---

## 2. Obtain API Keys

### Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Copy the key to your clipboard

### Firebase Project (Optional, for Cloud Sync)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** and follow the wizard
3. Once created, go to **Project settings** (gear icon)
4. Under **Your apps**, click the Web icon (`</>`)
5. Register your app and copy the configuration values

---

## 3. Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# Firebase (required for cloud sync)
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_FIRESTORE_DB="(default)"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"

# Gemini API key (required for AI features)
VITE_GEMINI_API_KEY="your-gemini-api-key"

# App URL
VITE_APP_URL="http://localhost:3000"
```

> See [Environment Variables](deployment/environment-variables.md) for the complete reference.

---

## 4. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Capture Your First Paste

Press `Cmd+V` (macOS) or `Ctrl+V` (Windows/Linux) anywhere on the page to capture clipboard content. ClipGenius automatically classifies it into one of these types:

| Type | Detection |
|------|-----------|
| **Image** | Screenshots, photos copied from other apps |
| **Video** | Video clips from clipboard |
| **URL** | Links starting with `http://` or `https://` |
| **Markdown** | Text containing headings (`#`), bold (`**`), lists (`-`), code blocks (\`\`\`), links, or blockquotes |
| **Code** | Text matching language-specific patterns (Python, TypeScript, SQL, etc.) |
| **Text** | Plain text without other classifications |

---

## 6. Enable Cloud Sync (Optional)

Click **Login with Google** in the top-right corner to sign in. Your clipboard history will:

- Sync to Firestore automatically
- Be available across all your devices
- Persist even after clearing browser data

---

## Next Steps

- **[Feature Guides](features/)** — Deep dives on every feature
- **[Cloud Run Deployment](deployment/cloud-run-ai-studio.md)** — Deploy to production
- **[Architecture Reference](reference/architecture.md)** — Understand the system design
