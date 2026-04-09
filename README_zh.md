# ClipGenius — AI 剪贴板管理器

> 由 React 19 + Vite 构建的专业级 AI 剪贴板管理器。自动捕获图片、视频、文本、链接、Markdown 和代码片段，并通过 AI（Gemini、Minimax）进行分析，通过 Firebase 实现跨设备同步。

[English Version](README.md)

## 功能特性

### 智能剪贴板捕获
全局监听 `paste` 事件，自动将剪贴板内容分类为六种类型：

| 类型 | 检测逻辑 |
|---|---|
| `image` | `file.type.startsWith("image/")` |
| `video` | `file.type.startsWith("video/")` |
| `url` | 匹配 `https?://...` 正则表达式 |
| `markdown` | 包含 `#`、`**`、`-`、`*`、`` ``` ``、`[text](url)`、`>` |
| `code` | 语言感知启发式（json/xml/html/sql/python/go/rust/cpp/typescript/javascript/java/csharp/php/bash/yaml/toml）|
| `text` | 纯文本的默认类型 |

图片和视频以 base64 data URI 格式存储，其他类型以原始文本存储。

### AI 内容分析
登录并启用自动分析后，AI 自动生成：
- **推荐文件名** — 例如 `img_20260402_143052`
- **内容摘要** — 一段描述文字

分析在每次捕获后按条目触发，支持多种 AI 提供商（`gemini` 和 `minimax`，可按功能独立配置）。

### 多模态 AI 聊天
内置完整对话式 AI 助手：
- 将任意剪贴内容作为上下文附加到对话
- 流式输出 Gemini 3.1 Pro 的思考/推理过程
- 支持 Gemini 网络搜索
- 编程辅助，带语法高亮
- 支持 Markdown 和代码块渲染

### 图片生成
通过 Gemini 实现文本生成图片：
- **标准模式** — 免费，使用 `VITE_GEMINI_API_KEY`
- **专业模式** — 通过 `window.aistudio` 全局选择付费 AI Studio 密钥

### 语音实时对话
基于 Gemini 3.1 Flash Live（`gemini-3.1-flash-live-preview`）的实时语音交互。

### 云端同步（Firebase）
- **Firestore** 在 `/users/{userId}/pastes/{pasteId}` 存储剪贴历史
- **Firebase Auth** 支持 Google 账号登录（弹窗）
- **双写逻辑**：本地变更立即写入 IndexedDB；远程 Firestore 变更覆盖本地（元数据以云端为准）
- 云同步需登录认证 — 访客仅使用本地功能
- 对话消息存储于 `/users/{userId}/chats/{chatId}/messages/{messageId}`（chat ID 为附加的 Paste 条目 ID 或 `"default"`）

### 本地存储（IndexedDB）
所有数据通过 `idb` 库持久化到 IndexedDB。访客可完全离线使用。

## 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | React 19 + Vite 6 |
| 样式 | Tailwind CSS v4（`@tailwindcss/vite`）|
| 动画 | motion/react |
| AI SDK | `@google/genai` v1.29.0 |
| 后端 | Firebase Auth + Firestore v12 |
| 本地数据库 | IndexedDB via `idb` v8 |
| Markdown | `react-markdown` + `rehype-highlight` + `react-syntax-highlighter` |
| 图标 | `lucide-react` |
| 国际化 | `i18next` + `react-i18next` + `i18next-browser-languagedetector` |
| 虚拟滚动 | `@tanstack/react-virtual` |
| 文本预处理 | `@chenglou/pretext` |

## 文档

完整文档位于 [`docs/zh/`](./docs/zh/)，包括：
- [快速入门](./docs/zh/getting-started/) — 安装、配置、首次使用
- [使用指南](./docs/zh/guides/) — 各功能使用详解
- [架构设计](./docs/zh/architecture/) — 系统设计与数据流
- [参考手册](./docs/zh/reference/) — API、钩子、类型、环境变量
- [部署指南](./docs/zh/deployment/) — Google Cloud Run、CI/CD

## 架构

```
src/
├── App.tsx                      # 薄组合层
├── types.ts                     # PasteItem, ChatMessage, StoredAttachment
├── firebase.ts                  # Firebase 初始化
├── main.tsx                     # React 入口点
├── vite-env.d.ts               # Vite 类型定义
├── config/                      # AI 提示词配置
│   ├── prompts.ts              # 提示词加载器和工具函数
│   ├── prompts.en.json          # 英文提示词
│   └── prompts.zh.json          # 中文提示词
├── context/
│   ├── AuthContext.tsx           # Firebase Auth 状态
│   ├── AppContext.tsx            # 应用级状态（拖拽、模态框、设置）
│   └── ChatContext.tsx           # 聊天状态
├── hooks/
│   ├── useClipboard.ts           # paste 事件监听 + 类型检测
│   ├── usePasteStore.ts          # 粘贴条目增删改、自动分析开关
│   ├── useFirestoreSync.ts       # Firestore onSnapshot 订阅
│   └── useImageGen.ts            # 图片生成状态
├── components/
│   ├── layout/
│   │   ├── PasteZone.tsx         # 左侧面板 — 粘贴区
│   │   ├── HistoryPane.tsx       # 右侧面板 — 剪贴历史列表
│   │   └── SettingsModal.tsx     # 高级设置模态框
│   ├── paste/
│   │   ├── PasteCard.tsx         # 单个粘贴条目卡片
│   │   └── PastePreview.tsx      # 完整预览模态框，含语法高亮
│   ├── chat/
│   │   ├── ChatModal.tsx         # AI 聊天模态框
│   │   └── ChatContextItem.tsx   # 附加粘贴条目的内联上下文预览
│   └── imagegen/
│       └── ImageGenModal.tsx     # 图片生成 UI
├── services/
│   ├── ai/
│   │   ├── analyzeContent.ts     # 从 providers/ 重新导出
│   │   ├── generateImage.ts
│   │   ├── startLiveSession.ts
│   │   └── providers/
│   │       ├── index.ts          # Provider 路由
│   │       ├── types.ts
│   │       ├── capabilities.ts   # Provider 能力定义
│   │       ├── gemini.ts         # Gemini 内容分析
│   │       ├── gemini-chat.ts   # Gemini 聊天 + 思考流
│   │       ├── minimax.ts         # Minimax 内容分析
│   │       └── minimax-chat.ts   # Minimax 聊天
│   ├── clipboard/
│   │   └── clipboardUtils.ts
│   └── sync/
│       └── dualSync.ts           # Firestore + IndexedDB 双写
├── lib/
│   ├── db.ts                     # IndexedDB 操作（idb 封装）
│   ├── settings.ts                # localStorage 设置管理
│   ├── tabSync.ts               # BroadcastChannel 跨标签页同步
│   ├── syncEngine.ts            # SyncEngine 单例（冲突解决、重试）
│   ├── utils.ts
│   └── estimateCardHeight.ts
└── i18n/
    ├── index.ts
    └── locales/{en,zh}.json
```

### Provider 架构

所有 AI 功能通过可配置的 Provider 路由，由 `VITE_*_PROVIDER` 环境变量选择：

| 功能 | 默认 Provider | 默认模型 |
|---|---|---|
| 内容分析 | `gemini` | `gemini-3-flash-preview` |
| 聊天 | `gemini` | `gemini-3.1-pro-preview` |
| 语音实时对话 | `gemini` | `gemini-3.1-flash-live-preview` |
| 图片生成（标准） | `gemini` | `gemini-2.5-flash-image` |
| 图片生成（专业） | `gemini` | `gemini-3-pro-image-preview` |

替代 Provider：`minimax`。可通过 `VITE_ANALYSIS_PROVIDER`、`VITE_CHAT_PROVIDER` 等按功能独立覆盖。

**提供商能力说明：**

| Provider | 文本 | 图片 | 视频 |
|---|---|---|---|
| **Gemini** | ✅ | ✅ | ✅ |
| **Minimax** | ✅ | ❌ | ❌ |

Minimax 文本模型仅支持文本输入。应用内置能力检查，在尝试使用不支持的功能时会显示友好的错误提示。

## 快速开始

### 1. 克隆并安装

```bash
git clone <repo-url>
npm install
```

### 2. 配置环境变量

将 `.env.example` 复制为 `.env` 并填写所有必填值：

```env
# Firebase（云同步必需）
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_FIRESTORE_DB="your-firestore-database-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"

# Gemini API 密钥（AI 功能必需）
VITE_GEMINI_API_KEY="your-gemini-api-key"

# 应用 URL
VITE_APP_URL="http://localhost:3000"
```

Firebase 配置请从 [Firebase Console](https://console.firebase.google.com/) 获取。Gemini API 密钥请从 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取。

### 3. 启动

```bash
npm run dev       # 开发服务器 → http://localhost:3000
npm run build     # 生产构建 → dist/
npm run preview   # 本地预览生产构建
npm run lint     # TypeScript 类型检查（tsc --noEmit）
npm run clean     # 清除 dist/
```

## 部署

部署到 Google Cloud Run。详见 [`docs/zh/deployment/`](./docs/zh/deployment/)：
- [Google Cloud Run](./docs/zh/deployment/google-cloud-run.md) — 主要部署目标（AI Studio 集成）
- [CI/CD](./docs/zh/deployment/ci-cd.md) — GitHub Actions 工作流

## 高级设置

应用内置高级设置模态框（PasteZone 顶部的设置按钮），可配置：
- Firebase 配置
- AI 提供商选择（分析、聊天、语音、图片生成）
- Gemini 和 Minimax 的 API 密钥
- 各功能的模型覆盖

设置存储在浏览器 `localStorage` 中，跨会话保留。

## 数据模型

```typescript
PasteItem {
  id: string
  type: PasteType         // "image" | "text" | "url" | "video" | "markdown" | "code"
  content: string         // base64 data URI（图片/视频）或原始文本
  mimeType: string
  timestamp: Date
  suggestedName: string
  summary?: string
  isAnalyzing: boolean
  isPinned?: boolean       // 默认 false
  userId: string            // Firebase UID（访客为空字符串）
}

ChatMessage {
  id: string
  role: "user" | "model"
  text: string
  thinking?: string        // 流式推理过程
  timestamp: Date
  attachments?: StoredAttachment[]
  isResponding?: boolean  // 模型已开始流式输出但尚未返回内容时为 true
}

StoredAttachment {
  id: string
  type: PasteType
  content: string          // base64 data URI
  mimeType: string
  suggestedName: string
}
```
