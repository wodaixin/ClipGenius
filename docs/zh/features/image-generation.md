# 图片生成

ClipGenius 提供文本生成图片功能，基于 Gemini 模型。支持两种模式：标准版和专业版。

## 标准模式（免费）

使用 `VITE_GEMINI_API_KEY` 环境变量配置的密钥：

- 免费额度内使用
- 默认模型：`gemini-2.5-flash-image`
- 无需额外操作

## 专业模式（付费 AI Studio 密钥）

高质量图片生成需要付费的 AI Studio 密钥：

- 使用 `window.aistudio` 全局对象选择密钥
- 模型：`gemini-3-pro-image-preview`
- 提供更好的细节和质量

## window.aistudio 集成

专业模式依赖 AI Studio 的全局 API：

```typescript
interface AistudioGlobal {
  hasSelectedApiKey(): boolean;  // 检查是否已选择密钥
  openSelectKey(): void;         // 打开密钥选择对话框
  getSelectedApiKey(): string;  // 获取选定的密钥
}
```

### 权限错误回退

如果用户拒绝授权访问 AI Studio 密钥：

1. 检测权限错误
2. 回退到标准模式（使用 `VITE_GEMINI_API_KEY`）
3. 提示用户可以继续使用免费版

## 图片编辑

除了生成新图片，还支持基于已有剪贴图片进行编辑：

1. 选择一张剪贴板中的图片
2. 描述想要的修改
3. Gemini 基于原图生成编辑后的版本

## 生成流程

```
用户输入描述文本
    ↓
选择生成模式（标准/专业）
    ↓
调用 Gemini 图片生成 API
    ↓
显示生成进度
    ↓
返回图片（base64 格式）
    ↓
显示预览，支持下载
```

## 图片下载

生成的图片可以下载到本地：

- 文件名：`generated_image_YYYYMMDD_HHMMSS.png`
- 格式：PNG

## PasteCard 集成

生成完成后，图片会自动保存到剪贴板历史：

- 类型标记为 `image`
- 可以像其他剪贴内容一样进行 AI 分析和对话
- 支持再次编辑

## 相关文档

- [AI Studio 专业模式](../guides/ai-studio-pro-mode.md) — 专业模式详细配置
- [环境变量参考](../deployment/environment-variables.md) — API 密钥配置
