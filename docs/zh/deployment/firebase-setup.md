# Firebase 配置指南

本指南将帮助你在 Firebase Console 中配置 ClipGenius 所需的全部服务。

## 创建 Firebase 项目

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 点击"添加项目"
3. 输入项目名称
4. 启用/禁用 Google Analytics（根据需要）
5. 点击"创建项目"

## 添加 Web 应用

1. 在项目概览页面，点击"添加应用"
2. 选择 Web 图标（`</>`）
3. 输入应用名称
4. **可选**：配置 Firebase Hosting
5. 点击"注册应用"

注册完成后，复制以下配置信息：

```javascript
{
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
}
```

## 启用 Firestore

### 创建数据库

1. 在左侧菜单选择"Firestore Database"
2. 点击"创建数据库"
3. 选择区域（如 `us-central`）
4. 选择安全规则（开发环境可先用"测试模式"）
5. 点击"完成"

### 部署安全规则

建议使用 Firebase CLI 部署安全规则。参见 [Firestore 安全规则](../reference/firestore-security.md)。

## 启用 Google 身份验证

1. 在左侧菜单选择"身份验证"
2. 点击"开始使用"
3. 选择"Google"提供商
4. 启用 Google 登录
5. 选择项目公开名称和客服邮箱
6. 点击"保存"

## 创建 Firestore 索引

ClipGenius 可能需要以下复合索引：

```
pastes 集合：
- userId (升序)
- timestamp (降序)

chats 集合：
- userId (升序)
- updatedAt (降序)
```

索引会在查询时报错时自动提示创建，你也可以在 Firebase Console 中手动创建。

## 数据模型参考

### Firestore 结构

```json
{
  "users": {
    "{userId}": {
      "pastes": {
        "{pasteId}": {
          "id": "pasteId",
          "type": "image|text|url|video|markdown|code",
          "content": "...",
          "mimeType": "image/png",
          "timestamp": "Timestamp",
          "suggestedName": "img_20260402",
          "summary": "...",
          "isAnalyzing": false,
          "isPinned": false,
          "userId": "userId"
        }
      },
      "chats": {
        "{chatId}": {
          "messages": {
            "{messageId}": {
              "id": "messageId",
              "role": "user|model",
              "text": "...",
              "thinking": "...",
              "timestamp": "Timestamp",
              "attachments": [...]
            }
          }
        }
      }
    }
  }
}
```

### Firebase Security Rules

参见 [Firestore 安全规则](../reference/firestore-security.md)。

## 环境变量配置

将 Firebase 配置填入 `.env` 文件：

```env
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_FIRESTORE_DB=your-firestore-database
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
```

## 相关文档

- [Firestore 安全规则](../reference/firestore-security.md) — 安全规则配置
- [同步模式](../features/sync-modes.md) — 数据同步机制
- [环境变量参考](./environment-variables.md) — 完整配置列表
