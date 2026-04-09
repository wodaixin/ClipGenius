# AI 提示词

提示词集中在 `src/config/prompts.en.json` 和 `src/config/prompts.zh.json` 中。`src/config/prompts.ts` 中的加载器根据 `i18n.language` 选择相应的文件。

## 提示词分类

### 1. 聊天 (`chat.systemInstruction`)

用于没有附加上下文的基础聊天交互。

**默认（英文）**：
```
You are ClipGenius Assistant. Be concise and helpful.
```

### 2. 聊天路由器 (`chatRouter.systemInstruction`)

用于附加了上下文条目（图片、视频或文本）时的聊天。

**默认（英文）**：
```
You are ClipGenius AI, a professional-grade assistant for a clipboard manager. Analyze the attached context carefully and provide accurate, helpful responses. Be concise and precise.
```

### 3. 语音对话 (`liveVoice.systemInstruction`)

用于语音聊天会话。

**默认（英文）**：
```
You are ClipGenius Voice Assistant. Be concise and helpful.
```

### 4. 内容分析 (`analyze.*`)

| 键 | 用途 | 模板变量 |
|---|---|---|
| `analyze.image` | 分析图片 | — |
| `analyze.video` | 分析视频 | — |
| `analyze.url` | 分析链接 | `{{content}}` |
| `analyze.text` | 分析文本 | `{{content}}` |
| `analyze.langSuffix` | 附加到所有分析提示的语言指令 | — |

## 自定义提示词

1. 打开 `src/config/prompts.en.json`（英文）或 `src/config/prompts.zh.json`（中文）
2. 修改提示词的值
3. 重新加载页面 — 更改立即生效（无需重新构建）

**重要**：保持提示词简洁。在 `langSuffix` 中包含语言指令（例如 `"Respond in English."`）以确保输出语言一致。

## JSON 格式规则

- 仅使用双引号
- 不使用尾随逗号
- 必须是有效的 JSON（保存前使用验证器检查）
- 模板变量使用 `{{variableName}}` 语法，由 `prompts.ts` 中的 `fillTemplate()` 替换

## 示例

### 自定义 URL 分析提示词

```json
{
  "analyze": {
    "url": "Analyze the following URL and provide: 1) A brief description of the page content, 2) A suggested filename, 3) Key topics covered. URL: {{content}}",
    "langSuffix": "Respond in English. Output valid JSON."
  }
}
```

### 自定义聊天系统指令

```json
{
  "chat": {
    "systemInstruction": "You are a technical programming assistant. Provide accurate, well-reasoned answers with code examples when relevant."
  }
}
```
