# 剪贴板捕获

ClipGenius 通过监听全局的 `paste` 事件来捕获剪贴板内容，并根据内容特征自动分类为六种类型。

## 内容类型检测

### 基于文件的检测

对于剪贴板中的文件类型，检测逻辑如下：

| 类型 | 检测条件 |
|---|---|
| `image` | `file.type.startsWith("image/")` |
| `video` | `file.type.startsWith("video/")` |

图片和视频以 base64 data URI 格式存储。

### 基于文本的检测

文本内容按以下优先级分类：

| 类型 | 检测条件 | 示例 |
|---|---|---|
| `url` | 匹配 `https?://...` 正则 | `https://example.com` |
| `markdown` | 包含 Markdown 标记符 | `# 标题`、`**粗体**`、列表、链接、代码块 |
| `code` | 包含代码语言特征 | `function`、`class`、JSON 结构等 |
| `text` | 以上都不匹配时的默认类型 | 纯文本内容 |

## 代码语言检测

ClipGenius 内置了代码语言识别功能，支持以下语言：

| 语言 | 检测模式 |
|---|---|
| JSON | 对象结构、大括号包裹 |
| XML/HTML | 标签语法 `<tag>`、`<!DOCTYPE>` |
| SQL | `SELECT`、`INSERT`、`CREATE TABLE` |
| Python | `def`、`import`、`class` |
| Go | `package`、`func`、`import` |
| Rust | `fn`、`let mut`、`impl` |
| C++ | `#include`、`std::`、`cout` |
| TypeScript | `interface`、`type`、`=>` |
| JavaScript | `const`、`let`、`function` |
| Java | `public class`、`void` |
| C# | `namespace`、`using System` |
| PHP | `<?php`、`$` 变量 |
| Bash | `#!/bin/bash`、`echo`、`export` |
| YAML | `key: value` 结构 |
| TOML | `[section]` 分段 |

## 文件命名规范

剪贴板捕获时会自动生成建议的文件名：

- **图片**：`img_YYYYMMDD_HHMMSS`（如 `img_20260402_143052`）
- **视频**：`vid_YYYYMMDD_HHMMSS`
- **文本/代码**：使用 AI 分析后生成的内容相关名称

## StrictMode 防抖处理

在开发环境下，React StrictMode 会导致 paste 事件被触发两次。ClipGenius 通过防抖机制（debounce）处理这种情况，确保内容不会被重复保存。

```typescript
// 防抖时长
const DEBOUNCE_MS = 100;
```

## 数据持久化

所有剪贴板数据都会保存到 IndexedDB：

- 图片和视频：base64 data URI
- 其他类型：原始文本

## 相关文档

- [AI 内容分析](./ai-analysis.md) — 了解如何生成智能摘要
- [同步模式](./sync-modes.md) — 了解云同步机制
