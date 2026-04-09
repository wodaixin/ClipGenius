# 国际化

ClipGenius 使用 [i18next](https://www.i18next.com/) 配合 `react-i18next` 和 `i18next-browser-languagedetector` 实现国际化。

## 文件结构

```
src/i18n/
├── index.ts           # i18next 配置
└── locales/
    ├── en.json        # 英文 UI 字符串
    └── zh.json        # 中文 UI 字符串
```

## 添加新的翻译键

### 1. 在两个语言文件中添加相同的键结构

在 `src/i18n/locales/en.json` 和 `src/i18n/locales/zh.json` 中，以相同的键结构添加到两个文件：

```json
// en.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is a description"
  }
}

// zh.json
{
  "myFeature": {
    "title": "我的功能",
    "description": "这是描述"
  }
}
```

### 2. 在组件中使用翻译

```typescript
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  return <button>{t("myFeature.title")}</button>;
}
```

### 3. 处理复数

i18next 支持复数形式。在 JSON 中定义：

```json
// en.json
{
  "itemCount": "{{count}} item",
  "itemCount_plural": "{{count}} items"
}
```

```json
// zh.json
{
  "itemCount": "{{count}} 个项目",
  "itemCount_plural": "{{count}} 个项目"
}
```

配合 `t("itemCount", { count: 5 })` 使用。

### 4. 处理插值

在翻译中使用 `{{variable}}` 语法，在 `t()` 中传递值：

```typescript
// JSON
{ "welcome": "Welcome, {{name}}" }

// 组件
{t("welcome", { name: user.name })}
```

## 语言检测

`i18next-browser-languagedetector` 自动从以下来源检测用户语言：

1. 查询字符串参数（`?lng=zh` 或 `?lng=en`）
2. LocalStorage（`i18nextLng`）
3. 浏览器语言（`navigator.language`）
4. 回退语言（`en`）

用户可以在粘贴区设置面板（`pasteZone.settings.language`）中切换语言。

## 提示词本地化

`src/config/prompts.en.json` 和 `src/config/prompts.zh.json` 中的 AI 提示词独立于 UI i18n。提示词加载器根据 `i18n.language` 选择文件。自定义提示词时请同时更新两个提示词文件。

## 测试翻译

1. 在粘贴区设置面板中切换语言
2. 验证所有可见文本是否改变
3. 检查浏览器控制台中是否有 i18next 关于缺失键的警告
4. 运行 `npm run lint` — 类型检查器可能会标记未使用的翻译键
