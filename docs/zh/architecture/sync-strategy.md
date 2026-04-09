# 同步策略

## 三层存储

| 层级 | 存储 | 范围 | 持久性 |
|---|---|---|---|
| React 状态 | `AppContext.items` | 当前会话 | 刷新后丢失 |
| IndexedDB | `idb` 数据库 | 浏览器 | 清除前永久存在 |
| Firestore | Firebase 云端 | 所有用户设备 | 永久 |

## SyncEngine 单例

所有同步决策都通过 `src/lib/syncEngine.ts` 中的 `syncEngine` 单例。

### 每个条目的状态机

每个条目在 `localStorage["ClipGenius:sync"]` 中有一个跟踪的 `SyncState`：

```
[未知] ──本地写入──► [pending] ──Firestore 确认──► [synced]
                              │
                              │ （云端更新）
                              ▼
                          [conflict]
```

### 写入路径

```typescript
async writeWithSync(item: PasteItem, uid: string, options?) {
  const nextRev = (item.syncRev ?? 0) + 1;
  const updated = { ...item, updatedAt: new Date(), syncRev: nextRev };

  // 1. IndexedDB（阻塞 — UI 等待此操作）
  await savePaste(updated);

  // 2. 跟踪待处理状态
  this.setSyncState(updated.id, {
    status: 'pending',
    localUpdatedAt: new Date(),
    localSyncRev: nextRev,
    pendingCloudRev: nextRev,
    retryCount: 0,
  });

  // 3. Firestore 写入（即发即忘）
  this.writeToCloud(updated, uid, options?.isDeletion).catch(console.error);
}
```

### 云端变更处理器

当 `onSnapshot` 收到远程文档时：

```typescript
handleCloudChange(cloudItem): { accepted: boolean } {
  const local = this.getSyncState(id);

  if (local?.status === 'pending') {
    if (cloudRev < pendingRev)  return { accepted: false };  // 拒绝云端
    if (cloudRev === pendingRev) { markSynced(); return { accepted: true }; }
    // cloudRev > pendingRev
    markConflict(); return { accepted: true };  // 云端优先，本地丢失
  }

  if (cloudRev > localRev) {
    markSynced(); return { accepted: true };  // 云端优先
  }
  return { accepted: false };  // 本地更新
}
```

### 重试逻辑

```typescript
const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 3000]; // 毫秒

// writeToCloud 捕获错误并在以下情况重试：
isRetryable = msg.includes('RESOURCE_EXHAUSTED') ||
               msg.includes('ABORTED') ||
               msg.includes('network');
```

### 陈旧 Pending 清理

在 `syncEngine` 实例化时：

```typescript
// 移除超过 60 秒的 pending 状态
const cutoff = Date.now() - 60_000;
for (const [id, state] of Object.entries(this.store.states)) {
  if (state.status === 'pending' && state.localUpdatedAt < cutoff) {
    state.status = 'conflict';
    state.lastError = 'Stale pending — cleanup on startup';
  }
}
```

### 登录后迁移

```typescript
async migrateLocalItems(uid: string) {
  // 将 syncRev === 0 的条目推送到 Firestore
  // 跳过：已删除条目、已同步的条目和视频条目（体积过大）
  for (const item of all) {
    if (item.userId && item.userId !== uid) continue;
    if (item.isDeleted) continue;
    if ((item.syncRev ?? 0) > 0) continue;
    if (item.type === 'video') continue;
    await this.writeToCloud({ ...item, userId: uid }, uid, false);
  }
}
```
