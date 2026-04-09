# 数据流

## 端到端路径：剪贴板 → 存储 → 同步 → AI → UI

```
剪贴板事件（Cmd/Ctrl+V）
    │
    ▼
useClipboard.handlePaste()
    │
    ├─ [文件] ── FileReader.readAsDataURL() ──► base64 内容
    │
    └─ [文本] ── 类型分类 ──► PasteType
            │
            ▼
        PasteItem (id, type, content, suggestedName, isAnalyzing, ...)
            │
     ┌──────┴──────┐
     │             │
     ▼             ▼
usePasteStore    useFirestoreSync
.addItem()       (onSnapshot)
     │             │
     ▼             ▼
savePaste()      handleCloudChange()
(IndexedDB)      (syncRev 比较)
     │             │
     │   ┌─────────┘
     │   │
     ▼   ▼
AppContext.items (React 状态)
     │
     ▼
AppContext 自动分析 useEffect
（检测到 isAnalyzing === true）
     │
     ▼
analyzeContent(item) ──► getAnalysisProvider()
     │                        │
     │              ┌─────────┼─────────┐
     │              ▼         ▼         ▼
     │           Gemini   Minimax   （未来）
     │              │         │
     │              ▼         ▼
     │         { suggestedName, summary }
     │              │
     ▼              ▼
updateItem({ ...item, suggestedName, summary, isAnalyzing: false })
     │
     ├─► savePaste() ──► IndexedDB
     │
     └─► syncEngine.writeWithSync() ──► Firestore
```

## 关键观察

- **UI 从不等待网络**：IndexedDB 写入在异步调用链中是同步的，意味着 UI 在联系 Firestore 之前就更新了。
- **AI 分析是解耦的**：自动分析 `useEffect` 作为 items 数组变更的副作用运行，而不是 `addItem` 的一部分。这意味着 `addItem` 立即完成，分析在后台运行。
- **`GoogleGenAI` 实例是新鲜的**：在 `analyzeContent`、`generateImage` 和 `startLiveSession` 中每次调用时创建，确保始终能获取到设置中的运行时 API 密钥更改。
