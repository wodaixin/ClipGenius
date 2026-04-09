# 设置

所有设置可通过粘贴区顶部的设置图标访问，这会打开 `SettingsModal` 组件。

## 存储

设置存储在 `localStorage["clipgenius_settings"]` 中，格式为 `StoredSettings` 对象。它们在会话间持久化，但仅限本地浏览器（不同步到 Firebase）。

> **警告**：请勿在公共或共享设备上保存敏感信息。设置存储在明文 localStorage 中。

## 设置分区

### Firebase 配置

存储应用使用的 Firebase 凭证。变更后需要刷新页面才能生效。

| 字段 | 对应 Env 变量 |
|---|---|
| API Key | `VITE_FIREBASE_API_KEY` |
| Auth Domain | `VITE_FIREBASE_AUTH_DOMAIN` |
| Project ID | `VITE_FIREBASE_PROJECT_ID` |
| Storage Bucket | `VITE_FIREBASE_STORAGE_BUCKET` |
| Messaging Sender ID | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| App ID | `VITE_FIREBASE_APP_ID` |

### AI 配置

存储 AI API 密钥和端点。设置后这些会覆盖 `VITE_*` 环境变量。

| 字段 | 对应 Env 变量 |
|---|---|
| Gemini API Key | `VITE_GEMINI_API_KEY` |
| Minimax API Key | `VITE_MINIMAX_API_KEY` |
| Minimax Base URL | `VITE_MINIMAX_BASE_URL` |

### 提供商选择

配置每个功能使用的 AI 提供商。可选：`gemini` 或 `minimax`。

| 功能 | Env 变量 |
|---|---|
| 内容分析 | `VITE_ANALYSIS_PROVIDER` |
| 聊天 | `VITE_CHAT_PROVIDER` |
| 语音对话 | `VITE_LIVE_PROVIDER` |
| 图片生成（标准） | `VITE_IMAGE_STANDARD_PROVIDER` |
| 图片生成（专业） | `VITE_IMAGE_PRO_PROVIDER` |

可选的模型覆盖字段允许为每个功能指定非默认模型。

### 按内容类型的分析提供商

允许为每种内容类型（图片、文本、链接、视频、Markdown、代码）设置不同的 AI 提供商。存储在 `StoredSettings` 的 `analysisProvidersByType` 中。

默认路由：

| 类型 | 默认提供商 |
|---|---|
| `image` | Gemini |
| `text` | Minimax |
| `url` | Gemini |
| `video` | Gemini |
| `markdown` | Minimax |
| `code` | Minimax |

## 自动分析开关

粘贴区顶部的自动分析开关（不在设置弹窗内）控制新条目捕获时是否进行分析。存储在 `localStorage["autoAnalyze"]` 中，独立于 `clipgenius_settings`。

## 应用设置

所有设置在页面刷新后生效。设置界面会显示确认提示：「设置已保存。需要刷新页面以应用更改，是否立即刷新？」
