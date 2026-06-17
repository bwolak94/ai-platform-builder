import { serializeI18nDSL, getMissingKeys } from "@ai-builder/serializers";
import type { TranslationStore, TranslationKey } from "@ai-builder/schemas";
import type React from "react";
import { nanoid } from "nanoid";

type Setter = React.Dispatch<React.SetStateAction<TranslationStore>>;
type ToolResult = Record<string, unknown>;

// ─── Inline helpers (avoid importing newly-added serializer functions until packages are rebuilt) ──

interface ValidationIssue {
  key: string;
  lang?: string;
  issue: string;
  severity: "error" | "warning";
}

function runValidation(store: TranslationStore): {
  issues: ValidationIssue[];
  stats: { total: number; complete: number; missingCount: number };
} {
  const issues: ValidationIssue[] = [];
  let complete = 0;

  for (const k of store.keys) {
    if (!k.sourceText) {
      issues.push({ key: k.key, issue: "Source text is empty", severity: "warning" });
    }
    let keyComplete = true;
    for (const lang of store.activeLanguages) {
      if (lang === store.sourceLanguage) continue;
      const val = (k.translations as Record<string, string | null>)[lang];
      if (!val) {
        issues.push({ key: k.key, lang, issue: "Missing translation", severity: "error" });
        keyComplete = false;
      } else if (val === "") {
        issues.push({
          key: k.key,
          lang,
          issue: "Empty string translation (silently hides content)",
          severity: "warning",
        });
        keyComplete = false;
      }
    }
    if (keyComplete) complete++;
  }

  return {
    issues,
    stats: { total: store.keys.length, complete, missingCount: store.keys.length - complete },
  };
}

export function useI18nTools(store: TranslationStore, setStore: Setter) {
  return {
    // ── Query ──────────────────────────────────────────────────────────────────

    queryStore: (): Promise<ToolResult> =>
      Promise.resolve({
        dsl: serializeI18nDSL(store),
        missingKeys: getMissingKeys(store),
      }),

    // ── Keys ───────────────────────────────────────────────────────────────────

    addKey: ({
      key,
      sourceText,
      translations,
      description,
    }: {
      key: string;
      sourceText?: string;
      translations: Record<string, string>;
      description?: string;
    }): Promise<ToolResult> => {
      const resolvedSourceText = sourceText ?? translations[store.sourceLanguage] ?? "";
      const fullTranslations: Record<string, string | null> = Object.fromEntries(
        store.activeLanguages.map((l) => [l, translations[l] ?? null])
      );

      const newKey: TranslationKey = {
        id: "key_" + nanoid(6),
        key,
        sourceText: resolvedSourceText,
        context: description ?? null,
        sourceModule: null,
        translations: fullTranslations,
        isPlural: null,
      };

      setStore((prev) => ({ ...prev, keys: [...prev.keys, newKey] }));
      return Promise.resolve({ success: true, keyId: newKey.id });
    },

    updateTranslation: ({
      key,
      language,
      value,
    }: {
      key: string;
      language: string;
      value: string;
    }): Promise<ToolResult> => {
      setStore((prev) => ({
        ...prev,
        keys: prev.keys.map((k) =>
          k.key === key ? { ...k, translations: { ...k.translations, [language]: value } } : k
        ),
      }));
      return Promise.resolve({ success: true });
    },

    removeKey: ({ key }: { key: string }): Promise<ToolResult> => {
      setStore((prev) => ({
        ...prev,
        keys: prev.keys.filter((k) => k.key !== key),
      }));
      return Promise.resolve({ success: true });
    },

    renameKey: ({ oldKey, newKey }: { oldKey: string; newKey: string }): Promise<ToolResult> => {
      setStore((prev) => ({
        ...prev,
        keys: prev.keys.map((k) => (k.key === oldKey ? { ...k, key: newKey } : k)),
      }));
      return Promise.resolve({ success: true });
    },

    // ── Translations ───────────────────────────────────────────────────────────

    bulkSetTranslations: ({
      key,
      translations,
    }: {
      key: string;
      translations: Record<string, string>;
    }): Promise<ToolResult> => {
      setStore((prev) => ({
        ...prev,
        keys: prev.keys.map((k) =>
          k.key === key ? { ...k, translations: { ...k.translations, ...translations } } : k
        ),
      }));
      return Promise.resolve({ success: true });
    },

    // ── Languages ──────────────────────────────────────────────────────────────

    addLanguage: ({ code }: { code: string; label?: string }): Promise<ToolResult> => {
      setStore((prev) => {
        if (prev.activeLanguages.includes(code)) return prev;
        return {
          ...prev,
          activeLanguages: [...prev.activeLanguages, code],
          keys: prev.keys.map((k) => ({
            ...k,
            translations: { ...k.translations, [code]: null },
          })),
        };
      });
      return Promise.resolve({ success: true });
    },

    removeLanguage: ({ code }: { code: string }): Promise<ToolResult> => {
      setStore((prev) => {
        if (code === prev.sourceLanguage) return prev;
        return {
          ...prev,
          activeLanguages: prev.activeLanguages.filter((l) => l !== code),
          keys: prev.keys.map((k) => {
            const translations = Object.fromEntries(
              Object.entries(k.translations).filter(([l]) => l !== code)
            ) as Record<string, string | null>;
            return { ...k, translations };
          }),
        };
      });
      return Promise.resolve({ success: true });
    },

    // ── Import ─────────────────────────────────────────────────────────────────

    importFromJson: ({
      lang,
      entries,
    }: {
      lang: string;
      entries: Record<string, string>;
    }): Promise<ToolResult> => {
      // entries is guaranteed flat by the tool's Zod schema (Record<string, string>)
      const importedCount = Object.keys(entries).length;

      setStore((prev) => {
        let updated = { ...prev };

        if (!updated.activeLanguages.includes(lang)) {
          updated = {
            ...updated,
            activeLanguages: [...updated.activeLanguages, lang],
            keys: updated.keys.map((k) => ({
              ...k,
              translations: { ...k.translations, [lang]: null },
            })),
          };
        }

        const existingKeySet = new Set(updated.keys.map((k) => k.key));
        const newKeys: TranslationKey[] = [];

        for (const [dotKey, value] of Object.entries(entries)) {
          if (existingKeySet.has(dotKey)) {
            updated = {
              ...updated,
              keys: updated.keys.map((k) =>
                k.key === dotKey ? { ...k, translations: { ...k.translations, [lang]: value } } : k
              ),
            };
          } else {
            const translations: Record<string, string | null> = Object.fromEntries(
              updated.activeLanguages.map((l) => [l, l === lang ? value : null])
            );
            newKeys.push({
              id: "key_" + nanoid(6),
              key: dotKey,
              sourceText: lang === updated.sourceLanguage ? value : "",
              context: null,
              sourceModule: null,
              translations,
              isPlural: null,
            });
          }
        }

        return { ...updated, keys: [...updated.keys, ...newKeys] };
      });

      return Promise.resolve({ success: true, imported: importedCount });
    },

    // ── Validation & Search ────────────────────────────────────────────────────

    validateStore: (): Promise<ToolResult> =>
      Promise.resolve(runValidation(store) as unknown as ToolResult),

    searchKeys: ({
      pattern,
      missingIn,
    }: {
      pattern?: string;
      missingIn?: string;
    }): Promise<ToolResult> => {
      const patternRe = pattern
        ? (() => {
            try {
              return new RegExp(pattern, "i");
            } catch {
              return null;
            }
          })()
        : null;

      const results = store.keys
        .filter((k) => !patternRe || patternRe.test(k.key) || patternRe.test(k.sourceText))
        .filter((k) => !missingIn || !(k.translations as Record<string, string | null>)[missingIn])
        .map((k) => ({
          key: k.key,
          sourceText: k.sourceText,
          missingLanguages: store.activeLanguages.filter(
            (l) =>
              l !== store.sourceLanguage && !(k.translations as Record<string, string | null>)[l]
          ),
        }));

      return Promise.resolve({ keys: results, total: results.length });
    },

    // ── Store lifecycle ────────────────────────────────────────────────────────

    resetStore: (): Promise<ToolResult> => {
      setStore({
        id: "i18n_" + nanoid(6),
        sourceLanguage: "en",
        activeLanguages: ["en"],
        keys: [],
      });
      return Promise.resolve({ success: true });
    },
  };
}

export type I18nTools = ReturnType<typeof useI18nTools>;
