# 项目结构

## 顶层文件

```
/
├── src/                      # 所有源代码
├── docs/                     # 文档（en/ 和 zh/）
├── public/                   # 静态资源
├── .env.example              # 环境变量模板
├── package.json
├── tsconfig.json
├── vite.config.ts
└── Dockerfile
```

## `src/` 目录

```
src/
├── App.tsx                     # 薄组合层：provider wrappers + AppContent
├── main.tsx                   # React 19 createRoot, StrictMode, i18n
├── types.ts                   # 核心类型：PasteItem, ChatMessage, PasteType 等
├── vite-env.d.ts
├── index.css                  # Tailwind v4 导入，全局样式，滚动条
│
├── config/                    # AI 提示词配置
│   ├── prompts.ts             # 提示词加载器（根据 i18n.language 选择 en/zh）
│   ├── prompts.en.json
│   ├── prompts.zh.json
│   └── README.md
│
├── context/                   # React Context providers
│   ├── AppContext.tsx          # 条目、图片生成、自动分析
│   └── ChatContext.tsx        # 聊天状态、流式传输、语音对话
│
├── hooks/                     # 自定义钩子
│   ├── useClipboard.ts        # paste 监听 + 类型检测
│   ├── usePasteStore.ts       # CRUD、搜索
│   └── useImageGen.ts        # 从 AppContext 重新导出图片生成状态
│
├── components/
│   ├── layout/
│   │   ├── PasteZone.tsx      # 左侧面板：拖放区、头部、功能按钮
│   │   ├── HistoryPane.tsx   # 右侧面板：虚拟化条目列表
│   │   └── SettingsModal.tsx  # 高级设置表单
│   ├── paste/
│   │   ├── PasteCard.tsx      # 带有操作的单个条目卡片
│   │   └── PastePreview.tsx   # 完整内容预览弹窗
│   ├── chat/
│   │   ├── ChatModal.tsx     # 带流式传输的 AI 聊天弹窗
│   │   └── ChatContextItem.tsx # 聊天中的内联上下文预览
│   └── imagegen/
│       └── ImageGenModal.tsx  # 文本生成图片 UI
│
├── services/
│   ├── ai/
│   │   ├── analyzeContent.ts  # 分析入口点（路由到提供商）
│   │   ├── generateImage.ts   # 图片生成
│   │   ├── startLiveSession.ts # Gemini Live 语音会话
│   │   └── providers/
│   │       ├── index.ts      # 提供商注册表和路由器
│   │       ├── types.ts      # AnalysisProvider, ChatProvider 接口
│   │       ├── capabilities.ts # 提供商能力定义
│   │       ├── gemini.ts     # Gemini 内容分析
│   │       ├── gemini-chat.ts # Gemini 流式聊天 + 思考
│   │       ├── minimax.ts   # Minimax 内容分析
│   │       └── minimax-chat.ts # Minimax 流式聊天
│   └── clipboard/
│       └── clipboardUtils.ts # copyItemToClipboard, downloadItem
│
├── lib/                       # 核心工具
│   ├── db.ts                 # 通过 idb 的 IndexedDB（粘贴 + 聊天持久化）
│   ├── utils.ts              # cn() 工具函数
│   ├── settings.ts           # localStorage 设置管理
│   ├── tabSync.ts           # BroadcastChannel + storage 事件跨标签页同步（本地编辑保护）
│   └── estimateCardHeight.ts # 虚拟列表条目高度估算
│
└── i18n/
    ├── index.ts              # i18next 配置
    └── locales/
        ├── en.json          # 英文 UI 字符串
        └── zh.json          # 中文 UI 字符串
```

## 命名规范

| 类别 | 规范 | 示例 |
|---|---|---|
| 组件 | PascalCase，命名导出 | `PasteCard.tsx` → `export function PasteCard` |
| Hooks | camelCase，`use` 前缀 | `useClipboard.ts` → `export function useClipboard` |
| Context | PascalCase，`Context` 后缀 | `AuthContext.tsx` → `AuthContext` |
| Services | camelCase，描述性名称 | `analyzeContent.ts` |
| Providers | camelCase，`Provider` 后缀 | `geminiAnalysisProvider` |
| 类型/接口 | PascalCase | `interface PasteItem` |
| 常量 | SCREAMING_SNAKE_CASE | `MAX_RETRIES`、`RETRY_DELAYS` |
| CSS/Tailwind | Tailwind 工具类 | `className="flex items-center"` |
