import { tool } from "ai";
import { z } from "zod";

export const i18nTools = {
  queryStore: tool({
    description:
      "Get the current i18n store state including all keys, translations, missing entries, and validation issues. ALWAYS call this first before any modifications.",
    inputSchema: z.object({}),
  }),

  addKey: tool({
    description: "Add a new translation key with initial translations for all active languages.",
    inputSchema: z.object({
      key: z.string().describe("Dot-notation namespaced key, e.g. 'auth.login.title'"),
      sourceText: z.string().optional().describe("Source language text (if known)"),
      translations: z
        .record(z.string(), z.string())
        .describe("Map of language code to translation string"),
      description: z.string().optional().describe("Context note for translators"),
    }),
  }),

  updateTranslation: tool({
    description: "Update a single translation value for a specific key and language.",
    inputSchema: z.object({
      key: z.string().describe("Dot-notation key to update"),
      language: z.string().describe("ISO 639-1 language code"),
      value: z.string(),
    }),
  }),

  removeKey: tool({
    description: "Remove a translation key from all languages.",
    inputSchema: z.object({
      key: z.string().describe("Dot-notation key to remove"),
    }),
  }),

  renameKey: tool({
    description:
      "Rename a translation key's dot-notation path. Preserves all existing translations.",
    inputSchema: z.object({
      oldKey: z.string().describe("Existing dot-notation key path"),
      newKey: z.string().describe("New dot-notation key path"),
    }),
  }),

  addLanguage: tool({
    description:
      "Add a new language to the store. Existing keys will have empty translations for this language.",
    inputSchema: z.object({
      code: z.string().describe("ISO 639-1 language code, e.g. 'de', 'fr', 'ja', 'zh-CN'"),
      label: z.string().optional().describe("Human-readable language name, e.g. 'German'"),
    }),
  }),

  removeLanguage: tool({
    description:
      "Remove a language and all its translations from the store. Cannot remove the source language.",
    inputSchema: z.object({
      code: z.string().describe("ISO language code to remove"),
    }),
  }),

  bulkSetTranslations: tool({
    description:
      "Set multiple translations for a key at once (e.g. after autoTranslate returns results).",
    inputSchema: z.object({
      key: z.string().describe("Dot-notation key to update"),
      translations: z
        .record(z.string(), z.string())
        .describe("Map of language code to translation string"),
    }),
  }),

  importFromJson: tool({
    description:
      "Import translations from an existing flat JSON map into the store. Adds new keys and updates existing ones. Use flattenJson first if the input is nested.",
    inputSchema: z.object({
      lang: z.string().describe("ISO language code for these translations"),
      entries: z
        .record(z.string(), z.string())
        .describe("Flat dot-notation key → translated string map"),
    }),
  }),

  validateStore: tool({
    description:
      "Validate the store for ICU format errors, missing translations, empty strings, and duplicate keys. Returns a structured report.",
    inputSchema: z.object({}),
  }),

  searchKeys: tool({
    description: "Search and filter translation keys by name pattern or missing language.",
    inputSchema: z.object({
      pattern: z
        .string()
        .optional()
        .describe("Regex pattern to match against key name or source text"),
      missingIn: z
        .string()
        .optional()
        .describe("ISO language code — return only keys missing a translation in this language"),
    }),
  }),

  detectUnusedKeys: tool({
    description:
      "Compare the defined translation keys against a list of usages extracted from source code. Returns keys that are defined but never referenced in the provided usage list.",
    inputSchema: z.object({
      usages: z
        .array(z.string())
        .describe(
          "Flat list of dot-notation keys actually used in source code (extracted from t('key') calls)"
        ),
    }),
  }),

  scoreTranslationQuality: tool({
    description:
      "Audit translation quality across all languages. Checks for: missing ICU placeholders in target vs source, suspiciously short/truncated strings, identical source=translation (untranslated), and empty strings.",
    inputSchema: z.object({
      language: z
        .string()
        .optional()
        .describe("Scope the audit to one language code. Omit to audit all languages."),
    }),
  }),

  setLanguageRTL: tool({
    description:
      "Mark a language as right-to-left (RTL). Affects export metadata and adds a note in the preview about required dir='rtl' attributes.",
    inputSchema: z.object({
      code: z.string().describe("ISO language code to mark as RTL, e.g. 'ar', 'he', 'fa'"),
      rtl: z.boolean().default(true).describe("True to mark as RTL, false to remove the flag"),
    }),
  }),

  addGlossaryTerm: tool({
    description:
      "Lock a translation for a specific term in a target language. Future autoTranslate calls will use this term consistently.",
    inputSchema: z.object({
      sourceTerm: z.string().describe("The source language term to lock, e.g. 'Dashboard'"),
      language: z.string().describe("Target language code for this glossary entry"),
      targetTerm: z.string().describe("The locked translation to use, e.g. 'Tableau de bord'"),
    }),
  }),

  generateVersionDiff: tool({
    description:
      "Compare the current store against a provided previous JSON snapshot and return a changelog of added, removed, and modified keys.",
    inputSchema: z.object({
      previousSnapshot: z
        .record(z.string(), z.record(z.string(), z.string()))
        .describe(
          "Previous store snapshot as { lang: { 'dot.key': 'value' } } — paste the exported JSON"
        ),
    }),
  }),

  retrieveDocs: tool({
    description: "Search docs for i18n patterns, ICU message format, and pluralization.",
    inputSchema: z.object({
      query: z.string(),
    }),
  }),
};
