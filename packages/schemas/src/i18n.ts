import { z } from "zod";

// Accepts any valid BCP 47 / ISO 639-1 language code: "en", "de", "zh-CN", "pt-BR", etc.
export const LanguageCodeSchema = z
  .string()
  .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Must be a valid language code (e.g. 'en', 'de', 'zh-CN')");

// Backward-compat alias — now accepts any valid language code, not just a fixed enum
export const SupportedLanguageSchema = LanguageCodeSchema;

export const COMMON_LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "pl", label: "Polish" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "cs", label: "Czech" },
  { code: "sk", label: "Slovak" },
  { code: "ja", label: "Japanese" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
  { code: "tr", label: "Turkish" },
  { code: "sv", label: "Swedish" },
  { code: "da", label: "Danish" },
  { code: "fi", label: "Finnish" },
];

export const TranslationKeySchema = z.object({
  id: z.string(),
  key: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9._-]*$/, "Must be dot-separated lowercase key (e.g. form.name.label)"),
  sourceText: z.string(),
  context: z.string().nullable(),
  sourceModule: z.string().nullable(),
  translations: z.record(z.string(), z.string().nullable()),
  isPlural: z.boolean().nullable(),
});

export const TranslationStoreSchema = z.object({
  id: z.string(),
  sourceLanguage: LanguageCodeSchema,
  activeLanguages: z.array(LanguageCodeSchema).min(1),
  keys: z.array(TranslationKeySchema),
});

// SupportedLanguage is now an open string type — any valid BCP 47 code is accepted
export type SupportedLanguage = string;
export type TranslationKey = z.infer<typeof TranslationKeySchema>;
export type TranslationStore = z.infer<typeof TranslationStoreSchema>;
