# 语音实时对话

ClipGenius 支持基于 Gemini 3.1 Flash Live 的实时语音交互。

## 会话模型

使用模型：`gemini-3.1-flash-live-preview`

该模型专为实时语音场景优化，支持：
- 双向音频流
- 实时语音识别
- 低延迟响应

## 麦克风流式传输

麦克风音频以流式方式发送到 Gemini：

```typescript
// 音频格式
mimeType: "audio/webm;codecs=opus"

// 配置示例
const audioConfig = {
  mimeType: "audio/webm;codecs=opus",
  sampleRate: 16000,
  bitsPerSample: 16
};
```

## 音频播放

AI 返回的音频响应使用队列机制播放：

```typescript
// 接收到的音频块暂存
const pendingChunks: ArrayBuffer[] = [];

// 播放队列中的音频
function playNextChunk() {
  if (pendingChunks.length > 0) {
    const chunk = pendingChunks.shift();
    playAudio(chunk);
    playNextChunk();
  }
}
```

## 语音转录

系统实时将语音输入转为文本：

- 用户说话 → 转录为文字 → 发送给 AI
- AI 回复 → 转录为文字 → 显示在界面上

## 会话生命周期

| 状态 | 说明 |
|---|---|
| `idle` | 未连接，等待用户开始 |
| `connecting` | 正在建立 WebSocket 连接 |
| `active` | 连接建立，开始语音交互 |
| `error` | 连接失败，显示错误提示 |
| `closed` | 会话结束，清理资源 |

## 系统指令

语音助手使用专用的系统指令：

```
你是 ClipGenius 语音助手。请简洁且有帮助。请用中文回复。
```

## 浏览器兼容性

语音功能需要浏览器支持以下 API：

- `MediaRecorder` — 麦克风访问
- `AudioContext` — 音频播放
- WebSocket — 与 Gemini Live 服务通信

推荐使用：
- Chrome 94+
- Edge 94+
- Safari 15.4+

## 相关文档

- [AI 聊天](./ai-chat.md) — 文本聊天模式
- [环境变量参考](../deployment/environment-variables.md) — Live API 配置
