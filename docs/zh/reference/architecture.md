# 架构参考

本文档详细说明 ClipGenius 的系统架构和设计模式。

## 高层次数据流

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser                                │
├─────────────────────────────────────────────────────────────┤
│  Clipboard Event (paste)                                    │
│       ↓                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  useClipboard Hook                                   │    │
│  │  - 检测内容类型                                       │    │
│  │  - Base64 编码（图片/视频）                            │    │
│  │  - 类型分类（URL/Markdown/Code/Text）                 │    │
│  └─────────────────────────────────────────────────────┘    │
│       ↓                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  usePasteStore                                       │    │
│  │  - 保存到 IndexedDB                                  │    │
│  │  - 触发 AI 分析                                       │    │
│  │  - 触发 Firestore 同步（已登录）                      │    │
│  └─────────────────────────────────────────────────────┘    │
│       ↓                                                      │
│  ┌───────────────┐    ┌───────────────┐                    │
│  │   IndexedDB    │    │   Firestore   │                    │
│  │  (本地持久化)   │    │   (云同步)     │                    │
│  └───────────────┘    └───────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

## Provider 架构

```
┌─────────────────────────────────────────────────────┐
│  AI Service Layer (analyzeContent, generateImage)   │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Provider Router (services/ai/providers/index.ts)  │
│  根据 VITE_*_PROVIDER 选择 Provider                 │
└─────────────────────────────────────────────────────┘
         ↓                    ↓
┌────────────────┐    ┌────────────────┐
│  Gemini (默认)  │    │   Minimax      │
│  - gemini.ts   │    │  - minimax.ts  │
│  - gemini-     │    │  - minimax-    │
│    chat.ts     │    │    chat.ts     │
└────────────────┘    └────────────────┘
```

## 上下文层级

```
App.tsx (根组件)
  │
  ├─ AppContext
  │    ├─ 拖拽状态
  │    ├─ 模态框状态
  │    └─ 应用设置
  │
  ├─ AuthContext
  │    ├─ 用户认证状态
  │    ├─ Firebase Auth 集成
  │    └─ 登录/登出函数
  │
  └─ ChatContext
       ├─ 消息历史
       ├─ 附件状态
       └─ AI 响应状态
```

## 双重写入模式

### 写入流程

```
用户操作 → 立即写入 IndexedDB → 异步写入 Firestore（已登录）
              ↓                          ↓
         乐观更新                   处理失败回滚
```

### 读取流程

```
应用启动 → 读取 IndexedDB → 订阅 Firestore 变更（已登录）
               ↓                        ↓
          立即显示                  云端数据覆盖本地
```

## 云端胜出语义

Firestore 订阅采用云端胜出策略：

```typescript
useFirestoreSync(() => {
  onSnapshot(collection(db, 'pastes'), (snapshot) => {
    snapshot.forEach(doc => {
      // 用云端数据完全覆盖本地
      updateLocalStore(doc.data());
    });
  });
});
```

这意味着：
- 云端数据始终优先
- 本地修改会在云端更新时丢失
- 适合多设备同步场景

## GoogleGenAI 实例化策略

每个 AI 调用创建新的 GoogleGenAI 实例：

```typescript
async function analyzeContent(content: string) {
  // 每次调用都创建新实例
  // 确保读取最新的 API 密钥
  const genAI = new GoogleGenAI({
    apiKey: getApiKey(),  // 动态获取密钥
  });

  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  const result = await model.generateContent(prompt);
  return result.text();
}
```

这样做是为了：
- 支持 `window.aistudio` 动态密钥选择
- 避免实例缓存导致的密钥过期问题
- 符合 AI Studio 的最佳实践

## Vite Proxy 配置

对于需要代理的请求（如 Minimax）：

```javascript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api/minimax': {
        target: 'https://api.minimaxi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/minimax/, ''),
      },
    },
  },
});
```

这样客户端代码可以使用相对路径：

```typescript
const response = await fetch('/api/minimax/v1/text/chatcompletion_v2', {
  // ...
});
```

## 文本预览截断

为防止大数据导致性能问题，文本预览有长度限制：

```typescript
const PREVIEW_LIMIT = 2000;  // 字符数

function truncateForPreview(text: string): string {
  if (text.length > PREVIEW_LIMIT) {
    return text.slice(0, PREVIEW_LIMIT) + '...';
  }
  return text;
}
```

## 关键文件

| 文件 | 职责 |
|---|---|
| `src/hooks/useClipboard.ts` | 剪贴板事件监听和类型检测 |
| `src/hooks/usePasteStore.ts` | PasteItem CRUD 和状态管理 |
| `src/hooks/useFirestoreSync.ts` | Firestore 实时订阅 |
| `src/services/sync/dualSync.ts` | 双重写入逻辑 |
| `src/services/ai/providers/index.ts` | Provider 路由 |
| `src/lib/db.ts` | IndexedDB 操作封装 |
| `src/context/AppContext.tsx` | 应用级状态 |

## 相关文档

- [剪贴板捕获](../features/clipboard-capture.md) — 事件监听机制
- [同步模式](../features/sync-modes.md) — 双写和云端胜出
- [环境变量参考](../deployment/environment-variables.md) — Provider 配置
