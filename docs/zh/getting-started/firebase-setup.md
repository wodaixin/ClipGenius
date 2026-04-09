# Firebase 配置

## 1. 创建 Firebase 项目

1. 打开 [Firebase Console](https://console.firebase.google.com/)
2. 点击 **Add project**，输入项目名称（例如 `clipgenius`）
3. 出现提示时关闭 Google Analytics（本应用不需要）
4. 点击 **Create project**

## 2. 启用 Google 登录

1. 在左侧边栏中进入 **Build → Authentication → Get started**
2. 点击 **Sign-in method** 标签
3. 找到 **Google** 并点击
4. 打开 **Enable** 开关
5. 选择一个项目支持邮箱
6. 点击 **Save**

## 3. 创建 Firestore 数据库

1. 在左侧边栏中进入 **Build → Firestore Database → Create database**
2. 选择 **Start in test mode**（稍后会添加安全规则）
3. 选择离用户较近的 Firestore 区域
4. 点击 **Enable**

## 4. 配置 Firestore 安全规则

在 **Firestore Database → Rules** 中，用以下内容替换现有规则：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 用户只能读写自己的数据
    match /users/{userId}/pastes/{pasteId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/chats/{chatId}/messages/{messageId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

点击 **Publish**。

## 5. 注册 Web 应用

1. 进入 **Project Settings**（侧边栏中的齿轮图标）
2. 向下滚动到 **Your apps**，点击网页图标（`</>`）
3. 输入应用昵称（例如 `ClipGenius Web`）
4. **不要**勾选 "Also set up Firebase Hosting"
5. 点击 **Register app**
6. 复制显示的 `firebaseConfig` 对象

## 6. 将 Firebase 配置添加到 `.env`

将 `firebaseConfig` 对象中的值复制到 `.env` 文件：

```env
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_FIRESTORE_DB="your-firestore-database-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
```

> **注意：** `VITE_FIREBASE_FIRESTORE_DB` 是 Firestore 页面顶部显示的数据库 ID（默认为 `(default)`）。

## 7. 部署 Firestore 索引

项目需要复合索引用于 Firestore 查询。将项目根目录的 `firestore.indexes.json` 导入 Firebase 项目：

1. 在 Firebase Console 中进入 **Firestore → Indexes**
2. 点击 **Add Index** 或使用 **Import indexes** 选项
3. 导入 `firestore.indexes.json` 文件

必需索引：
- 集合 `pastes`：`userId (ASC)`、`updatedAt (DESC)`
- 集合 `pastes`：`userId (ASC)`、`syncRev (DESC)`

## 8. 重启开发服务器

如果开发服务器正在运行，重启以加载新的 `.env` 配置：

```bash
npm run dev
```

## 验证

1. 打开应用并点击 **Login with Google**
2. 登录后复制一些文本（`Cmd/Ctrl+C`）
3. 在应用中粘贴（`Cmd/Ctrl+V`，不在输入框内）
4. 打开 Firebase Console → Firestore → Data
5. 应该能看到 `users/{你的uid}/pastes/{pasteId}` 文档

## 故障排除

### "auth/developer-app-not-authorized"

你的 API 密钥可能不允许来自 `localhost` 的请求。在 Google Cloud Console 中，将 `localhost` 添加到 Firebase Web API 密钥的允许引用来源（**APIs & Services → Credentials → API Key → Website restrictions**）。

### "Missing or insufficient permissions"

Firestore 安全规则阻止了请求。请确认已登录（访客模式不进行同步），且规则与上述格式一致。

### "登录后云同步不工作"

重启开发服务器以确保新的 Firebase 配置已加载。同时检查浏览器控制台中的同步错误。
