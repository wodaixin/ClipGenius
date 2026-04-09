# CI/CD

## GitHub Actions Workflow

A typical workflow on push to `main`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build Docker image
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT }}/clipgenius:${{ github.sha }} .
          docker push gcr.io/${{ secrets.GCP_PROJECT }}/clipgenius:${{ github.sha }}

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy clipgenius \
            --image gcr.io/${{ secrets.GCP_PROJECT }}/clipgenius:${{ github.sha }} \
            --platform managed \
            --region us-central1 \
            --port 3000 \
            --allow-unauthenticated \
            --set-env-vars DISABLE_HMR=true \
              VITE_FIREBASE_PROJECT_ID=${{ secrets.VITE_FIREBASE_PROJECT_ID }} \
              VITE_FIREBASE_APP_ID=${{ secrets.VITE_FIREBASE_APP_ID }} \
              VITE_FIREBASE_API_KEY=${{ secrets.VITE_FIREBASE_API_KEY }} \
              VITE_FIREBASE_AUTH_DOMAIN=${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }} \
              VITE_FIREBASE_FIRESTORE_DB=${{ secrets.VITE_FIREBASE_FIRESTORE_DB }} \
              VITE_FIREBASE_STORAGE_BUCKET=${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }} \
              VITE_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }} \
              VITE_GEMINI_API_KEY=${{ secrets.VITE_GEMINI_API_KEY }} \
              VITE_APP_URL=${{ secrets.VITE_APP_URL }}
        env:
          GCP_SERVICE_ACCOUNT_KEY: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}
```

## Secrets Management

Store all sensitive values as GitHub repository secrets:

| Secret | Description |
|---|---|
| `GCP_PROJECT` | Google Cloud project ID |
| `GCP_SERVICE_ACCOUNT_KEY` | JSON key for a Cloud Run Deployer service account |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_FIRESTORE_DB` | Firestore database ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_GEMINI_API_KEY` | Gemini API key |
| `VITE_APP_URL` | Deployed app URL |
| `VITE_MINIMAX_API_KEY` | Minimax API key (optional) |

## AI Studio Export

AI Studio's "Export to GitHub" feature syncs code changes from AI Studio back to GitHub. Configure this in AI Studio settings. Note: this is a one-way sync (AI Studio → GitHub) and does not trigger GitHub Actions on its own.

## Branch Strategy

```
feature/xyz → PR → main → deploy to Cloud Run
```

Use feature branches for all changes. Require at least one approval before merging to `main`.
