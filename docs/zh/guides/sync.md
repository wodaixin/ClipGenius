# 数据同步

ClipGenius 使用三层存储模型：**内存中的 React 状态** → **IndexedDB（本地）** → **Firestore（云端）**。

## 写入路径

每次状态变更都遵循以下路径：

```
用户操作（添加/更新/删除）
    ↓
React 状态更新（即时 — UI 不等待网络）
    ↓
IndexedDB 写入（通过 src/lib/db.ts）
    ↓
syncEngine.writeWithSync() 触发（即发即忘）
    ↓
Firestore 写入（带重试逻辑）
```

`syncEngine` 单例（`src/lib/syncEngine.ts`）管理完整的同步生命周期。

## 读取路径

应用启动时：

```
从 IndexedDB 调用 getPastes()
    ↓
设置 React 状态
```

Firestore `onSnapshot`（通过 `useFirestoreSync`）在以下两种情况下触发：
1. 来自其他设备的远程变更（云端 → 本地）
2. 本地写入的确认（本地 → 云端已确认）

## 冲突解决：「云端优先」

`syncEngine` 在每次写入时跟踪一个 `syncRev`（单调递增整数）。客户端（`syncRev + 1`）和 Firestore（`increment(1)` 服务端）都会递增它。

当 `onSnapshot` 收到远程变更时：

| 本地状态 | 云端 syncRev | 结果 |
|---|---|---|
| `pending`（写入进行中） | < pendingRev | 拒绝云端 — 本地写入继续 |
| `pending` | = pendingRev | 云端已确认 — 标记为 `synced` |
| `pending` | > pendingRev | 云端优先 — 本地写入被放弃 |
| `synced` 或未知 | > localRev | 云端优先 — 本地更新 |
| `synced` 或未知 | <= localRev | 拒绝云端 — 保留本地 |

这是一个「后写入优先」模型，适用于剪贴板管理器（数据丢失令人烦恼但从不是灾难性的）。

## 重试逻辑

失败的 Firestore 写入最多重试 2 次，延迟递增（1 秒、3 秒）。只有 `RESOURCE_EXHAUSTED`、`ABORTED` 和网络错误会重试。超过最大重试次数后，条目标记为 `conflict`。

## 软删除

条目永远不会被硬删除，而是：

```typescript
{ isDeleted: true, deletedAt: new Date(), syncRev: syncRev + 1 }
```

软删除的条目在 UI 中被过滤掉（`items.filter(p => !p.isDeleted)`），但保留在 IndexedDB 和 Firestore 中。这确保同步引擎能够正确地在多设备间协调删除，而不需要 Firestore 递归删除权限。

## 陈旧 Pending 清理

应用启动时，任何超过 60 秒的 `pending` 状态都会被标记为 `conflict`。这处理了在同步过程中崩溃或强制关闭的情况。

## 登录后迁移

当访客登录时，`syncEngine.migrateLocalItems()` 会将所有本地创建的条目（`syncRev === 0` 且 `userId` 匹配的）推送到 Firestore。视频条目（`type === "video"`）因体积较大被跳过。

## 跨标签页同步

关于通过 `BroadcastChannel` 和 `localStorage` fallback 在浏览器标签页间广播变更的详细信息，请参见 [跨标签页同步](../architecture/cross-tab-sync.md)。
