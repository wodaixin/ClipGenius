# 贡献指南

## 代码风格

- **TypeScript**：启用严格模式。不使用 `any`。所有函数签名显式标注类型。
- **React**：仅使用函数式组件。命名导出。Hooks 使用 `use` 前缀。
- **导入**：按以下顺序组织：外部包 → 内部包 → 相对路径。
- **样式**：Tailwind CSS v4 工具类。使用 `src/lib/utils.ts` 中的 `cn()` 合并条件类。
- **错误处理**：始终处理或重新抛出。绝不静默吞掉错误。使用带上下文的 `console.error`。
- **文件组织**：`src/config`、`src/components`、`src/context`、`src/hooks`、`src/lib`、`src/services`、`src/types.ts`、`App.tsx`。

## Git 工作流

### 分支命名

```
feature/xyz-description
bugfix/xyz-description
docs/xyz-description
```

### 提交信息

遵循 conventional commits：

```
feat: add audio paste type support
fix: prevent duplicate analysis on StrictMode remount
docs: add AI chat guide
chore: update Gemini SDK to v1.30.0
refactor: extract sync logic into syncEngine
```

类型：`feat`、`fix`、`docs`、`chore`、`refactor`、`test`。

### Pull Requests

1. 从 `main` 创建功能分支
2. 以清晰、原子的提交进行更改
3. 运行 `npm run lint` — 必须通过且无错误
4. 打开 PR，清晰描述变更内容和原因
5. 合并前至少需要一人审批
6. Squash 并合并到 `main`

## 命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 生产构建
npm run lint     # 仅 TypeScript 类型检查
npm run preview  # 预览生产构建
npm run clean    # 删除 dist/
```

## 添加新功能

- 新 AI 功能：在 `src/services/ai/providers/` 实现提供商，在路由器中注册
- 新组件：在 `src/components/` 创建，命名导出
- 新 Hook：在 `src/hooks/` 添加，使用 `use` 前缀
- 新 Context：在 `src/context/` 添加，使用 Provider 模式
- 新 PasteType：更新 `src/types.ts` 中的 PasteType 联合类型及所有相关文件
- 新翻译：同时添加到 `src/i18n/locales/en.json` 和 `zh.json`
