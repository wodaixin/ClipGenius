# CI/CD

## GitHub Actions 工作流

推送到 `main` 时的典型工作流：

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

## Secrets 管理

将所有敏感值存储为 GitHub 仓库 secrets：

| Secret | 描述 |
|---|---|
| `GCP_PROJECT` | Google Cloud 项目 ID |
| `GCP_SERVICE_ACCOUNT_KEY` | Cloud Run Deployer 服务账号的 JSON 密钥 |
| `VITE_FIREBASE_PROJECT_ID` | Firebase 项目 ID |
| `VITE_FIREBASE_APP_ID` | Firebase 应用 ID |
| `VITE_FIREBASE_API_KEY` | Firebase API 密钥 |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth 域名 |
| `VITE_FIREBASE_FIRESTORE_DB` | Firestore 数据库 ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase 存储桶 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase 消息发送者 ID |
| `VITE_GEMINI_API_KEY` | Gemini API 密钥 |
| `VITE_APP_URL` | 部署后的应用 URL |
| `VITE_MINIMAX_API_KEY` | Minimax API 密钥（可选） |

## AI Studio Export

AI Studio 的「Export to GitHub」功能将 AI Studio 中的代码变更同步回 GitHub。在 AI Studio 设置中配置。注意：这是单向同步（AI Studio → GitHub），不会自动触发 GitHub Actions。

## 分支策略

```
feature/xyz → PR → main → 部署到 Cloud Run
```

所有变更使用功能分支。在合并到 `main` 前至少需要一人审批。
