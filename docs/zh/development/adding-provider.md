# 添加 AI 提供商

本指南逐步说明如何向 ClipGenius 添加新的 AI 提供商（例如 OpenAI、Claude、自定义 LLM）。

## 概述

每个功能（分析、聊天）都有一个提供商接口。你需要实现相关接口并在路由器中注册提供商。

## 第一步：定义提供商能力

编辑 `src/services/ai/providers/capabilities.ts`：

```typescript
// 将你的提供商添加到能力映射
export const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
  // ... 现有提供商 ...
  yourprovider: {
    supportsText: true,
    supportsImage: true,    // 根据你的模型设置
    supportsVideo: false,
  },
};
```

## 第二步：实现分析提供商

创建 `src/services/ai/providers/yourprovider.ts`：

```typescript
import { PasteItem } from "../../../types";
import { AnalysisProvider, AnalysisResult } from "./types";

export const yourProviderAnalysisProvider: AnalysisProvider = {
  async analyze(item: PasteItem): Promise<AnalysisResult> {
    // 实现内容分析
    // 返回 { suggestedName, summary }
  },
};
```

对于多模态内容（图片/视频），在 API 请求中包含 base64 数据 URI。

## 第三步：实现聊天提供商

创建 `src/services/ai/providers/yourprovider-chat.ts`：

```typescript
import { ChatProvider, ChatProviderParams } from "./chat-types";

export const yourProviderChatProvider: ChatProvider = {
  async streamChat(params: ChatProviderParams) {
    // 当响应流式传输时产生 ChatChunk 对象
    // 产生 { type: 'thinking', text } 用于推理块
    // 产生 { type: 'text', text } 用于内容块
    // 完成后产生 { type: 'done' }
  },
  async chat(params) {
    // 非流式版本
  },
};
```

## 第四步：在路由器中注册

编辑 `src/services/ai/providers/index.ts`：

```typescript
import { yourProviderAnalysisProvider } from "./yourprovider";
import { yourProviderChatProvider } from "./yourprovider-chat";

// 添加到分析提供商映射
const analysisProviders: Record<ProviderType, AnalysisProvider> = {
  gemini: geminiAnalysisProvider,
  minimax: minimaxAnalysisProvider,
  yourprovider: yourProviderAnalysisProvider,  // ← 添加到这里
};

// 对于聊天，在 chat-router.ts 中添加到聊天路由器
```

## 第五步：添加环境变量支持

编辑 `.env.example` 并在文档中将新提供商添加到任何相关的 `VITE_*_PROVIDER` 选项中。

## 第六步：添加 UI 字符串

如果提供商名称需要显示在设置 UI 中，将其添加到 `src/i18n/locales/en.json` 和 `zh.json` 的提供商名称翻译中。

## 第七步：测试

1. 设置 `VITE_ANALYSIS_PROVIDER=yourprovider`（或使用设置 UI）
2. 捕获一个剪贴板条目 — 应该由你的提供商分析
3. 打开聊天 — 应该使用你的聊天提供商
4. 验证提供商失败时错误消息正确显示
