# Internationalization Guide

**Overview** — ClipGenius uses [i18next](https://www.i18next.com/) with `react-i18next` and `i18next-browser-languagedetector` for internationalization. The app ships with English and Simplified Chinese.

**Stack**

- `i18next` — core i18n library
- `react-i18next` — React bindings
- `i18next-browser-languagedetector` — auto-detects browser language

**Source of Truth**

Translation files are located at:
- `src/i18n/locales/en.json` — English strings
- `src/i18n/locales/zh.json` — Simplified Chinese strings

These are the authoritative sources. Do not edit the copies in `public/locales/` directly.

**Initialization**

```typescript
// From src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    resources: {
      en: { translation: require("./locales/en.json") },
      zh: { translation: require("./locales/zh.json") },
    },
  });
```

The detection order is: `localStorage` (user's saved preference) → `navigator.language` (browser language). The preference is cached in `localStorage`.

**Static Locale Files**

The project includes static copies of the translation files in `public/locales/`:
- `public/locales/en/translation.json`
- `public/locales/zh/translation.json`

**Known Issue:** These files are currently out of sync with `src/i18n/locales/`. When adding or modifying translation keys, update both locations:
1. `src/i18n/locales/{lang}.json` (runtime source)
2. `public/locales/{lang}/translation.json` (static served copy)

**Language Suffix for AI Responses**

The language of AI responses is controlled by AI prompt templates. Changing the UI language automatically switches the AI's response language.

See [AI Prompts Configuration](ai-prompts.md) for details on customizing prompts.

**Adding New Translation Keys**

1. Add the key to both `src/i18n/locales/en.json` and `zh.json`
2. Use in a component: `const { t } = useTranslation(); t("myKey")`
3. Update `public/locales/{lang}/translation.json` copies

**RTL Languages**

The app currently does not support right-to-left languages. Adding RTL support would require additional CSS and layout changes.

---

## Related

- [AI Prompts Configuration](ai-prompts.md) — Customize AI prompt templates
