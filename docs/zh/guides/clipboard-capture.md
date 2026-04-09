# 剪贴板捕获

ClipGenius 通过监听 `window` 对象上的全局 `paste` 事件，自动将剪贴板内容分类为六种类型之一。

## 工作原理

### 粘贴事件处理

`useClipboard` 钩子（`src/hooks/useClipboard.ts`）在 `window` 上注册 `paste` 事件监听器。关键行为：

- **忽略输入框**：来自 `<input>`、`<textarea>` 或 `contenteditable` 元素的粘贴事件会被忽略，不影响正常文本编辑。
- **忽略隐藏标签页**：如果 `document.hidden` 为 true（另一个浏览器标签页处于活动状态），则忽略事件。
- **StrictMode 防抖**：React StrictMode 在开发模式下会双重挂载组件，模块级 500ms 防抖机制防止重复捕获。
- **FileReader 异步读取**：图片和视频通过 `FileReader.readAsDataURL()` 读取为 Base64 数据 URI（异步）。粘贴事件在文件读取前就完成了；在 `reader.onload` 时将条目添加到存储中。

### 内容类型分类

按优先级顺序确定类型：

1. **图片** — `file.type.startsWith("image/")`
2. **视频** — `file.type.startsWith("video/")`
3. **Facebook 视频 URL** — 匹配 `scontent-*.xx.fbcdn.net` 或 `video*.fbcdn.net` 且包含 `.mp4` 的 URL → 通过 CORS 代理下载并存储为视频
4. **URL** — 匹配 `/^https?:\/\/[^\s/$.?#].[^\s]*$/i`
5. **Markdown** — 正则 `/^#{1,6} |^\*\*|^- \*[^*]+\*|```|\[.+\]\(.+\)|^>\s/m`（标题、粗体、列表、代码块、链接、引用）
6. **代码** — 通过 `detectCodeLanguage()` 启发式方法检测语言
7. **文本** — 纯文本的兜底类型

### 代码语言检测

`detectCodeLanguage()` 函数使用正则规则对修剪后的前 200 个字符进行检测：

| 正则模式 | 检测到的语言 |
|---|---|
| `^\s*\{[\s\S]*\}\s*$` 或 `^\s*\[[\s\S]*\]\s*$` | json |
| `<\?xml\|<\/[a-zA-Z]+>` | xml |
| `<!DOCTYPE html\|<html\|<\/div>\|<\/span>` | html |
| `^\s*SELECT\s\|^\s*INSERT\s\|^\s*UPDATE\s\|^\s*CREATE\s` | sql |
| `^def \|^from .+ import\|^async def /m` | python |
| `^func \|^package \|^import \(|:= /` | go |
| `^fn \|^let mut \|^use std::\|^impl \|^pub fn /m` | rust |
| `^#include\|^int main\(\|std::\|cout <` | cpp |
| `^import \|^export \|^const \|^let \|^var \|=>` | typescript |
| `^import \|^export \|^const \|^let \|^var \|=>` | javascript |
| `^public class \|^private \|^protected \|^import java\.` | java |
| `^using System\|^namespace \|^public class` | csharp |
| `^<\?php\|^\$[a-z_]+ =\|echo \|->` | php |
| `^#!\/bin\/bash\|^\$\(\|^if \[\|^fi$\|^echo` | bash |
| `^[a-z-]+:\s*$\|^\s{2,}[a-z-]+:` | yaml |
| `^\[.+\]\s*$\|^[a-z_]+ = /` | toml |
| 兜底条件：`[{};()=>]` + 超过 2 行 | `code` |

### Facebook 视频下载

当粘贴 Facebook CDN URL（例如来自 Facebook 帖子或直播）时，ClipGenius 会尝试将其下载为视频：

1. 先尝试直接 `fetch()`（会使用系统代理如 Clash）
2. 直接请求失败时， fallback 到 CORS 代理（`VITE_CORS_PROXY_URL`，默认为 `https://corsproxy.io`）
3. 下载成功：存储为 `video` 类型，Base64 编码内容
4. 下载失败：存储为 `url` 类型（保留原始 URL）

### 存储格式

| 类型 | 内容格式 | mimeType |
|---|---|---|
| `image` | Base64 数据 URI | `image/*`（来自文件） |
| `video` | Base64 数据 URI | `video/mp4` |
| `url` | 原始文本 URL | `text/uri-list` |
| `text` | 原始文本 | `text/plain` |
| `markdown` | 原始文本 | `text/plain` |
| `code` | 原始文本 | `code/{language}` |

## 拖放上传

将文件拖放到粘贴区也支持。`useClipboard` 钩子暴露了 `handleDragOver`、`handleDragLeave` 和 `handleDrop`，用于设置 `usePasteStore` 中的 `isDragging` 状态。文件拖放的处理方式与剪贴板文件捕获相同。
