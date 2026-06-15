import { tool } from "ai";
import { z } from "zod";

export const i18nTools = {
  queryStore: tool({
    description: "Get the current i18n store state including all keys and translations.",
    parameters: z.object({}),
  }),

  addKey: tool({
    description: "Add a new translation key with initial translations for all active languages.",
    parameters: z.object({
      key: z.string().describe("Dot-notation namespaced key, e.g. 'auth.login.title'"),
      translations: z.record(z.string()).describe("Map of language code to translation string"),
      description: z.string().optional().describe("Context note for translators"),
    }),
  }),

  updateTranslation: tool({
    description: "Update a single translation value for a specific key and language.",
    parameters: z.object({
      key: z.string(),
      language: z.string().describe("ISO 639-1 language code"),
      value: z.string(),
    }),
  }),

  removeKey: tool({
    description: "Remove a translation key from all languages.",
    parameters: z.object({
      key: z.string(),
    }),
  }),

  addLanguage: tool({
    description:
      "Add a new language to the store. Existing keys will have empty translations for this language.",
    parameters: z.object({
      code: z.string().describe("ISO 639-1 language code, e.g. 'de', 'fr'"),
      label: z.string().describe("Human-readable language name, e.g. 'German'"),
    }),
  }),

  removeLanguage: tool({
    description: "Remove a language and all its translations from the store.",
    parameters: z.object({
      code: z.string(),
    }),
  }),

  bulkSetTranslations: tool({
    description: "Set multiple translations for a key at once.",
    parameters: z.object({
      key: z.string(),
      translations: z.record(z.string()).describe("Map of language code to translation string"),
    }),
  }),

  retrieveDocs: tool({
    description: "Search docs for i18n patterns, ICU message format, and pluralization.",
    parameters: z.object({
      query: z.string(),
    }),
  }),
};
