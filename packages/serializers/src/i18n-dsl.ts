// DSL format:
// LANG: en (source) | active: pl, de, fr
//
// form.contact.name.label
//   en: "Your name"
//   pl: "Imię i nazwisko"
//   de: "Ihr Name"        ← MISSING

import { nanoid } from "nanoid";
import type { TranslationStore, TranslationKey, SupportedLanguage } from "@ai-builder/schemas";

// ─── Serialize ────────────────────────────────────────────────────────────────

export function serializeI18nDSL(store: TranslationStore): string {
  const langLine =
    "LANG: " + store.sourceLanguage + " (source) | active: " + store.activeLanguages.join(", ");

  const keyLines = store.keys.map((key) => {
    const langs = [
      store.sourceLanguage,
      ...store.activeLanguages.filter((l) => l !== store.sourceLanguage),
    ];
    const translations = langs.map((lang) => {
      const val = key.translations[lang];
      const missing = val === null || val === undefined ? "  ← MISSING" : "";
      return "  " + lang + ': "' + (val ?? "") + '"' + missing;
    });
    return key.key + "\n" + translations.join("\n");
  });

  return [langLine, "", ...keyLines].join("\n");
}

// ─── Deserialize ─────────────────────────────────────────────────────────────

export function deserializeI18nDSL(dsl: string): TranslationStore {
  const lines = dsl.split("\n");
  const firstLine = lines[0] ?? "";

  const sourceMatch = /LANG:\s*(\w+)/.exec(firstLine);
  const activeMatch = /active:\s*(.+)/.exec(firstLine);
  const sourceLanguage = (sourceMatch?.[1] ?? "en") as SupportedLanguage;
  const activeLanguages = (activeMatch?.[1] ?? "")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean) as SupportedLanguage[];

  const allLangs = [sourceLanguage, ...activeLanguages.filter((l) => l !== sourceLanguage)];
  const keys: TranslationKey[] = [];
  let currentKey: TranslationKey | null = null;

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    // Key line: not indented
    if (!line.startsWith(" ") && !line.startsWith("\t")) {
      if (currentKey) keys.push(currentKey);
      const keyName = line.trim().split(/\s/)[0] ?? "";
      const translations = Object.fromEntries(allLangs.map((l) => [l, null])) as Record<
        SupportedLanguage,
        string | null
      >;
      currentKey = {
        id: "key_" + nanoid(6),
        key: keyName,
        sourceText: "",
        context: null,
        sourceModule: null,
        translations,
        isPlural: null,
      };
      continue;
    }

    // Translation line: indented
    if (currentKey) {
      const translationMatch = /^\s+(\w{2}):\s*"([^"]*)"/.exec(line);
      if (translationMatch) {
        const lang = translationMatch[1] as SupportedLanguage;
        const val = translationMatch[2] ?? "";
        currentKey.translations[lang] = val;
        if (lang === sourceLanguage && val) currentKey.sourceText = val;
      }
    }
  }
  if (currentKey) keys.push(currentKey);

  return {
    id: "i18n_" + nanoid(6),
    sourceLanguage,
    activeLanguages: allLangs,
    keys,
  };
}

// ─── Export helpers ───────────────────────────────────────────────────────────

export function exportLanguageJson(
  store: TranslationStore,
  lang: SupportedLanguage
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of store.keys) {
    result[key.key] = key.translations[lang] ?? key.sourceText;
  }
  return result;
}

export function getMissingKeys(
  store: TranslationStore
): { key: string; missingLanguages: SupportedLanguage[] }[] {
  return store.keys
    .map((k) => {
      const missing = store.activeLanguages.filter(
        (l) => l !== store.sourceLanguage && !k.translations[l]
      );
      return { key: k.key, missingLanguages: missing };
    })
    .filter((k) => k.missingLanguages.length > 0);
}
