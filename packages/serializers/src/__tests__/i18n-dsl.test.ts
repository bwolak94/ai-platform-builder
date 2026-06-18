import { describe, it, expect } from "vitest";
import {
  serializeI18nDSL,
  deserializeI18nDSL,
  flattenJson,
  nestRecord,
  exportLanguageJson,
  getMissingKeys,
} from "../i18n-dsl";
import type { TranslationStore } from "@ai-builder/schemas";

const baseStore: TranslationStore = {
  id: "i18n_1",
  sourceLanguage: "en",
  activeLanguages: ["en", "pl", "de"],
  keys: [
    {
      id: "key_001",
      key: "auth.login.title",
      sourceText: "Sign in",
      context: "Login page heading",
      sourceModule: null,
      translations: { en: "Sign in", pl: "Zaloguj się", de: null },
      isPlural: null,
    },
    {
      id: "key_002",
      key: "auth.login.submit",
      sourceText: "Submit",
      context: null,
      sourceModule: null,
      translations: { en: "Submit", pl: "Wyślij", de: "Absenden" },
      isPlural: null,
    },
    {
      id: "key_003",
      key: "common.error.required",
      sourceText: "This field is required",
      context: null,
      sourceModule: null,
      translations: { en: "This field is required", pl: null, de: null },
      isPlural: null,
    },
  ],
};

describe("serializeI18nDSL", () => {
  it("includes the source language in the header", () => {
    const dsl = serializeI18nDSL(baseStore);
    expect(dsl).toContain("en");
  });

  it("includes all active languages", () => {
    const dsl = serializeI18nDSL(baseStore);
    expect(dsl).toContain("pl");
    expect(dsl).toContain("de");
  });

  it("includes key names", () => {
    const dsl = serializeI18nDSL(baseStore);
    expect(dsl).toContain("auth.login.title");
    expect(dsl).toContain("auth.login.submit");
  });

  it("marks missing translations", () => {
    const dsl = serializeI18nDSL(baseStore);
    expect(dsl).toContain("MISSING");
  });

  it("includes translation values for complete keys", () => {
    const dsl = serializeI18nDSL(baseStore);
    expect(dsl).toContain("Sign in");
    expect(dsl).toContain("Zaloguj się");
  });
});

describe("deserializeI18nDSL", () => {
  it("round-trips the source language", () => {
    const dsl = serializeI18nDSL(baseStore);
    const restored = deserializeI18nDSL(dsl);
    expect(restored.sourceLanguage).toBe("en");
  });

  it("round-trips key count", () => {
    const dsl = serializeI18nDSL(baseStore);
    const restored = deserializeI18nDSL(dsl);
    expect(restored.keys).toHaveLength(3);
  });

  it("round-trips key names", () => {
    const dsl = serializeI18nDSL(baseStore);
    const restored = deserializeI18nDSL(dsl);
    const keys = restored.keys.map((k) => k.key);
    expect(keys).toContain("auth.login.title");
    expect(keys).toContain("common.error.required");
  });

  it("round-trips complete translation values", () => {
    const dsl = serializeI18nDSL(baseStore);
    const restored = deserializeI18nDSL(dsl);
    const submit = restored.keys.find((k) => k.key === "auth.login.submit");
    expect(submit?.translations.en).toBe("Submit");
    expect(submit?.translations.pl).toBe("Wyślij");
  });
});

describe("flattenJson", () => {
  it("flattens a nested object into dot-notation keys", () => {
    const result = flattenJson({ auth: { login: { title: "Sign in" } } });
    expect(result).toEqual({ "auth.login.title": "Sign in" });
  });

  it("handles already-flat objects", () => {
    const result = flattenJson({ name: "John", age: "30" });
    expect(result).toEqual({ name: "John", age: "30" });
  });

  it("handles deeply nested objects", () => {
    const result = flattenJson({ a: { b: { c: { d: "deep" } } } });
    expect(result["a.b.c.d"]).toBe("deep");
  });
});

describe("nestRecord", () => {
  it("converts dot-notation keys back to nested object", () => {
    const result = nestRecord({ "auth.login.title": "Sign in" });
    expect(result.auth).toBeDefined();
  });

  it("groups keys with the same prefix", () => {
    const result = nestRecord({
      "auth.login.title": "Sign in",
      "auth.login.submit": "Submit",
    }) as Record<string, Record<string, Record<string, string>>>;
    expect(result.auth?.login?.title).toBe("Sign in");
    expect(result.auth?.login?.submit).toBe("Submit");
  });
});

describe("exportLanguageJson", () => {
  it("exports all defined translations for a language", () => {
    const json = exportLanguageJson(baseStore, "en");
    expect(json["auth.login.title"]).toBe("Sign in");
    expect(json["auth.login.submit"]).toBe("Submit");
  });

  it("excludes null translations", () => {
    const json = exportLanguageJson(baseStore, "de");
    expect(json["auth.login.title"]).toBeUndefined();
    expect(json["auth.login.submit"]).toBe("Absenden");
  });
});

describe("getMissingKeys", () => {
  it("returns keys that are missing translations for non-source languages", () => {
    const missing = getMissingKeys(baseStore);
    expect(missing.length).toBeGreaterThan(0);
  });

  it("includes auth.login.title as missing for de", () => {
    const missing = getMissingKeys(baseStore);
    const missingForDe = missing.filter((m) => m.language === "de");
    const keys = missingForDe.map((m) => m.key);
    expect(keys).toContain("auth.login.title");
  });

  it("does not report complete translations as missing", () => {
    const missing = getMissingKeys(baseStore);
    const isMissingEnSubmit = missing.some(
      (m) => m.key === "auth.login.submit" && m.language === "en"
    );
    expect(isMissingEnSubmit).toBe(false);
  });
});
