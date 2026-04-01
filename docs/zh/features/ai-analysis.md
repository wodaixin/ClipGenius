# AI 内容分析

ClipGenius 利用 Gemini AI 自动分析剪贴板内容，生成描述性文件名和内容摘要。

## 触发条件

AI 分析在以下条件下触发：

1. **用户已登录**：只有登录用户才能使用 AI 分析功能
2. **自动分析已启用**：用户需在设置中开启"自动 AI"选项
3. **内容类型支持**：图片、视频、文本、链接均支持分析

## 自动分析流程

```
用户粘贴内容
    ↓
内容保存到 IndexedDB
    ↓
检查登录状态和自动分析开关
    ↓
调用 AI 分析服务（provider 路由）
    ↓
更新 PasteItem（suggestedName + summary）
    ↓
保存到 IndexedDB + Firestore（已登录）
```

## 登录后补分析

如果用户在未登录状态下粘贴了大量内容，之后才登录，ClipGenius 会自动为这些内容补上 AI 分析：

```typescript
// 登录时检查未分析的内容
const unanalyzedItems = items.filter(item =>
  item.userId === user.uid &&
  !item.summary &&
  !item.isAnalyzing
);
```

## Provider 路由

AI 分析支持多个 Provider，通过环境变量配置：

| 环境变量 | 可选值 | 说明 |
|---|---|---|
| `VITE_ANALYSIS_PROVIDER` | `gemini` / `minimax` | AI 服务提供商 |

默认使用 Gemini。

## 提示词模板

分析请求使用结构化的提示词模板：

### 图片分析

```
分析这张图片。提供一个简短的描述性文件名（不含扩展名），并用一句话总结图片内容。
返回 JSON：{ "suggestedName": "...", "summary": "..." }
```

### 视频分析

```
分析这个视频。提供一个简短的描述性文件名（不含扩展名），并用一句话总结视频内容。
返回 JSON：{ "suggestedName": "...", "summary": "..." }
```

### 链接分析

```
分析这个链接：{{content}}。根据网站内容提供一个简短的描述性文件名（不含扩展名），
并用一句话总结链接可能包含的内容。返回 JSON：{ "suggestedName": "...", "summary": "..." }
```

### 文本分析

```
分析这段文本："{{content}}"。根据内容提供一个简短的描述性文件名（不含扩展名），
并用一句话总结。返回 JSON：{ "suggestedName": "...", "summary": "..." }
```

## 结果合并

AI 返回的结果会合并到 PasteItem：

```typescript
interface PasteItem {
  suggestedName: string;  // AI 生成的文件名
  summary?: string;       // AI 生成的内容摘要
  isAnalyzing: boolean;  // 分析状态标志
}
```

## 相关文档

- [剪贴板捕获](./clipboard-capture.md) — 了解内容如何被捕获
- [AI 聊天](./ai-chat.md) — 了解如何与剪贴内容对话
- [Provider 配置](./environment-variables.md) — 了解 Provider 路由配置
