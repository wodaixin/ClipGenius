# 国际化指南

ClipGenius 使用 i18next 实现多语言支持。

## 技术栈

- **i18next** — 国际化框架
- **react-i18next** — React 绑定
- **i18next-browser-languagedetector** — 自动检测浏览器语言

## 翻译文件结构

翻译文件位于 `src/i18n/locales/` 目录：

```
src/i18n/
├── index.ts           # i18next 配置
└── locales/
    ├── en.json         # 英语
    └── zh.json         # 中文
```

## 翻译源

所有 UI 字符串的翻译源位于 `src/i18n/locales/zh.json`。

添加新功能时：
1. 在 `zh.json` 中添加新的 key-value 对
2. 在 `en.json` 中添加对应的英语翻译
3. 在组件中使用 `useTranslation` hook

## i18n 初始化

```typescript
// src/i18n/index.ts

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zh from './locales/zh.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false,
    },
  });
```

## 使用翻译

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('pasteZone.heading')}</h1>
      <p>{t('pasteZone.description')}</p>
    </div>
  );
}
```

## 添加新翻译 key

### 步骤 1：更新 zh.json

```json
{
  "myComponent": {
    "title": "我的标题",
    "description": "我的描述"
  }
}
```

### 步骤 2：更新 en.json

```json
{
  "myComponent": {
    "title": "My Title",
    "description": "My Description"
  }
}
```

### 步骤 3：在组件中使用

```typescript
const { t } = useTranslation('myComponent');
// 或者
const { t } = useTranslation();
t('myComponent.title')
```

## AI 提示词配置

AI 响应的语言由提示词模板控制。切换 UI 语言会自动切换 AI 的响应语言。

详见 [AI 提示词配置](ai-prompts.md)。

## 已知问题

### 关于 i18n 同步

i18next 库在某些情况下可能存在时序问题。如果遇到翻译不显示：
1. 检查语言文件路径是否正确
2. 确认 i18n 在 App 渲染前初始化
3. 使用 `<Suspense>` 包装使用翻译的组件

## RTL 语言支持

目前 ClipGenius 主要支持 LTR（从左到右）语言。如需支持 RTL 语言（如阿拉伯语、希伯来语），需要在 Tailwind CSS 配置中添加 RTL 支持。

## 相关文档

- [AI 提示词配置](ai-prompts.md) — AI 提示词定制
- [React i18next 文档](https://react.i18next.com/) — 官方教程
