import { z } from "zod";

export const SupportedLanguageSchema = z.enum([
  "en",
  "pl",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "nl",
  "cs",
  "sk",
]);

export const TranslationKeySchema = z.object({
  id: z.string(),
  key: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9._-]*$/, "Must be dot-separated lowercase key (e.g. form.name.label)"),
  sourceText: z.string().min(1),
  context: z.string().nullable(),
  sourceModule: z.string().nullable(),
  translations: z.record(SupportedLanguageSchema, z.string().nullable()),
  isPlural: z.boolean().nullable(),
});

export const TranslationStoreSchema = z.object({
  id: z.string(),
  sourceLanguage: SupportedLanguageSchema,
  activeLanguages: z.array(SupportedLanguageSchema).min(1),
  keys: z.array(TranslationKeySchema),
});

export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;
export type TranslationKey = z.infer<typeof TranslationKeySchema>;
export type TranslationStore = z.infer<typeof TranslationStoreSchema>;
