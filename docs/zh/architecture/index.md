# 架构设计

本节涵盖 ClipGenius 的高层系统设计。

## 目录

- [概述](./overview.md) — 关键架构决策与权衡
- [AI 提供商模型](./provider-model.md) — AI 提供商抽象层
- [数据流](./data-flow.md) — 从剪贴板到 UI 的端到端数据路径
- [同步策略](./sync-strategy.md) — IndexedDB 优先、云端优先、syncRev
- [跨标签页同步](./cross-tab-sync.md) — BroadcastChannel + localStorage 后备方案
