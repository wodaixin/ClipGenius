# 图片生成

ClipGenius 可以使用 Gemini 从文本提示词生成图片。支持两种模式：**标准**（免费）和**专业**（付费 AI Studio 密钥）。

## 标准模式（免费）

使用环境变量中的 `VITE_GEMINI_API_KEY`。模型为 `gemini-2.5-flash-image`，免费额度充足。

```typescript
await generateImage({
  prompt: "一幅赛博朋克风格夜景城市",
  quality: "standard",
  size: "1K", // 可选 "1K"、"2K"、"4K"
  contextItem: null,
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});
```

## 专业模式（付费）

专业模式使用通过 `window.aistudio` 选择的**付费 Gemini API 密钥**。这是 Google AI Studio 主机环境提供的 `window.aistudio` 全局对象（通过 AI Studio 在 Cloud Run 上运行时使用）：

```typescript
window.aistudio = {
  hasSelectedApiKey: () => Promise<boolean>,
  openSelectKey: () => void,
  getSelectedApiKey?: () => Promise<string>,
};
```

当用户在图片生成弹窗中点击 **Pro** 时：

1. `window.aistudio.openSelectKey()` 打开 AI Studio 密钥选择器
2. 通过 `window.aistudio.getSelectedApiKey()` 获取选中的密钥
3. 如果标准模式调用因权限错误失败，应用会 fallback 到付费密钥
4. 使用的模型为 `gemini-3-pro-image-preview`

## 图片编辑

当粘贴条目通过卡片的 **Edit Image** 附加到图片生成弹窗时，`contextItem` 被设置，图片作为内联数据连同文本提示词一起发送给模型，模型会生成源图的修改版本。

## 分辨率

三种分辨率可选：

| 尺寸 | 近似尺寸 |
|---|---|
| `1K` | 1024 × 1024 |
| `2K` | 1792 × 1024 |
| `4K` | 1024 × 1792 |

宽高比固定（1:1、16:9 或 9:16，取决于尺寸）。

## 下载

生成的图片存储为 base64 PNG 数据 URI。点击 **Download Generation** 会触发 `<a download>` 点击，文件名为 `gen_{timestamp}.png`。

## 错误处理

- 如果 `generateImage` 抛出错误，且 `imageQuality === "pro"` 且错误包含 `PERMISSION_DENIED`、`not found`、`quota` 或 `has no`，应用会提示用户通过 `window.aistudio` 选择付费密钥。
- 如果付费密钥调用也失败，错误会展示给用户，弹窗保持打开状态。
- 标准模式错误直接展示，不进行 fallback。
