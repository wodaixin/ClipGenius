# Deploy to Cloud Run via AI Studio

**Overview** — ClipGenius is designed for Google Cloud Run deployment via AI Studio. AI Studio manages the CI/CD pipeline, environment secrets, and Cloud Run service configuration. You connect your GitHub repo once, and AI Studio handles builds and deployments automatically.

**Prerequisites**

- Google Cloud account with billing enabled
- GitHub account with the ClipGenius repository connected
- Access to [Google AI Studio](https://aistudio.google.com/)
- Gemini API key (from AI Studio)
- Firebase project (for cloud sync features)

**1. Connect GitHub Repository**

1. Open [Google AI Studio](https://aistudio.google.com/)
2. Navigate to Settings → Connected Apps → GitHub
3. Connect your GitHub account and authorize the ClipGenius repository
4. In AI Studio, go to your project → Deploy → Enable deployment
5. Select the ClipGenius repository and configure the build trigger

**2. Configure Environment Secrets**

In AI Studio Settings → Secrets, add all required environment variables:

| Secret Name | Example Value |
|---|---|
| `VITE_GEMINI_API_KEY` | `AIza...` |
| `VITE_FIREBASE_PROJECT_ID` | `clipgenius-app` |
| `VITE_FIREBASE_APP_ID` | `1:...:web:...` |
| `VITE_FIREBASE_API_KEY` | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `clipgenius-app.firebaseapp.com` |
| `VITE_FIREBASE_FIRESTORE_DB` | `(default)` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `clipgenius-app.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789` |
| `VITE_APP_URL` | `https://your-service.run.app` |

See [Environment Variables](environment-variables.md) for the complete reference.

**3. The `window.aistudio` Global**

When deployed via AI Studio, the runtime injects a `window.aistudio` global that provides:
- `hasSelectedApiKey()` — check if a paid key is selected
- `openSelectKey()` — open the AI Studio key picker
- `getSelectedApiKey()` — retrieve the selected key

This global is only available in AI Studio deployments. It is not available in local development or generic Cloud Run deployments. See [AI Studio Pro Mode](../guides/ai-studio-pro-mode.md) for details.

**4. Export to GitHub**

AI Studio's "Export to GitHub" feature synts configuration changes back to the repo. This creates a PR or commits directly to the configured branch.

**5. Build Output**

`npm run build` produces a `dist/` directory containing the production static assets. These are served by Cloud Run's nginx-based static file server.

**6. Custom Domain (Optional)**

To use a custom domain, configure it in Cloud Run → Manage Custom Domains. Refer to the [Cloud Run documentation](https://cloud.google.com/run/docs/mapping-custom-domains) for setup instructions.
