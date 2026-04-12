# Google Cloud Run

ClipGenius is designed for deployment on Google Cloud Run with AI Studio integration. This is the primary deployment target.

## How It Works

Unlike a typical SPA deployment, the Cloud Run container runs `npm run dev` directly, serving on port 3000. This enables:
- **AI Studio key selection**: The `window.aistudio` global is provided by the AI Studio host environment
- **Vite dev proxy**: The `/api/minimax` proxy is active in the container
- **HMR disabled**: Set `DISABLE_HMR=true` in production to disable Vite's WebSocket HMR server

## Prerequisites

- Google Cloud project with Cloud Run API enabled
- [AI Studio](https://aistudio.google.com/) connected to the project
- GitHub repo connected to AI Studio for CI/CD

## Environment Variables

Set these in Cloud Run environment variables or AI Studio secrets:

| Variable | Value |
|---|---|
| `DISABLE_HMR` | `true` |
| `VITE_GEMINI_API_KEY` | your-gemini-api-key |
| `VITE_APP_URL` | your-cloud-run-url |
| `VITE_MINIMAX_API_KEY` | your-minimax-key |
| `VITE_MINIMAX_BASE_URL` | `https://api.minimaxi.com/anthropic` |
| All `VITE_*_PROVIDER` / `VITE_*_MODEL` | as needed |

## Docker

A `Dockerfile` at the project root runs the app:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

Build and push:

```bash
docker build -t gcr.io/your-project/clipgenius .
docker push gcr.io/your-project/clipgenius
```

Deploy to Cloud Run:

```bash
gcloud run deploy clipgenius \
  --image gcr.io/your-project/clipgenius \
  --port 3000 \
  --allow-unauthenticated \
  --set-env-vars DISABLE_HMR=true
```

## Health Check

Configure a health check endpoint if needed. The Vite dev server responds to `/` with the `index.html`. For production readiness, consider adding a `/health` endpoint that returns `200 OK`.

## Scaling

Set minimum instances to `1` to avoid cold starts. The Gemini API has rate limits; consider setting max instances based on expected concurrency.
