# 环境变量

所有环境变量必须以 `VITE_` 为前缀，在构建时嵌入。将 `.env.example` 复制为 `.env` 并填写值。

## Firebase 配置

| 变量 | 描述 | 获取方式 |
|---|---|---|
| `VITE_FIREBASE_PROJECT_ID` | Firebase 项目 ID | Firebase Console → Project Settings → General |
| `VITE_FIREBASE_APP_ID` | Firebase Web 应用 ID | Firebase Console → Project Settings → Your apps |
| `VITE_FIREBASE_API_KEY` | Firebase Web API 密钥 | Firebase Console → Project Settings → Your apps |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth 域名 | Firebase Console → Project Settings → Your apps |
| `VITE_FIREBASE_FIRESTORE_DB` | Firestore 数据库 ID | Firebase Console → Firestore → (default) |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage 存储桶 | Firebase Console → Project Settings → General |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM Sender ID（未使用但必需） | Firebase Console → Project Settings → Cloud Messaging |

## AI 配置

| 变量 | 描述 | 默认值 | 获取方式 |
|---|---|---|---|
| `VITE_GEMINI_API_KEY` | Gemini API 密钥（所有 AI 功能） | — | [Google AI Studio](https://aistudio.google.com/app/apikey) |

### Minimax

| 变量 | 描述 | 默认值 |
|---|---|---|
| `VITE_MINIMAX_API_KEY` | Minimax API 密钥 | — |
| `VITE_MINIMAX_BASE_URL` | Minimax API 基础 URL | `https://api.minimaxi.com/anthropic` |

## 按功能覆盖提供商

留空则使用默认提供商（所有功能默认为 Gemini）。

| 变量 | 描述 | 默认值 |
|---|---|---|
| `VITE_ANALYSIS_PROVIDER` | 内容分析的提供商 | `gemini` |
| `VITE_ANALYSIS_MODEL` | 分析模型覆盖 | — |
| `VITE_CHAT_PROVIDER` | 聊天的提供商 | `gemini` |
| `VITE_CHAT_MODEL` | 聊天模型覆盖 | — |
| `VITE_LIVE_PROVIDER` | 语音对话的提供商 | `gemini` |
| `VITE_LIVE_MODEL` | 语音对话模型覆盖 | — |
| `VITE_IMAGE_STANDARD_PROVIDER` | 图片生成（标准）的提供商 | `gemini` |
| `VITE_IMAGE_STANDARD_MODEL` | 标准图片生成模型覆盖 | — |
| `VITE_IMAGE_PRO_PROVIDER` | 图片生成（专业）的提供商 | `gemini` |
| `VITE_IMAGE_PRO_MODEL` | 专业图片生成模型覆盖 | — |

**有效提供商值**：`gemini`、`minimax`

### 默认模型

| 功能 | 默认模型 |
|---|---|
| 内容分析 | `gemini-3-flash-preview` |
| 聊天 | `gemini-3.1-pro-preview` |
| 语音对话 | `gemini-3.1-flash-live-preview` |
| 图片生成（标准） | `gemini-2.5-flash-image` |
| 图片生成（专业） | `gemini-3-pro-image-preview` |

## 应用

| 变量 | 描述 | 默认值 |
|---|---|---|
| `VITE_APP_URL` | 应用 URL | `http://localhost:3000` |
| `VITE_CORS_PROXY_URL` | Facebook 视频下载的 CORS 代理 | `https://corsproxy.io` |
