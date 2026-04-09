# ClipGenius 文档

> **ClipGenius** — 专业级 AI 剪贴板管理器。捕获图片、视频、文本、链接、Markdown 和代码片段；通过 AI（Gemini / Minimax）进行分析；通过 Firebase 在多设备间同步。

## 导航

### [快速入门](./getting-started/)
安装、配置，快速上手。

- [安装指南](./getting-started/installation.md)
- [快速开始](./getting-started/quick-start.md)
- [Firebase 配置](./getting-started/firebase-setup.md)

### [使用指南](./guides/)
各功能的使用详解。

- [剪贴板捕获](./guides/clipboard-capture.md)
- [AI 分析](./guides/ai-analysis.md)
- [AI 聊天](./guides/chat.md)
- [图片生成](./guides/image-generation.md)
- [数据同步](./guides/sync.md)
- [设置](./guides/settings.md)
- [历史记录管理](./guides/managing-history.md)

### [架构设计](./architecture/)
系统设计与关键技术决策的深度解析。

- [概述](./architecture/overview.md)
- [AI 提供商模型](./architecture/provider-model.md)
- [数据流](./architecture/data-flow.md)
- [同步策略](./architecture/sync-strategy.md)
- [跨标签页同步](./architecture/cross-tab-sync.md)

### [参考手册](./reference/)
完整的 API 接口：钩子、上下文、服务、类型定义。

- [Hooks（钩子）](./reference/api-hooks.md)
- [Contexts（上下文）](./reference/api-contexts.md)
- [Services（服务）](./reference/api-services.md)
- [Types（类型）](./reference/api-types.md)
- [环境变量](./reference/env-variables.md)
- [Firestore 数据结构](./reference/firestore-schema.md)
- [AI 提示词](./reference/prompts.md)

### [部署指南](./deployment/)
部署到 Cloud Run 或 CI/CD。

- [Google Cloud Run](./deployment/google-cloud-run.md)
- [CI/CD](./deployment/ci-cd.md)

### [开发指南](./development/)
贡献代码、添加新的 AI 提供商、添加新的粘贴类型。

- [项目结构](./development/project-structure.md)
- [添加 AI 提供商](./development/adding-provider.md)
- [添加粘贴类型](./development/adding-paste-type.md)
- [国际化](./development/internationalization.md)
- [贡献指南](./development/contributing.md)

## 功能亮点

| 功能 | 描述 |
|---|---|
| **剪贴板捕获** | 六种内容类型：图片、视频、文本、链接、Markdown、代码 |
| **AI 分析** | 自动为每个条目生成建议名称和摘要 |
| **AI 聊天** | 多模态对话，支持流式思考和语音对话 |
| **图片生成** | 标准模式（免费）和专业模式（付费 AI Studio 密钥） |
| **云同步** | Firebase Firestore，访客离线优先 |
| **跨标签页同步** | BroadcastChannel + localStorage 后备方案 |
| **国际化** | 英文和中文界面 |
