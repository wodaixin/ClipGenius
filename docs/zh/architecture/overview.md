# 架构概述

## 关键设计决策

### A. 在 `window` 级别捕获剪贴板事件

`paste` 事件监听器直接附加到 `window` 上，并过滤来自 `<input>`、`<textarea>` 和 `contenteditable` 元素的事件。这使得无论哪个 DOM 元素有焦点，应用都能正常工作。

**原因**：剪贴板管理器必须全局捕获剪贴板事件。附加到单个组件会在应用没有焦点或焦点在其他地方时漏掉事件。

**权衡**：复杂的焦点过滤逻辑。需要与 DOM 变化保持同步。

### B. IndexedDB 为本地真实数据源

`AppContext` 状态是运行时副本。`src/lib/db.ts`（通过 `idb` 的 IndexedDB）是持久化本地存储。

**原因**：IndexedDB 是唯一能在浏览器中持久化存储大型 base64 blob（可达数 MB 的图片/视频）的方式。localStorage 有 5MB 限制。

### C. 按功能的 AI 提供商路由

每个功能（分析、聊天、语音对话、图片生成）独立通过 `VITE_<FEATURE>_PROVIDER` 环境变量或应用内设置选择提供商。`src/services/ai/providers/index.ts` 是路由器；`src/services/ai/providers/capabilities.ts` 定义每个提供商支持的内容类型。

**原因**：Minimax 在纯文本任务上更便宜且有时更快。Gemini 是多模态内容所必需的。允许按功能路由让用户优化成本和能力。

**权衡**：多个提供商配置增加了设置复杂性。

### D. 带 `isDeleted` 标志的软删除

粘贴条目永远不会被硬删除。取而代之的是设置 `isDeleted: true` 和 `deletedAt`。

**原因**：确保单个用户本地存储内的数据一致性。删除作为状态变更被跟踪。

### E. `syncRev` 作为唯一冲突解决机制

使用简单的单调递增整数，而不是向量时钟或操作转换。

**原因**：剪贴板条目是独立的，没有因果排序要求。基于单一序列号的后写入优先已足够。

**权衡**：同一条目在两个设备上的并发编辑无法智能合并。

### F. 每次调用时创建新的 `GoogleGenAI` 实例

不会缓存 `@google/genai` SDK 实例。每次 `analyze()`、`generateImage()` 或 `startLiveSession()` 调用都会创建一个新实例。

**原因**：API 密钥可以在运行时通过应用内设置更改。缓存的单例会保留陈旧的密钥。

**权衡**：每次调用略有更高开销（与网络延迟相比可忽略不计）。

### G. 通过 BroadcastChannel + localStorage Fallback 实现跨标签页同步

`tabSync.ts` 模块使用 `BroadcastChannel` 作为主要通道。为 Safari 兼容性，`storage` 事件监听器作为后备方案。

**原因**：BroadcastChannel 是跨标签页通信的惯用 Web API。它不在发送标签页上触发（避免循环）。

**权衡**：BroadcastChannel 在非常旧的浏览器中不支持。storage 事件后备方案延迟更高。

### H. `window.aistudio` 集成用于付费 AI Studio 密钥

「专业」模式的图片生成调用 `window.aistudio.openSelectKey()` 和 `window.aistudio.getSelectedApiKey()`，而不是使用标准环境变量 API 密钥。

**原因**：AI Studio 管理付费 API 密钥。`window.aistudio` 全局对象由 AI Studio 主机环境提供，只暴露用户在 UI 中选择的密钥。

**权衡**：专业模式仅在提供 `window.aistudio` 的 AI Studio / Cloud Run 环境中工作。

### I. Minimax API 通过 Vite 开发服务器代理

在开发中，Minimax API 调用经过 `/api/minimax` → Vite 代理 → `https://api.minimaxi.com/anthropic`。

**原因**：系统代理（如 Clash）可能无法正确路由到 `api.minimaxi.com`。Vite 代理充当旁路。

**权衡**：代理仅在 Vite 开发服务器中有效。在 Cloud Run 生产环境中，容器必须能直接访问互联网到达 `api.minimaxi.com`。
