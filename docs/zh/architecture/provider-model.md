# AI 提供商模型

所有 AI 功能都通过可配置的提供商抽象层路由。目前实现了两个提供商：**Gemini** 和 **Minimax**。

## 提供商接口

`AnalysisProvider` 接口（`src/services/ai/providers/types.ts`）定义了契约：

```typescript
interface AnalysisProvider {
  analyze(item: PasteItem): Promise<AnalysisResult>;
}
```

对于聊天，`ChatProvider` 接口定义了流式聊天：

```typescript
interface ChatProvider {
  streamChat(params: ChatProviderParams): Promise<AsyncGenerator<ChatChunk>>;
  chat(params: ChatProviderParams): Promise<ChatResponse>;
}
```

## 提供商注册表

每个功能都有一个路由器函数来选择提供商：

| 功能 | 路由器 | 默认值 |
|---|---|---|
| 内容分析 | `getAnalysisProvider(type)` | Gemini |
| 聊天 | `getChatProvider()` | Gemini |
| 语音对话 | `getLiveProvider()` | Gemini |
| 图片生成（标准） | `getImageStandardProvider()` | Gemini |
| 图片生成（专业） | `getImageProProvider()` | Gemini |

提供商的优先级选择顺序：
1. 应用内设置（存储在 `localStorage["clipgenius_settings"]`）
2. `VITE_<FEATURE>_PROVIDER` 环境变量
3. 硬编码默认值（`gemini`）

## 能力检查

在路由到提供商之前，应用通过 `src/services/ai/providers/capabilities.ts` 中的 `canProviderHandle(provider, contentType)` 检查提供商是否支持内容类型：

| 提供商 | 文本 | 图片 | 视频 |
|---|---|---|---|
| **Gemini** | ✅ `supportsText: true` | ✅ `supportsImage: true` | ✅ `supportsVideo: true` |
| **Minimax** | ✅ `supportsText: true` | ❌ `supportsImage: false` | ❌ `supportsVideo: false` |

如果提供商不支持内容类型，应用会 fallback 到 Gemini：

```typescript
// 在 analyzeContent.ts 中
if (!canProviderHandle(providerType, item.type)) {
  console.warn(`Provider "${providerType}" 不支持 "${item.type}" 内容，fallback 到 gemini`);
  providerType = "gemini";
}
```

对于聊天，如果用户尝试在使用 Minimax 时附加图片，UI 会显示 i18n 字符串中的 `providerNotSupported` 错误消息。

## 添加新提供商

详见[添加 AI 提供商](../development/adding-provider.md)的分步指南。
