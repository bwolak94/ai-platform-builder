import { describe, it, expect } from "vitest";
import { TranslationKeySchema, TranslationStoreSchema } from "../i18n";

const validKey = {
  id: "key_abc123",
  key: "auth.login.title",
  sourceText: "Sign in",
  context: null,
  sourceModule: null,
  translations: { en: "Sign in", pl: "Zaloguj się", de: null },
  isPlural: null,
};

const validStore = {
  id: "i18n_1",
  sourceLanguage: "en",
  activeLanguages: ["en", "pl", "de"],
  keys: [validKey],
};

describe("TranslationKeySchema", () => {
  it("accepts a valid translation key", () => {
    expect(TranslationKeySchema.safeParse(validKey).success).toBe(true);
  });

  it("rejects a key with uppercase letters", () => {
    const result = TranslationKeySchema.safeParse({ ...validKey, key: "Auth.Login.Title" });
    expect(result.success).toBe(false);
  });

  it("rejects a key starting with a digit", () => {
    const result = TranslationKeySchema.safeParse({ ...validKey, key: "1auth.login" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty key", () => {
    const result = TranslationKeySchema.safeParse({ ...validKey, key: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a key with dot-separated segments", () => {
    const result = TranslationKeySchema.safeParse({
      ...validKey,
      key: "checkout.payment.card.number",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null translations for a language", () => {
    const result = TranslationKeySchema.safeParse({
      ...validKey,
      translations: { en: "Hello", de: null },
    });
    expect(result.success).toBe(true);
  });

  it("accepts isPlural flag", () => {
    const result = TranslationKeySchema.safeParse({ ...validKey, isPlural: true });
    expect(result.success).toBe(true);
  });
});

describe("TranslationStoreSchema", () => {
  it("accepts a valid store", () => {
    expect(TranslationStoreSchema.safeParse(validStore).success).toBe(true);
  });

  it("rejects an empty activeLanguages array", () => {
    const result = TranslationStoreSchema.safeParse({ ...validStore, activeLanguages: [] });
    expect(result.success).toBe(false);
  });

  it("accepts a store with no keys", () => {
    const result = TranslationStoreSchema.safeParse({ ...validStore, keys: [] });
    expect(result.success).toBe(true);
  });

  it("accepts BCP-47 language codes", () => {
    const result = TranslationStoreSchema.safeParse({
      ...validStore,
      sourceLanguage: "zh-CN",
      activeLanguages: ["zh-CN", "zh-TW"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid language code format", () => {
    const result = TranslationStoreSchema.safeParse({
      ...validStore,
      sourceLanguage: "English",
    });
    expect(result.success).toBe(false);
  });
});
