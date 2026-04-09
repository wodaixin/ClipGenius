# 跨标签页同步

在一个浏览器标签页中进行的更改会通过 `tabSync.ts` 广播到其他打开的标签页。

## 机制

### 主要方式：BroadcastChannel

`BroadcastChannel` API 允许同源的窗口/标签页相互通信：

```typescript
const channel = new BroadcastChannel('clipgenius-sync');
channel.postMessage({ type: 'ITEM_UPDATED', item });
channel.postMessage({ type: 'ITEM_DELETED', id });
```

**重要**： `BroadcastChannel.postMessage()` **不会**在发送标签页上触发。这防止了无限更新循环。

### 后备方式：`storage` 事件

对于不支持 `BroadcastChannel` 的浏览器（较旧的 Safari），`window.addEventListener('storage', ...)` 监听器作为后备方案。当 `localStorage` 变更时，`storage` 事件会在其他标签页上触发。

```typescript
window.addEventListener('storage', (e) => {
  if (e.key === 'clipgenius-tab-update') {
    const data = JSON.parse(e.newValue);
    // 应用更新
  }
});
```

## 跨标签页协调编辑

`tabSync.ts` 中的 `editingIds` Set 防止一个标签页覆盖另一个标签页的编辑：

```typescript
// 在标签页 A 开始编辑时：
broadcast({ type: 'MARK_EDITING', id });
// 标签页 B 收到 MARK_EDITING → 将 id 存入其 editingIds Set

// 当标签页 B 尝试保存时：
if (isItemEditing(id)) return; // 静默忽略 — 标签页 A 正在编辑
// 继续保存
```

这是一个协作协议——假设标签页表现良好，不使用锁机制。

## 初始化

`initTabSync(onItemUpdated, onItemDeleted)` 在应用启动时调用一次（在 `AppContext` 内部）。它设置监听器并返回一个清理函数。
