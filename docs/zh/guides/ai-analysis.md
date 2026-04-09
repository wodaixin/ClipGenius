# AI 分析

启用自动分析后，ClipGenius 会将每个捕获的剪贴板条目发送给 AI 提供商，生成**建议的文件名**和**内容摘要**。

## 自动分析的工作原理

分析流程集中在 `AppContext`（`src/context/AppContext.tsx`）中：

```
粘贴条目被捕获（isAnalyzing = true）
    ↓
AppContext 自动分析 Effect 检测到 isAnalyzing = true
    ↓
调用 analyzeContent(item) → 路由到正确的提供商
    ↓
提供商返回 { suggestedName, summary }
    ↓
updateItem({ ...item, suggestedName, summary, isAnalyzing: false })
    ↓
结果保存到 IndexedDB + 同步到 Firestore
```

`AppContext` 使用基于 `ref` 的去重映射（`analysisPromises.current`）来防止同一 ID 的条目在 items 数组中多次出现时（如 StrictMode 重渲染导致）重复调用分析。

## 提供商路由

分析根据条目的内容类型和按类型的路由设置，路由到对应的提供商。完整的路由表请参见 [AI 提供商模型](../architecture/provider-model.md)。

默认路由（来自 `src/lib/settings.ts`）：

| 内容类型 | 默认提供商 |
|---|---|
| `image` | Gemini |
| `text` | Minimax |
| `url` | Gemini |
| `video` | Gemini |
| `markdown` | Minimax |
| `code` | Minimax |

应用内设置界面允许按类型覆盖提供商设置，存储在 `localStorage["clipgenius_settings"].analysisProvidersByType` 中。

## 响应格式

AI 被指示返回 JSON 对象：

```json
{
  "suggestedName": "project_notes_20260409",
  "summary": "Q2 规划会议纪要，涵盖路线图优先事项..."
}
```

Gemini 使用 `responseMimeType: "application/json"` 获取结构化输出。Minimax 使用提示词工程，解析时采用三轮尝试（直接解析 → 移除代码块标记 → 贪婪匹配）。

## 错误处理

- 分析**成功**：`isAnalyzing` 设为 `false`，`suggestedName` 和 `summary` 被保存。
- 分析**失败**：`isAnalyzing` 设为 `false`，条目保留原始 `suggestedName`（基于时间戳的默认值）。错误不会被静默丢弃，所有失败都记录到控制台。
- **不自动重试**：失败的分析不会自动重试。用户可以通过卡片上的 "Re-analyze" 按钮手动重新触发。

## 手动重新分析

点击任意 PasteCard 上的 **Re-analyze** 按钮可对该条目重新运行分析。这会将 `isAnalyzing` 再次设为 `true`，触发自动分析 Effect。

## 设置

粘贴区顶部的自动分析开关控制新条目捕获时是否进行分析。关闭时，条目以 `isAnalyzing: false` 保存，不会调用 AI。该开关状态存储在 `localStorage["autoAnalyze"]` 中。
