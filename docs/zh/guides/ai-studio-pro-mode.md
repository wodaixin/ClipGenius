# AI Studio 专业模式

专业模式使用 Google AI Studio 的付费密钥，提供更高质量的图片生成服务。

## 什么是 AI Studio 专业模式

AI Studio 是 Google 的 AI 开发平台，提供：
- 付费 API 密钥管理
- 高级模型访问
- 使用量监控和计费

在 ClipGenius 中，专业模式主要用于图片生成，相比免费版提供更好的细节和质量。

## window.aistudio 全局对象

AI Studio 在浏览器中注入 `window.aistudio` 全局对象：

```typescript
interface AistudioGlobal {
  hasSelectedApiKey(): boolean;
  openSelectKey(): void;
  getSelectedApiKey(): string;
}
```

### hasSelectedApiKey()

检查用户是否已在 AI Studio 中选择了 API 密钥：

```typescript
if (window.aistudio.hasSelectedApiKey()) {
  // 用户已选择密钥
}
```

### openSelectKey()

打开 AI Studio 的密钥选择对话框：

```typescript
window.aistudio.openSelectKey();
// 用户可以在弹出的界面中选择密钥
```

### getSelectedApiKey()

获取用户选择的密钥：

```typescript
const key = window.aistudio.getSelectedApiKey();
// 返回密钥字符串，如 "AIza-..."
```

## 使用流程

```
用户点击"生成图片"
    ↓
选择"专业（付费密钥）"模式
    ↓
检查 window.aistudio.hasSelectedApiKey()
    ↓
├─ 是 → 调用 getSelectedApiKey() 获取密钥
│        ↓
│        使用该密钥调用 Gemini Pro API
│        ↓
│        生成高质量图片
│
└─ 否 → 调用 window.aistudio.openSelectKey()
         ↓
         用户选择密钥
         ↓
         重新检查并获取密钥
```

## 权限错误处理

如果用户拒绝授权访问 AI Studio 密钥：

```typescript
try {
  const key = window.aistudio.getSelectedApiKey();
} catch (error) {
  if (error.name === 'PermissionError') {
    // 回退到标准模式
    useStandardMode();
    showMessage('已回退到免费模式');
  }
}
```

## 代码参考

```typescript
// src/components/imagegen/ImageGenModal.tsx

const requestAistudioKey = (): string | null => {
  if (!window.aistudio) {
    console.warn('window.aistudio is not available');
    return null;
  }

  if (!window.aistudio.hasSelectedApiKey()) {
    window.aistudio.openSelectKey();
    return null;
  }

  return window.aistudio.getSelectedApiKey();
};
```

## 模型选择

| 模式 | 模型 | 说明 |
|---|---|---|
| 标准 | `gemini-2.5-flash-image` | 免费版，快速生成 |
| 专业 | `gemini-3-pro-image-preview` | 付费版，高质量 |

## 相关文档

- [图片生成](../features/image-generation.md) — 功能概述
- [环境变量参考](../deployment/environment-variables.md) — API 密钥配置
- [通过 AI Studio 部署](../deployment/cloud-run-ai-studio.md) — 部署配置
