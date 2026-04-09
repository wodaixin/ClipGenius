# Google Cloud Run

ClipGenius 设计用于通过 AI Studio 集成部署在 Google Cloud Run 上。这是主要的部署目标。

## 工作原理

与典型的 SPA 部署不同，Cloud Run 容器直接运行 `npm run dev`，在端口 3000 上提供服务。这使得：
- **AI Studio 密钥选择**：`window.aistudio` 全局对象由 AI Studio 主机环境提供
- **Vite 开发代理**：容器中 `/api/minimax` 代理处于活动状态
- **禁用 HMR**：在生产环境中设置 `DISABLE_HMR=true` 以禁用 Vite 的 WebSocket HMR 服务器

## 前置条件

- 已启用 Cloud Run API 的 Google Cloud 项目
- 连接到该项目的 [AI Studio](https://aistudio.google.com/)
- 连接到 AI Studio 的 GitHub 仓库（用于 CI/CD）

## 环境变量

在 Cloud Run 环境变量或 AI Studio secrets 中设置：

| 变量 | 值 |
|---|---|
| `DISABLE_HMR` | `true` |
| `VITE_FIREBASE_PROJECT_ID` | your-project-id |
| `VITE_FIREBASE_APP_ID` | your-app-id |
| `VITE_FIREBASE_API_KEY` | your-api-key |
| `VITE_FIREBASE_AUTH_DOMAIN` | your-project.firebaseapp.com |
| `VITE_FIREBASE_FIRESTORE_DB` | your-firestore-database-id |
| `VITE_FIREBASE_STORAGE_BUCKET` | your-project.firebasestorage.app |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | your-sender-id |
| `VITE_GEMINI_API_KEY` | your-gemini-api-key |
| `VITE_APP_URL` | your-cloud-run-url |
| `VITE_MINIMAX_API_KEY` | your-minimax-key |
| `VITE_MINIMAX_BASE_URL` | `https://api.minimaxi.com/anthropic` |
| 所有 `VITE_*_PROVIDER` / `VITE_*_MODEL` | 按需设置 |

## Docker

项目根目录的 `Dockerfile` 运行应用：

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

构建并推送：

```bash
docker build -t gcr.io/your-project/clipgenius .
docker push gcr.io/your-project/clipgenius
```

部署到 Cloud Run：

```bash
gcloud run deploy clipgenius \
  --image gcr.io/your-project/clipgenius \
  --port 3000 \
  --allow-unauthenticated \
  --set-env-vars DISABLE_HMR=true
```

## 健康检查

如有需要，配置健康检查端点。Vite 开发服务器对 `/` 返回 `index.html`。为生产就绪考虑，添加返回 `200 OK` 的 `/health` 端点。

## 扩缩容

将最小实例数设置为 `1` 以避免冷启动。Gemini API 有速率限制，根据预期并发量考虑设置最大实例数。
