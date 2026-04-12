# AI 聊天

ClipGenius 集成了完整的多模态对话 AI 助手，支持流式响应和实时语音交互。

## 打开聊天

点击任意 PasteCard 上的聊天图标，以该条目为上下文打开聊天弹窗。也可以从粘贴区顶部不带上下文打开聊天。

**聊天 ID 映射**：聊天 ID 等于所附粘贴条目的 `id`，无上下文时为 `"default"`。这意味着每个粘贴条目都有独立的聊天历史。

## 上下文附加

当粘贴条目被附加到聊天时：

- **图片和视频**：作为 base64 `StoredAttachment` 对象存储在消息的 `attachments` 数组中，作为内联数据发送给模型。
- **文本、链接、Markdown、代码**：以内联文本形式包含在系统提示词中。
- `chatId`（粘贴条目 ID）持久化到 IndexedDB。

## 流式响应

Gemini 聊天同时流式传输两种类型的块：

1. **思考块**（带有 `candidate.supplements?.thought` 的 `turnComplete` 事件）：累积到 model 消息的 `thinking` 字段。
2. **文本块**（`contentBlocks`）：追加到 `text` 字段。

当块正在到达时，`isStreaming` 标志为 `true`。当 `turnComplete` 触发时，流式传输结束。

## 中止

在流式响应过程中点击 **Cancel** 会调用 `abortController.abort()`，停止 fetch 请求并关闭 Gemini 会话。部分响应会被丢弃。用户可以随后发送新消息。

## 语音对话

点击麦克风按钮启动实时语音对话。这会打开一个 Gemini 3.1 Flash Live 会话（`gemini-3.1-flash-live-preview`）：

1. 浏览器请求麦克风权限
2. 音频双向流式传输到 Gemini
3. 转录文本实时显示在 `liveTranscription` 中
4. 模型响应通过 `AudioContext` 和待处理块队列进行语音播放

语音对话使用 `live` 功能配置的提供商和模型（默认为 Gemini）。通过 `LiveSessionConnection.close()` 关闭会话。

## 提供商能力

| 内容类型 | Gemini | Minimax |
|---|---|---|
| 文本 | ✅ | ✅ |
| 图片 | ✅ | ❌ |
| 视频 | ✅ | ❌ |

如果在使用 Minimax 时附加了图片或视频上下文，应用会显示来自 `src/i18n/locales/en.json` / `zh.json` 的 `providerNotSupported` 错误。系统会提示用户在设置中切换到 Gemini。
