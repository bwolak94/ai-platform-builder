import { serializeI18nDSL, getMissingKeys } from "@ai-builder/serializers";
import { TranslationKeySchema } from "@ai-builder/schemas";
import type { TranslationStore, TranslationKey, SupportedLanguage } from "@ai-builder/schemas";
import type React from "react";
import { nanoid } from "nanoid";

type Setter = React.Dispatch<React.SetStateAction<TranslationStore>>;
type ToolResult = Record<string, unknown>;

interface SimpleResult {
  success: true;
}

export function useI18nTools(store: TranslationStore, setStore: Setter) {
  return {
    addKey: ({ key }: { key: unknown }): Promise<ToolResult> => {
      const parsed = TranslationKeySchema.safeParse(key);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setStore((prev) => ({
        ...prev,
        keys: [...prev.keys, parsed.data],
      }));
      return Promise.resolve({ success: true, keyId: parsed.data.id });
    },

    updateTranslation: ({
      keyId,
      language,
      value,
    }: {
      keyId: string;
      language: SupportedLanguage;
      value: string;
    }): Promise<SimpleResult> => {
      setStore((prev) => ({
        ...prev,
        keys: prev.keys.map((k) =>
          k.id === keyId ? { ...k, translations: { ...k.translations, [language]: value } } : k
        ),
      }));
      return Promise.resolve({ success: true });
    },

    removeKey: ({ keyId }: { keyId: string }): Promise<SimpleResult> => {
      setStore((prev) => ({
        ...prev,
        keys: prev.keys.filter((k) => k.id !== keyId),
      }));
      return Promise.resolve({ success: true });
    },

    addLanguage: ({ language }: { language: SupportedLanguage }): Promise<SimpleResult> => {
      setStore((prev) => {
        if (prev.activeLanguages.includes(language)) return prev;
        return {
          ...prev,
          activeLanguages: [...prev.activeLanguages, language],
          keys: prev.keys.map((k) => ({
            ...k,
            translations: { ...k.translations, [language]: null },
          })),
        };
      });
      return Promise.resolve({ success: true });
    },

    removeLanguage: ({ language }: { language: SupportedLanguage }): Promise<SimpleResult> => {
      setStore((prev) => {
        if (language === prev.sourceLanguage) return prev;
        return {
          ...prev,
          activeLanguages: prev.activeLanguages.filter((l) => l !== language),
          keys: prev.keys.map((k) => {
            const translations = Object.fromEntries(
              Object.entries(k.translations).filter(([l]) => l !== language)
            ) as TranslationKey["translations"];
            return { ...k, translations };
          }),
        };
      });
      return Promise.resolve({ success: true });
    },

    bulkSetTranslations: ({
      keyId,
      translations,
    }: {
      keyId: string;
      translations: Record<string, string>;
    }): Promise<SimpleResult> => {
      setStore((prev) => ({
        ...prev,
        keys: prev.keys.map((k) =>
          k.id === keyId
            ? {
                ...k,
                translations: {
                  ...k.translations,
                  ...(translations as Record<SupportedLanguage, string>),
                },
              }
            : k
        ),
      }));
      return Promise.resolve({ success: true });
    },

    resetStore: (): Promise<SimpleResult> => {
      setStore({
        id: "i18n_" + nanoid(6),
        sourceLanguage: "en",
        activeLanguages: ["en"],
        keys: [],
      });
      return Promise.resolve({ success: true });
    },

    queryStore: (): Promise<{ dsl: string; missingKeys: ReturnType<typeof getMissingKeys> }> => {
      return Promise.resolve({
        dsl: serializeI18nDSL(store),
        missingKeys: getMissingKeys(store),
      });
    },
  };
}

export type I18nTools = ReturnType<typeof useI18nTools>;
