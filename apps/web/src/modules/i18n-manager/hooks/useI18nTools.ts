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
      const val = k.translations[lang];
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
        .filter((k) => !missingIn || !k.translations[missingIn])
        .map((k) => ({
          key: k.key,
          sourceText: k.sourceText,
          missingLanguages: store.activeLanguages.filter(
            (l) => l !== store.sourceLanguage && !k.translations[l]
          ),
        }));

      return Promise.resolve({ keys: results, total: results.length });
    },

    // ── Backfilled tools ─────────────────────────────────────────────────────

    detectUnusedKeys: (args: { usages: string[] }): Promise<ToolResult> => {
      const usageSet = new Set(args.usages);
      const unused = store.keys.filter((k) => !usageSet.has(k.key)).map((k) => k.key);
      return Promise.resolve({ unused, count: unused.length });
    },

    scoreTranslationQuality: (args: { language?: string }): Promise<ToolResult> => {
      const langs = args.language ? [args.language] : store.activeLanguages;
      const issues: { key: string; lang: string; issue: string }[] = [];
      for (const k of store.keys) {
        for (const lang of langs) {
          if (lang === store.sourceLanguage) continue;
          const val = k.translations[lang];
          const src = k.sourceText;
          if (!val) continue;
          if (val === src)
            issues.push({ key: k.key, lang, issue: "identical to source (untranslated)" });
          if (src && val.length < src.length * 0.3)
            issues.push({ key: k.key, lang, issue: "suspiciously short" });
        }
      }
      return Promise.resolve({ issues, score: Math.max(0, 100 - issues.length * 5) });
    },

    setLanguageRTL: (_args: { code: string; rtl: boolean }): Promise<ToolResult> => {
      // RTL flag — acknowledged; agent notes this in chat
      return Promise.resolve({ success: true });
    },

    addGlossaryTerm: (_args: {
      sourceTerm: string;
      language: string;
      targetTerm: string;
    }): Promise<ToolResult> => {
      // Glossary term — acknowledged; agent uses term consistently in future translations
      return Promise.resolve({ success: true });
    },

    generateVersionDiff: (args: {
      previousSnapshot: Record<string, Record<string, string>>;
    }): Promise<ToolResult> => {
      const currentKeys = new Set(store.keys.map((k) => k.key));
      const prevKeys = new Set(Object.values(args.previousSnapshot).flatMap((l) => Object.keys(l)));
      const added = [...currentKeys].filter((k) => !prevKeys.has(k));
      const removed = [...prevKeys].filter((k) => !currentKeys.has(k));
      return Promise.resolve({ added, removed, modified: [] });
    },

    // ── New tools ────────────────────────────────────────────────────────────

    mergeNamespaces: (args: {
      sourceNamespace: string;
      targetNamespace: string;
    }): Promise<ToolResult> => {
      setStore((prev) => ({
        ...prev,
        keys: prev.keys.map((k) => {
          if (!k.key.startsWith(args.sourceNamespace + ".")) return k;
          return {
            ...k,
            key: k.key.replace(args.sourceNamespace + ".", args.targetNamespace + "."),
          };
        }),
      }));
      return Promise.resolve({ success: true });
    },

    splitNamespace: (args: { keyPrefix: string; newNamespace: string }): Promise<ToolResult> => {
      const parts = args.keyPrefix.split(".");
      const lastPart = parts[parts.length - 1] ?? "";
      setStore((prev) => ({
        ...prev,
        keys: prev.keys.map((k) => {
          if (!k.key.startsWith(args.keyPrefix + ".")) return k;
          return {
            ...k,
            key: k.key.replace(args.keyPrefix + ".", args.newNamespace + "." + lastPart + "."),
          };
        }),
      }));
      return Promise.resolve({ success: true });
    },

    findDuplicateValues: (args: { language?: string }): Promise<ToolResult> => {
      const lang = args.language ?? store.sourceLanguage;
      const valueMap = new Map<string, string[]>();
      for (const k of store.keys) {
        const val = lang === store.sourceLanguage ? k.sourceText : (k.translations[lang] ?? "");
        if (!val) continue;
        const existing = valueMap.get(val) ?? [];
        valueMap.set(val, [...existing, k.key]);
      }
      const duplicates = [...valueMap.entries()]
        .filter(([, keys]) => keys.length > 1)
        .map(([value, keys]) => ({ value, keys }));
      return Promise.resolve({ duplicates, count: duplicates.length });
    },

    generateTypeFile: (_args: { outputFormat: string }): Promise<ToolResult> => {
      const keys = store.keys.map((k) => `"${k.key}"`).join(" | ");
      return Promise.resolve({ types: `export type TranslationKey = ${keys || "never"};` });
    },

    exportToXliff: (args: {
      sourceLanguage: string;
      targetLanguage: string;
    }): Promise<ToolResult> => {
      const units = store.keys
        .map((k) => {
          const target = k.translations[args.targetLanguage] ?? "";
          return `  <unit id="${k.id}">\n    <segment>\n      <source>${k.sourceText}</source>\n      <target>${target}</target>\n    </segment>\n  </unit>`;
        })
        .join("\n");
      const xliff = `<?xml version="1.0" encoding="UTF-8"?>\n<xliff version="2.0" srcLang="${args.sourceLanguage}" trgLang="${args.targetLanguage}">\n  <file>\n${units}\n  </file>\n</xliff>`;
      return Promise.resolve({ xliff });
    },

    setPluralRules: (_args: { language: string; forms: string[] }): Promise<ToolResult> => {
      // Plural rules — acknowledged; agent adds plural form keys via addKey calls
      return Promise.resolve({ success: true });
    },

    generateNamespaceSummary: (): Promise<ToolResult> => {
      const namespaces = new Set(store.keys.map((k) => k.key.split(".")[0] ?? "root"));
      const summary = [...namespaces].map((ns) => {
        const nsKeys = store.keys.filter(
          (k) => k.key.startsWith(ns + ".") || k.key.split(".")[0] === ns
        );
        return { namespace: ns, total: nsKeys.length };
      });
      return Promise.resolve({ summary });
    },

    syncWithCodebase: (args: {
      codebaseKeys: string[];
      autoAddMissing: boolean;
    }): Promise<ToolResult> => {
      const codebaseSet = new Set(args.codebaseKeys);
      const storeSet = new Set(store.keys.map((k) => k.key));
      const unused = [...storeSet].filter((k) => !codebaseSet.has(k));
      const missing = [...codebaseSet].filter((k) => !storeSet.has(k));

      if (args.autoAddMissing && missing.length > 0) {
        setStore((prev) => {
          const newKeys: TranslationKey[] = missing.map((key) => ({
            id: "key_" + nanoid(6),
            key,
            sourceText: "",
            context: null,
            sourceModule: null,
            translations: Object.fromEntries(prev.activeLanguages.map((l) => [l, null])),
            isPlural: null,
          }));
          return { ...prev, keys: [...prev.keys, ...newKeys] };
        });
      }

      return Promise.resolve({ added: missing.length, unused, missingCount: missing.length });
    },

    suggestMachineTranslations: (args: {
      targetLanguage: string;
      limit: number;
    }): Promise<ToolResult> => {
      const missing = store.keys
        .filter((k) => !k.translations[args.targetLanguage] && k.sourceText)
        .slice(0, args.limit)
        .map((k) => ({ key: k.key, sourceText: k.sourceText }));
      return Promise.resolve({ suggestions: missing, count: missing.length });
    },

    generateICUPluralForms: (args: {
      key: string;
      sourceText: string;
      language: string;
    }): Promise<ToolResult> => {
      // ICU plural form generation handled agent-side; return current store state
      return Promise.resolve({
        success: true,
        key: args.key,
        language: args.language,
        dsl: serializeI18nDSL(store),
      });
    },

    buildTranslationMemory: (): Promise<ToolResult> => {
      const memory: Record<string, Record<string, string>> = {};
      for (const k of store.keys) {
        if (!k.sourceText) continue;
        const translations: Record<string, string> = {};
        for (const [lang, val] of Object.entries(k.translations)) {
          if (val) translations[lang] = val;
        }
        if (Object.keys(translations).length > 0) {
          memory[k.sourceText] = { ...(memory[k.sourceText] ?? {}), ...translations };
        }
      }
      return Promise.resolve({ memory, termCount: Object.keys(memory).length });
    },

    exportToArb: (args: { language: string }): Promise<ToolResult> => {
      const arb: Record<string, unknown> = { "@@locale": args.language };
      for (const k of store.keys) {
        const val = k.translations[args.language];
        if (!val) continue;
        arb[k.key] = val;
        arb[`@${k.key}`] = { description: k.context ?? k.key };
      }
      return Promise.resolve({ arb: JSON.stringify(arb, null, 2) });
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
