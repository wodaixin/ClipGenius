# 高级设置

应用内置了完整的高级设置模态框，可用于配置 Firebase、AI 提供商和 API 密钥，无需修改环境变量或重新构建项目。

---

## 访问设置

点击 PasteZone 顶部的 **高级设置（Advanced Settings）** 按钮打开设置模态框。

> 设置存储在浏览器 `localStorage` 中，会跨会话保留。请勿在公共/共享设备上使用。

---

## 设置分类

### Firebase 配置

配置 Firebase 项目设置以启用云同步：

| 字段 | 说明 |
|---|---|
| API 密钥 | Firebase API 密钥 |
| 认证域名 | Firebase Auth 域名（如 `your-app.firebaseapp.com`） |
| 项目 ID | Firebase 项目标识符 |
| 存储桶 | Cloud Storage 存储桶 URL |
| 消息发送者 ID | FCM 发送者 ID |
| 应用 ID | Firebase Web 应用 ID |

### AI 配置

配置 AI 提供商的 API 密钥：

| 字段 | 说明 |
|---|---|
| Gemini API 密钥 | Gemini 功能的 API 密钥 |
| Minimax API 密钥 | Minimax 功能的 API 密钥 |
| Minimax 基础 URL | Minimax API 端点（默认：`https://api.minimaxi.com/anthropic`） |

### 提供商选择

为每个功能选择要使用的 AI 提供商。这些设置会覆盖环境变量：

| 功能 | 选项 |
|---|---|
| 内容分析提供商 | Gemini / Minimax |
| 聊天提供商 | Gemini / Minimax |
| 实时语音提供商 | Gemini / Minimax |
| 图片生成提供商（标准） | Gemini / Minimax |
| 图片生成提供商（专业） | Gemini / Minimax |

### 模型覆盖

可选地覆盖每个功能的默认模型：

| 字段 | 占位符 |
|---|---|
| 分析模型 | `gemini-2.0-flash-exp`（可选） |
| 聊天模型 | `gemini-3.1-pro-preview`（可选） |
| 实时语音模型 | `gemini-3.1-flash-live-preview`（可选） |
| 图片生成模型 - 标准 | `gemini-2.5-flash-image`（可选） |
| 图片生成模型 - 专业 | `gemini-3-pro-image-preview`（可选） |

---

## 提供商能力

请记住不同提供商有不同的能力：

| Provider | 文本 | 图片 | 视频 |
|---|---|---|---|
| **Gemini** | ✅ | ✅ | ✅ |
| **Minimax** | ✅ | ❌ | ❌ |

如果你为聊天选择 Minimax 但附加了图片，将会收到错误消息，提示该提供商不支持多模态输入。

---

## 保存设置

1. 点击 **保存（Save）** 将设置持久化到 `localStorage`
2. 系统会提示确认是否重新加载页面
3. 设置在页面重新加载后生效

---

## 相关文档

- [环境变量参考](../deployment/environment-variables.md) — 服务器端配置
- [Provider 能力说明](../deployment/environment-variables.md#provider-能力说明) — 提供商功能对比
