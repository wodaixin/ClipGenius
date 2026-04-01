# 通过 AI Studio 部署到 Cloud Run

ClipGenius 设计用于通过 Google AI Studio 部署到 Google Cloud Run。

## 概述

AI Studio 提供了一键部署功能，可以：
- 连接到 GitHub 仓库
- 自动构建 Docker 镜像
- 部署到 Cloud Run
- 配置自定义域名

## 前置要求

- GitHub 账户
- Google 账户
- GitHub 上的 ClipGenius 仓库

## 部署步骤

### 1. 连接 GitHub

1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 登录你的 Google 账户
3. 在设置中连接 GitHub
4. 授权 AI Studio 访问你的仓库

### 2. 配置密钥

在 AI Studio 设置中配置以下密钥：

```env
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_FIRESTORE_DB=your-firestore-database
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_GEMINI_API_KEY=your-gemini-api-key
```

这些密钥会以环境变量的形式注入到构建过程中。

### 3. window.aistudio 全局对象

AI Studio 提供 `window.aistudio` 全局对象，让应用可以访问 AI Studio 的付费密钥：

```typescript
interface AistudioGlobal {
  hasSelectedApiKey(): boolean;
  openSelectKey(): void;
  getSelectedApiKey(): string;
}

declare global {
  interface Window {
    aistudio: AistudioGlobal;
  }
}
```

### 4. Export to GitHub

使用 AI Studio 的 "Export to GitHub" 功能：

1. 在 AI Studio 中编辑代码
2. 点击 "Export to GitHub"
3. 选择目标仓库和分支
4. 确认导出

### 5. 自动构建和部署

AI Studio 检测到 GitHub 更新后：
1. 自动触发 Cloud Build
2. 构建 Docker 镜像
3. 部署到 Cloud Run
4. 返回部署状态

## 构建输出

构建完成后，AI Studio 会输出：
- Cloud Run 服务 URL
- 构建日志
- 监控链接

## 自定义域名

Cloud Run 支持配置自定义域名：

1. 在 Cloud Run 服务设置中添加域名
2. 在 DNS 服务商处配置 CNAME 记录
3. 等待 SSL 证书自动配置

## 环境变量配置

在 AI Studio 中配置的所有 `VITE_*` 环境变量：
- 构建时注入
- 客户端代码可访问
- **不会暴露在浏览器开发者工具中**（Vite 会处理）

## 相关文档

- [Firebase 配置](./firebase-setup.md) — Firebase 项目配置
- [环境变量参考](./environment-variables.md) — 所有配置项
- [AI Studio 专业模式](../guides/ai-studio-pro-mode.md) — 付费密钥使用
