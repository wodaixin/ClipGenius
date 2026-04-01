# 环境变量参考

ClipGenius 使用环境变量配置 Firebase、AI 服务和应用行为。所有环境变量必须以 `VITE_` 开头。

## Firebase 配置

| 变量名 | 必需 | 说明 | 示例 |
|---|---|---|---|
| `VITE_FIREBASE_PROJECT_ID` | 是 | Firebase 项目 ID | `my-project-123` |
| `VITE_FIREBASE_APP_ID` | 是 | Firebase 应用 ID | `1:123456:web:abc` |
| `VITE_FIREBASE_API_KEY` | 是 | Firebase API 密钥 | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | 是 | Firebase Auth 域名 | `my-project.firebaseapp.com` |
| `VITE_FIREBASE_FIRESTORE_DB` | 是 | Firestore 数据库 ID | `my-project` |
| `VITE_FIREBASE_STORAGE_BUCKET` | 是 | Cloud Storage 存储桶 | `my-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 是 | Firebase Messaging Sender ID | `123456789` |

## AI — Gemini

| 变量名 | 必需 | 说明 | 示例 |
|---|---|---|---|
| `VITE_GEMINI_API_KEY` | 是 | Gemini API 密钥（免费额度） | `AIza...` |

## Provider 选择

控制不同 AI 功能使用哪个 Provider：

| 变量名 | 可选值 | 默认值 | 说明 |
|---|---|---|---|
| `VITE_ANALYSIS_PROVIDER` | `gemini` / `minimax` | `gemini` | 内容分析 Provider |
| `VITE_ANALYSIS_MODEL` | 模型名 | `gemini-3-flash-preview` | 内容分析模型 |
| `VITE_CHAT_PROVIDER` | `gemini` / `minimax` | `gemini` | 聊天 Provider |
| `VITE_CHAT_MODEL` | 模型名 | `gemini-3.1-pro-preview` | 聊天模型 |
| `VITE_LIVE_PROVIDER` | `gemini` / `minimax` | `gemini` | 实时语音 Provider |
| `VITE_LIVE_MODEL` | 模型名 | `gemini-3.1-flash-live-preview` | 实时语音模型 |
| `VITE_IMAGE_PROVIDER` | `gemini` / `minimax` | `gemini` | 图片生成 Provider |
| `VITE_IMAGE_STANDARD_MODEL` | 模型名 | `gemini-2.5-flash-image` | 标准图片模型 |
| `VITE_IMAGE_PRO_MODEL` | 模型名 | `gemini-3-pro-image-preview` | 专业图片模型 |

## Minimax 配置

当 Provider 设为 `minimax` 时需要：

| 变量名 | 必需 | 说明 |
|---|---|---|
| `VITE_MINIMAX_API_KEY` | 是（使用 minimax 时） | Minimax API 密钥 |
| `VITE_MINIMAX_BASE_URL` | 是（使用 minimax 时） | Minimax API 地址 |

## Application

| 变量名 | 必需 | 说明 | 示例 |
|---|---|---|---|
| `VITE_APP_URL` | 是 | 应用部署 URL | `https://my-app.cloudfunctions.net` |

## 配置示例

### 开发环境 (.env)

```env
# Firebase
VITE_FIREBASE_PROJECT_ID=my-dev-project
VITE_FIREBASE_APP_ID=1:123456:web:dev
VITE_FIREBASE_API_KEY=AIzaSyDev...
VITE_FIREBASE_AUTH_DOMAIN=my-dev-project.firebaseapp.com
VITE_FIREBASE_FIRESTORE_DB=my-dev-project
VITE_FIREBASE_STORAGE_BUCKET=my-dev-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789

# Gemini
VITE_GEMINI_API_KEY=AIzaSyProd...

# App
VITE_APP_URL=http://localhost:3000
```

### 生产环境

生产环境变量通过 AI Studio 或 CI/CD 管道注入，不需要在本地 `.env` 文件中配置。

## 相关文档

- [快速入门](../quick-start.md) — 基础配置步骤
- [Firebase 配置](./firebase-setup.md) — Firebase 项目创建
- [Provider 架构](../reference/architecture.md) — 多 Provider 路由
