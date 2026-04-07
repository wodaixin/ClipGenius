# Firestore 安全规则

本文档定义了 ClipGenius 的 Firestore 安全规则，确保用户只能访问自己的数据。

## 数据模型

### 集合结构

```
/users/{userId}/pastes/{pasteId}
/users/{userId}/chats/{chatId}/messages/{messageId}
```

### PasteItem 结构

```json
{
  "id": "string",
  "type": "image|text|url|video|markdown|code",
  "content": "string",
  "mimeType": "string",
  "timestamp": "Timestamp",
  "suggestedName": "string",
  "summary": "string",
  "isAnalyzing": "boolean",
  "isPinned": "boolean",
  "userId": "string"
}
```

### ChatMessage 结构

```json
{
  "id": "string",
  "role": "user|model",
  "text": "string",
  "thinking": "string",
  "timestamp": "Timestamp",
  "attachments": [
    {
      "id": "string",
      "type": "string",
      "content": "string",
      "mimeType": "string",
      "suggestedName": "string"
    }
  ]
}
```

## 辅助函数

### `isSignedIn()`

检查用户是否已登录：

```javascript
function isSignedIn() {
  return request.auth != null;
}
```

### `isOwner(userId)`

检查当前用户是否为数据所有者：

```javascript
function isOwner(userId) {
  return isSignedIn() && request.auth.uid == userId;
}
```

### `isValidPasteType(type)`

验证剪贴类型是否有效：

```javascript
function isValidPasteType(type) {
  return type in ['image', 'text', 'url', 'video', 'markdown', 'code'];
}
```

### `isValidRole(role)`

验证消息角色是否有效：

```javascript
function isValidRole(role) {
  return role in ['user', 'model'];
}
```

### `isAdmin()`

检查用户是否为管理员（可访问所有用户数据）：

```javascript
function isAdmin() {
  return isAuthenticated() && (
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
    (request.auth.token.email == "wodaixin@gmail.com" && request.auth.token.email_verified == true)
  );
}
```

**满足以下任一条件即为管理员：**
- Firestore 中该用户的 `role` 字段为 `'admin'`
- 邮箱为 `wodaixin@gmail.com` 且通过 Google 验证

## 规则详解

### 用户集合规则

```javascript
match /users/{userId} {
  // 用户可以读取自己的数据
  allow read: if isSignedIn();

  // 只有数据所有者可以写入
  allow write: if isOwner(userId);
}
```

### 剪贴记录规则

```javascript
match /users/{userId}/pastes/{pasteId} {
  // 需要登录且为所有者
  allow read: if isOwner(userId);
  allow create: if isOwner(userId)
                 && resource.data.userId == userId;
  allow update: if isOwner(userId);
  allow delete: if isOwner(userId);
}
```

### 聊天规则

```javascript
match /users/{userId}/chats/{chatId} {
  allow read: if isOwner(userId);
  allow write: if isOwner(userId);

  match /messages/{messageId} {
    allow read: if isOwner(userId);
    allow write: if isOwner(userId);
  }
}
```

## 安全要点

### 1. 数据隔离

- 每个用户只能访问 `/users/{userId}/...` 路径
- `request.auth.uid` 必须匹配路径中的 `userId`
- 无法通过猜测 userId 访问他人数据

### 2. 类型验证

- 所有类型字段必须通过验证函数检查
- 防止写入无效数据类型

### 3. 字段一致性

- 创建时强制 `userId` 字段与路径匹配
- 防止通过写入操作修改 userId

### 4. 认证要求

- 所有操作都需要登录
- 未登录用户无法读写任何数据

### 5. ⚠️ 管理员邮箱

- `firestore.rules` 中硬编码了管理员邮箱 `"wodaixin@gmail.com"`
- **部署前必须修改**：将其改为你自己的 Google 邮箱
- 修改后运行 `firebase deploy --only firestore:rules` 部署
- 只有指定的邮箱且通过 Google 验证才能获得管理员权限

## 使用 Firebase Emulator Suite 测试

在本地测试安全规则：

### 1. 启动模拟器

```bash
firebase init emulators
firebase emulators:start
```

### 2. 配置测试

```javascript
// test/security-rules.spec.js
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

describe('ClipGenius Security Rules', () => {
  it('allow owner to read their pastes', async () => {
    const db = await assertSucceeds(
      firestore()
        .collection('users')
        .doc('user1')
        .collection('pastes')
        .get()
    );
  });

  it('deny access to other user data', async () => {
    const db = await assertFails(
      firestore()
        .collection('users')
        .doc('user2')  // 不是当前用户
        .collection('pastes')
        .get()
    );
  });
});
```

### 3. 运行测试

```bash
firebase emulators:exec --only firestore 'npm test'
```

## 相关文档

- [Firebase 配置](../deployment/firebase-setup.md) — Firestore 项目配置
- [Firebase 安全规则文档](https://firebase.google.com/docs/rules) — 官方指南
- [同步模式](../features/sync-modes.md) — 数据同步机制
