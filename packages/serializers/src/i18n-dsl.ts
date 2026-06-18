// DSL format:
// LANG: en (source) | active: pl, de, fr
//
// auth.login.title [plural] [module:auth]
//   # Context: Login page title shown above the sign-in form
//   en: "Sign in"
//   pl: "Zaloguj się"
//   de: ← MISSING

import { nanoid } from "nanoid";
import type { TranslationStore, TranslationKey, SupportedLanguage } from "@ai-builder/schemas";

// ─── String helpers ───────────────────────────────────────────────────────────

function escapeValue(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function unescapeValue(s: string): string {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function checkBraceBalance(s: string): string | null {
  let depth = 0;
  for (const c of s) {
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth < 0) return "Unmatched closing brace";
    }
  }
  return depth !== 0 ? "Unmatched opening brace" : null;
}

// ─── Serialize ────────────────────────────────────────────────────────────────

export function serializeI18nDSL(store: TranslationStore): string {
  const langLine =
    "LANG: " + store.sourceLanguage + " (source) | active: " + store.activeLanguages.join(", ");

  const keyLines = store.keys.map((key) => {
    const langs = [
      store.sourceLanguage,
      ...store.activeLanguages.filter((l) => l !== store.sourceLanguage),
    ];

    const markers: string[] = [];
    if (key.isPlural) markers.push("[plural]");
    if (key.sourceModule) markers.push(`[module:${key.sourceModule}]`);
    const keyHeader = markers.length ? `${key.key} ${markers.join(" ")}` : key.key;

    const metaLines: string[] = [];
    if (key.context) metaLines.push(`  # Context: ${key.context}`);

    const translationLines = langs.map((lang) => {
      const val = key.translations[lang];
      if (val == null) return `  ${lang}: ← MISSING`;
      return `  ${lang}: "${escapeValue(val)}"`;
    });

    return [keyHeader, ...metaLines, ...translationLines].join("\n");
  });

  return [langLine, "", ...keyLines].join("\n");
}

// ─── Deserialize ─────────────────────────────────────────────────────────────

export function deserializeI18nDSL(dsl: string): TranslationStore {
  const lines = dsl.split("\n");
  const firstLine = lines[0] ?? "";

  const sourceMatch = /LANG:\s*(\S+)/.exec(firstLine);
  const activeMatch = /active:\s*(.+)/.exec(firstLine);
  const sourceLanguage = sourceMatch?.[1] ?? "en";
  const activeLanguages = (activeMatch?.[1] ?? "")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  const allLangs = [sourceLanguage, ...activeLanguages.filter((l) => l !== sourceLanguage)];
  const keys: TranslationKey[] = [];

  // Use a mutable local type during parsing before casting to TranslationKey
  interface ParsedKey {
    id: string;
    key: string;
    sourceText: string;
    context: string | null;
    sourceModule: string | null;
    translations: Record<string, string | null>;
    isPlural: boolean | null;
  }

  let currentKey: ParsedKey | null = null;

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    // Context / metadata lines (indented lines starting with #)
    if (currentKey && /^\s+#\s/.test(line)) {
      const contextText = line.replace(/^\s+#\s*(?:Context:\s*)?/, "").trim();
      currentKey.context = currentKey.context
        ? `${currentKey.context}\n${contextText}`
        : contextText;
      continue;
    }

    // Translation lines (indented, lang-code prefix)
    if ((line.startsWith("  ") || line.startsWith("\t")) && currentKey) {
      // Missing marker
      if (/^\s+[a-z]{2,3}(?:-[A-Z]{2})?:\s*←\s*MISSING/.test(line)) {
        // value stays null — already initialised
        continue;
      }

      // Quoted value: handles escaped quotes inside the string
      const quotedMatch = /^\s+([a-z]{2,3}(?:-[A-Z]{2})?):\s*"((?:[^"\\]|\\.)*)"/.exec(line);
      if (quotedMatch) {
        const lang = quotedMatch[1];
        if (!lang) continue;
        const val = unescapeValue(quotedMatch[2] ?? "");
        currentKey.translations[lang] = val;
        if (lang === sourceLanguage && val) currentKey.sourceText = val;
      }
      continue;
    }

    // Key line (not indented)
    if (!line.startsWith(" ") && !line.startsWith("\t")) {
      if (currentKey) keys.push(currentKey);

      const keyLine = line.trim();
      const keyName = keyLine.split(/\s/)[0] ?? "";
      const isPlural = keyLine.includes("[plural]");
      const moduleMatch = /\[module:([^\]]+)\]/.exec(keyLine);
      const sourceModule = moduleMatch?.[1] ?? null;

      currentKey = {
        id: "key_" + nanoid(6),
        key: keyName,
        sourceText: "",
        context: null,
        sourceModule,
        translations: Object.fromEntries(allLangs.map((l) => [l, null])),
        isPlural: isPlural ? true : null,
      };
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

// ─── JSON helpers ─────────────────────────────────────────────────────────────

/** Flatten nested object to dot-notation keys: {a: {b: "v"}} → {"a.b": "v"} */
export function flattenJson(obj: unknown, prefix = ""): Record<string, string> {
  if (typeof obj !== "object" || obj === null) return {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const dotKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      result[dotKey] = v;
    } else if (typeof v === "object" && v !== null) {
      Object.assign(result, flattenJson(v, dotKey));
    }
  }
  return result;
}

/** Nest dot-notation keys into an object: {"a.b": "v"} → {a: {b: "v"}} */
export function nestRecord(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [dotKey, value] of Object.entries(flat)) {
    const parts = dotKey.split(".");
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (part === undefined) continue;
      if (typeof current[part] !== "object" || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    const lastPart = parts[parts.length - 1];
    if (lastPart !== undefined) current[lastPart] = value;
  }
  return result;
}

// ─── Export ───────────────────────────────────────────────────────────────────

/** Export flat dot-notation JSON for a language (classic flat format). */
export function exportLanguageJson(store: TranslationStore, lang: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of store.keys) {
    const val = key.translations[lang];
    if (val) result[key.key] = val;
  }
  return result;
}

/** Export nested JSON for a language — compatible with react-i18next, vue-i18n, etc. */
export function exportLanguageJsonNested(
  store: TranslationStore,
  lang: string
): Record<string, unknown> {
  return nestRecord(exportLanguageJson(store, lang));
}

// ─── Missing keys ─────────────────────────────────────────────────────────────

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

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationIssue {
  key: string;
  lang?: string;
  issue: string;
  severity: "error" | "warning";
}

export interface ValidationReport {
  issues: ValidationIssue[];
  stats: {
    total: number;
    complete: number;
    missingCount: number;
    duplicateKeys: string[];
  };
}

export function validateI18nStore(store: TranslationStore): ValidationReport {
  const issues: ValidationIssue[] = [];
  const seenKeys = new Map<string, number>();
  let complete = 0;

  for (const k of store.keys) {
    seenKeys.set(k.key, (seenKeys.get(k.key) ?? 0) + 1);

    if (!k.sourceText) {
      issues.push({ key: k.key, issue: "Source text is empty", severity: "warning" });
    }

    let keyComplete = true;

    for (const lang of store.activeLanguages) {
      const val = k.translations[lang];

      if (val == null) {
        if (lang !== store.sourceLanguage) {
          issues.push({ key: k.key, lang, issue: "Missing translation", severity: "error" });
          keyComplete = false;
        }
        continue;
      }

      if (val === "") {
        issues.push({
          key: k.key,
          lang,
          issue: "Empty string translation (silently hides content)",
          severity: "warning",
        });
        keyComplete = false;
        continue;
      }

      const icuError = checkBraceBalance(val);
      if (icuError) {
        issues.push({
          key: k.key,
          lang,
          issue: `ICU format error: ${icuError}`,
          severity: "error",
        });
        keyComplete = false;
      }
    }

    if (keyComplete) complete++;
  }

  const duplicateKeys = [...seenKeys.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key);

  for (const key of duplicateKeys) {
    issues.push({ key, issue: "Duplicate key name", severity: "error" });
  }

  return {
    issues,
    stats: {
      total: store.keys.length,
      complete,
      missingCount: store.keys.length - complete,
      duplicateKeys,
    },
  };
}
