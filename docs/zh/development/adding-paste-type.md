# 添加粘贴类型

本指南逐步说明如何向 ClipGenius 添加新的 `PasteType`（例如添加 `audio` 支持）。

## 概述

添加新的 `PasteType` 会涉及代码库中的多个文件：类型定义、剪贴板捕获、内容分析、存储和 UI 渲染。

## 第一步：更新类型联合

编辑 `src/types.ts`：

```typescript
export type PasteType = "image" | "text" | "url" | "video" | "markdown" | "code" | "audio";
```

## 第二步：更新剪贴板捕获逻辑

编辑 `src/hooks/useClipboard.ts`：

```typescript
// 1. 为音频文件添加 MIME 类型检测
if (file.type.startsWith("audio/")) {
  // 处理音频文件 — 读取为 base64
  return;
}

// 2. 添加音频 URL 检测（如果粘贴音频 URL）
const isAudioUrl = /\.mp3|\.wav|\.ogg|\.m4a$/i.test(trimmed);
```

## 第三步：更新内容分析

编辑 `src/services/ai/providers/capabilities.ts`：

```typescript
export function canProviderHandle(provider: string, contentType: string): boolean {
  switch (contentType) {
    case "audio":
      return capabilities.supportsAudio ?? false;  // 添加到 ProviderCapabilities
    // ...
  }
}
```

在 `ProviderCapabilities` 中添加 `supportsAudio` 字段并为每个提供商设置。

## 第四步：更新设置

编辑 `src/lib/settings.ts` 将新类型添加到 `ContentTypeAnalysisSettings`：

```typescript
export interface ContentTypeAnalysisSettings {
  image: ProviderType;
  text: ProviderType;
  url: ProviderType;
  video: ProviderType;
  markdown: ProviderType;
  code: ProviderType;
  audio: ProviderType;  // 添加默认值
}
```

同时更新 `DEFAULT_ANALYSIS_PROVIDERS`：

```typescript
const DEFAULT_ANALYSIS_PROVIDERS: ContentTypeAnalysisSettings = {
  // ...
  audio: "gemini",
};
```

## 第五步：更新 PastePreview 渲染

编辑 `src/components/paste/PastePreview.tsx` 为新类型添加渲染分支：

```typescript
case "audio":
  return <audio controls src={item.content} className="max-w-full" />;
```

## 第六步：更新 i18n 字符串

在 `src/i18n/locales/en.json` 和 `zh.json` 中为新类型添加翻译键：

```json
{
  "pasteZone": {
    "typeAudio": "Audio"
  }
}
```

## 第七步：测试

1. 捕获一个音频文件（`Cmd/Ctrl+V`）
2. 验证它被分类为 `audio`
3. 验证预览正确渲染了 `<audio>` 元素
4. 验证 AI 分析正常工作（如果支持）
5. 验证云同步正常工作
