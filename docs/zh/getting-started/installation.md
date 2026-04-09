# 安装指南

## 1. 克隆并安装

```bash
git clone <仓库地址>
cd ClipGenius
npm install
```

## 2. 配置环境变量

将 `.env.example` 复制为 `.env` 并填写所需值：

```bash
cp .env.example .env
```

编辑 `.env`，以下是需要填写的内容。获取各密钥的方式请参考 [Firebase 配置](./firebase-setup.md) 和[环境变量参考](../reference/env-variables.md)。

### 所有用户都需要填写

```env
# Firebase（从 https://console.firebase.google.com/ 获取）
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
VITE_FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_FIRESTORE_DB="your-firestore-database-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"

# Gemini API 密钥（从 https://aistudio.google.com/app/apikey 获取）
VITE_GEMINI_API_KEY="your-gemini-api-key"

# 应用 URL
VITE_APP_URL="http://localhost:3000"
```

### 可选：Minimax（备选 AI 提供商）

```env
VITE_MINIMAX_API_KEY=""
VITE_MINIMAX_BASE_URL="https://api.minimaxi.com/anthropic"
```

### 可选：按功能覆盖提供商

```env
# 留空则使用默认配置（所有功能默认使用 Gemini）
VITE_ANALYSIS_PROVIDER=""
VITE_ANALYSIS_MODEL=""
VITE_CHAT_PROVIDER=""
VITE_CHAT_MODEL=""
VITE_LIVE_PROVIDER=""
VITE_LIVE_MODEL=""
VITE_IMAGE_STANDARD_PROVIDER=""
VITE_IMAGE_STANDARD_MODEL=""
VITE_IMAGE_PRO_PROVIDER=""
VITE_IMAGE_PRO_MODEL=""
```

### 可选：Facebook 视频下载的 CORS 代理

```env
# 未设置时默认使用 https://corsproxy.io
VITE_CORS_PROXY_URL=""
```

## 3. 启动开发服务器

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

## 4. 验证

你应该能看到 ClipGenius 的粘贴区域。在输入框以外的区域按 `Cmd/Ctrl+V` 来捕获剪贴板内容。

## 常见问题

### "Firebase: Error (auth/network-request-failed)"

网络连接问题。检查网络和防火墙设置。如需代理，配置 npm：

```bash
npm config set proxy http://proxy-host:port
npm config set https-proxy http://proxy-host:port
```

### "API key not valid"

确认 `.env` 中的 `VITE_GEMINI_API_KEY` 与 [Google AI Studio](https://aistudio.google.com/app/apikey) 中的密钥一致。密钥格式为 `AIza...` 开头。

### "粘贴事件未被捕获"

- ClipGenius 忽略在 `<input>`、`<textarea>` 或 `contenteditable` 元素内的粘贴事件。请在未聚焦输入框的区域进行粘贴。
- 确认当前标签页不是隐藏的。

### "Facebook 视频下载报 CORS 错误"

设置 `VITE_CORS_PROXY_URL` 为可用的 CORS 代理。默认值 `https://corsproxy.io` 在某些网络环境中可能被限速或屏蔽。

## 下一步

- [Firebase 配置](./firebase-setup.md) — 配置 Firebase Auth 和 Firestore
- [快速开始](./quick-start.md) — 完成首次剪贴板捕获
