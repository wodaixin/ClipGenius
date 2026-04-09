# Internationalization

ClipGenius uses [i18next](https://www.i18next.com/) with `react-i18next` and `i18next-browser-languagedetector` for internationalization.

## File Structure

```
src/i18n/
├── index.ts           # i18next configuration
└── locales/
    ├── en.json        # English UI strings
    └── zh.json        # Chinese UI strings
```

## Adding a New Translation Key

### 1. Add the key to both locale files

In `src/i18n/locales/en.json` and `src/i18n/locales/zh.json`, add the same key structure in both files:

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

### 2. Use the translation in a component

```typescript
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  return <button>{t("myFeature.title")}</button>;
}
```

### 3. Handle pluralization

i18next supports plural forms. Define them in the JSON:

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

Use with `t("itemCount", { count: 5 })`.

### 4. Handle interpolation

Use `{{variable}}` syntax in translations and pass values in `t()`:

```typescript
// JSON
{ "welcome": "Welcome, {{name}}" }

// Component
{t("welcome", { name: user.name })}
```

## Language Detection

`i18next-browser-languagedetector` automatically detects the user's language from:

1. Query string parameter (`?lng=zh` or `?lng=en`)
2. LocalStorage (`i18nextLng`)
3. Navigator language (`navigator.language`)
4. Fallback language (`en`)

Users can switch language in the PasteZone settings panel (`pasteZone.settings.language`).

## Prompt Localization

AI prompts in `src/config/prompts.en.json` and `src/config/prompts.zh.json` are independent of UI i18n. The prompt loader selects the file based on `i18n.language`. Update both prompt files when customizing prompts.

## Testing Translations

1. Change language in the PasteZone settings panel
2. Verify all visible text changes
3. Check browser console for i18next warnings about missing keys
4. Run `npm run lint` — the type checker may flag unused translation keys
