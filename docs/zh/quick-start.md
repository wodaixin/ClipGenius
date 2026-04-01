# 快速入门指南

本指南将帮助你在几分钟内启动并运行 ClipGenius。

## 前置要求

- **Node.js 18+**：推荐使用最新的 LTS 版本
- **npm**：随 Node.js 一起安装
- **Google 账户**：用于登录和云同步
- **Firebase 账户**（可选）：用于跨设备数据同步

## 安装步骤

### 1. 克隆并安装

```bash
git clone <仓库地址>
cd ClipGenius
npm install
```

### 2. 获取 API 密钥

#### Gemini API 密钥（必需）

1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 点击 "Create API Key"
3. 复制生成的密钥

#### Firebase 配置（可选，用于云同步）

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 创建新项目或选择现有项目
3. 添加 Web 应用
4. 复制配置信息

### 3. 配置环境变量

复制示例配置文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的密钥：

```env
# Firebase 配置
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_FIRESTORE_DB="your-firestore-database"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"

# Gemini API 密钥
VITE_GEMINI_API_KEY="your-gemini-api-key"

# 应用 URL
VITE_APP_URL="http://localhost:3000"
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。

## 首次使用

1. **粘贴内容**：按下 `Command + V`（Mac）或 `Ctrl + V`（Windows/Linux）粘贴内容
2. **查看分类**：ClipGenius 会自动识别内容类型（图片、视频、文本、链接、Markdown、代码）
3. **启用 AI 分析**：登录后，自动 AI 分析会根据内容生成文件名和摘要

## 启用云同步

1. 点击界面中的"使用 Google 登录"按钮
2. 授权 ClipGenius 访问你的 Google 账户
3. 登录后，你的数据会自动同步到 Firestore

## 下一步

- [剪贴板捕获功能详解](./features/clipboard-capture.md)
- [AI 内容分析](./features/ai-analysis.md)
- [多模态 AI 聊天](./features/ai-chat.md)
- [Firebase 配置指南](./deployment/firebase-setup.md)
- [部署到 Cloud Run](./deployment/cloud-run-ai-studio.md)
