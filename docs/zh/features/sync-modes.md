# 同步模式

ClipGenius 支持两种数据同步模式：访客模式和登录模式。

## 访客模式（仅本地）

未登录用户使用应用时：

- 所有数据保存在本地 IndexedDB
- 无需网络连接
- 应用完全可用
- 数据不会同步到云端

## 登录模式（双写）

用户登录后，数据采用双写策略：

```
本地操作 → IndexedDB（立即写入）
         → Firestore（登录用户同步）
```

## 双写机制

### 写入时

```typescript
async function dualWrite(item: PasteItem) {
  // 1. 立即写入本地
  await db.put("pastes", item);

  // 2. 如果已登录，写入云端
  if (user) {
    await setDoc(doc(db, `users/${user.uid}/pastes/${item.id}`), item);
  }
}
```

### 读取时

```typescript
// Firestore 优先级高于本地（云端胜出）
useFirestoreSync(() => {
  onSnapshot(collection(db, `users/${userId}/pastes`), (snapshot) => {
    snapshot.forEach(doc => {
      const remoteData = doc.data();
      // 用云端数据覆盖本地
      updateLocal(remoteData);
    });
  });
});
```

## 冲突解决

当本地和云端数据不一致时：

| 场景 | 解决策略 |
|---|---|
| 同一项目被多次修改 | 云端数据优先 |
| 新建项目 | 双写，两边一致 |
| 删除项目 | 双删，两边一致 |
| 离线修改后上线 | 以云端为准 |

## 聊天消息合并

聊天消息使用合并写入：

```typescript
await setDoc(messageRef, messageData, { merge: true });
```

这确保：
- 新消息被添加
- 现有消息内容被更新
- 其他消息不受影响

## 离线行为

### 未登录用户
- 完全离线可用
- 所有数据保存在 IndexedDB

### 已登录用户
- 离线时数据保存到 IndexedDB
- 上线后通过 Firestore 同步
- 云端数据会覆盖本地（云端胜出）

## 数据隔离

用户数据完全隔离：

```
Firestore 结构：
/users/{userId}/pastes/{pasteId}
/users/{userId}/chats/{chatId}/messages/{messageId}
```

每个用户只能访问自己的数据，无法查看其他用户的内容。

## 相关文档

- [Firebase 配置](../deployment/firebase-setup.md) — Firestore 设置
- [Firestore 安全规则](../reference/firestore-security.md) — 权限控制
- [架构参考](../reference/architecture.md) — 数据流详解
