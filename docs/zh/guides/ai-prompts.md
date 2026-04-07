# AI 提示词配置

ClipGenius 使用集中化的 AI 提示词模板来控制所有 AI 功能。提示词按语言分离，并根据当前 UI 语言加载。

---

## 文件结构

```
src/config/
├── prompts.ts          # 提示词加载器和工具函数
├── prompts.en.json     # 英文提示词
└── prompts.zh.json     # 中文提示词
```

`prompts.ts` 模块提供 `getPrompts(language)` 来加载对应的提示词，以及 `fillTemplate()` 进行模板变量替换。

---

## 可用的提示词类别

### 1. Chat 系统指令 (`chat.systemInstruction`)

用于无上下文的基础聊天交互。

**默认：** "You are ClipGenius Assistant. Be concise and helpful."

### 2. Chat Router 系统指令 (`chatRouter.systemInstruction`)

用于带附加上下文（图片、视频或文本）的聊天。

**默认：** "You are ClipGenius AI, a professional-grade assistant for a clipboard manager..."

### 3. 语音助手系统指令 (`liveVoice.systemInstruction`)

用于语音对话场景。

**默认：** "You are ClipGenius Voice Assistant. Be concise and helpful."

### 4. 内容分析提示词 (`analyze.*`)

用于 AI 分析剪贴板内容：

| 键名 | 说明 |
|---|---|
| `analyze.image` | 图片分析提示词 |
| `analyze.video` | 视频分析提示词 |
| `analyze.url` | 链接分析提示词（支持 `{{content}}` 模板） |
| `analyze.text` | 文本分析提示词（支持 `{{content}}` 模板） |
| `analyze.langSuffix` | 语言后缀，追加到所有分析提示词 |

---

## 自定义提示词

### 步骤 1：编辑 JSON 文件

英文提示词，编辑 `src/config/prompts.en.json`：

```json
{
  "chat": {
    "systemInstruction": "You are a helpful AI assistant specialized in clipboard management."
  },
  "chatRouter": {
    "systemInstruction": "You are ClipGenius AI. Always analyze the attached context carefully."
  },
  "liveVoice": {
    "systemInstruction": "You are a voice assistant. Be brief and clear."
  },
  "analyze": {
    "image": "Describe this image and suggest a filename...",
    "video": "Describe this video and suggest a filename...",
    "url": "Analyze this URL: {{content}}...",
    "text": "Analyze this text: \"{{content}}\"...",
    "langSuffix": "Respond in English."
  }
}
```

中文提示词，编辑 `src/config/prompts.zh.json`。

### 步骤 2：重新加载页面

修改后刷新页面即可生效。

---

## 模板变量

部分提示词支持 `{{变量名}}` 语法的模板变量：

| 变量 | 支持的提示词 |
|---|---|
| `{{content}}` | `analyze.url`、`analyze.text` |

`prompts.ts` 中的 `fillTemplate()` 函数会自动替换这些变量。

---

## 语言切换

提示词根据 `i18n.language` 加载：
- 英文 UI → `prompts.en.json`
- 中文 UI → `prompts.zh.json`

当你切换 UI 语言时，AI 响应语言也会随之改变，因为 `langSuffix` 会追加到分析提示词中。

---

## 最佳实践

1. **保持提示词简洁** — 简短的提示词通常效果更好
2. **包含语言指令** — 始终设置适当的 `langSuffix` 以确保响应语言一致
3. **使用有效的 JSON** — 双引号，不能有尾随逗号
4. **修改后测试** — 刷新页面并测试 AI 功能

---

## 相关文档

- [国际化指南](i18n-guide.md) — UI 翻译系统
