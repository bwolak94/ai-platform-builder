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

  mergeNamespaces: tool({
    description:
      "Merge all keys from a source namespace into a target namespace and remove the source namespace. Key paths are re-prefixed: 'source.foo' → 'target.foo'.",
    inputSchema: z.object({
      sourceNamespace: z.string().describe("Namespace prefix to merge from, e.g. 'auth'"),
      targetNamespace: z.string().describe("Namespace prefix to merge into, e.g. 'common'"),
    }),
  }),

  splitNamespace: tool({
    description:
      "Extract a set of keys matching a prefix into a new sub-namespace. E.g. move all 'checkout.payment.*' keys into a new 'payment' namespace.",
    inputSchema: z.object({
      keyPrefix: z.string().describe("Full key prefix to extract, e.g. 'checkout.payment'"),
      newNamespace: z.string().describe("New namespace root, e.g. 'payment'"),
    }),
  }),

  findDuplicateValues: tool({
    description:
      "Find translation keys that have identical source text (potential consolidation candidates). Returns groups of keys sharing the same source value.",
    inputSchema: z.object({
      language: z
        .string()
        .optional()
        .describe("Language to check for duplicate values. Defaults to source language."),
    }),
  }),

  generateTypeFile: tool({
    description:
      "Generate a TypeScript declaration file with a typed TranslationKeys union and a typed t() helper, enabling compile-time key safety with i18next or next-intl.",
    inputSchema: z.object({
      outputFormat: z
        .enum(["i18next", "next-intl", "react-intl"])
        .default("i18next")
        .describe("Target i18n library for the generated types"),
    }),
  }),

  exportToXliff: tool({
    description:
      "Export translations as an XLIFF 2.0 XML file for a specific language pair, ready for professional CAT tools like OmegaT, SDL Trados, or MemoQ.",
    inputSchema: z.object({
      sourceLanguage: z.string().describe("Source language code, e.g. 'en'"),
      targetLanguage: z.string().describe("Target language code, e.g. 'de'"),
    }),
  }),

  setPluralRules: tool({
    description:
      "Configure plural rule categories for a language (CLDR plural rules: zero, one, two, few, many, other). Adds placeholder translation keys for each plural form.",
    inputSchema: z.object({
      language: z.string().describe("ISO language code to configure plurals for"),
      forms: z
        .array(z.enum(["zero", "one", "two", "few", "many", "other"]))
        .describe("CLDR plural forms supported by this language"),
    }),
  }),

  generateNamespaceSummary: tool({
    description:
      "Generate a Markdown summary report grouped by namespace: total keys, completion percentage per language, and list of missing translations.",
    inputSchema: z.object({}),
  }),

  retrieveDocs: tool({
    description: "Search docs for i18n patterns, ICU message format, and pluralization.",
    inputSchema: z.object({
      query: z.string(),
    }),
  }),
};
