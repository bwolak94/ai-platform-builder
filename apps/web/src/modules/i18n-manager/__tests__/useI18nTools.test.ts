import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useI18nState } from "../hooks/useI18nState";
import { useI18nTools } from "../hooks/useI18nTools";

// ─── localStorage stub ─────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      store = Object.fromEntries(Object.entries(store).filter(([k]) => k !== key));
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
});

// ─── Subject hook ─────────────────────────────────────────────────────────────

function useSubject() {
  const state = useI18nState();
  const tools = useI18nTools(state.store, state.setStore);
  return { ...state, tools };
}

// ─── queryStore ───────────────────────────────────────────────────────────────

describe("queryStore", () => {
  it("returns dsl and missingKeys", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.queryStore();
    expect(typeof response.dsl).toBe("string");
    expect(Array.isArray(response.missingKeys)).toBe(true);
  });

  it("dsl contains source language", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.queryStore();
    expect(response.dsl).toContain("en");
  });
});

// ─── addKey ───────────────────────────────────────────────────────────────────

describe("addKey", () => {
  it("adds a new translation key", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({
        key: "auth.login.title",
        sourceText: "Sign in",
        translations: { en: "Sign in", pl: "Zaloguj się" },
      });
    });
    expect(result.current.store.keys).toHaveLength(1);
    expect(result.current.store.keys[0]?.key).toBe("auth.login.title");
  });

  it("returns success with keyId", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Record<string, unknown> | undefined;
    await act(async () => {
      response = await result.current.tools.addKey({
        key: "common.submit",
        translations: { en: "Submit" },
      });
    });
    expect(response).toMatchObject({ success: true, keyId: expect.stringMatching(/^key_/) });
  });

  it("initializes missing languages to null", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({
        key: "common.cancel",
        translations: { en: "Cancel" },
      });
    });
    const key = result.current.store.keys[0];
    expect(key?.translations.pl).toBeNull();
  });

  it("uses sourceText from translations[sourceLanguage] when sourceText is omitted", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({
        key: "nav.home",
        translations: { en: "Home" },
      });
    });
    expect(result.current.store.keys[0]?.sourceText).toBe("Home");
  });
});

// ─── updateTranslation ────────────────────────────────────────────────────────

describe("updateTranslation", () => {
  it("updates a specific language translation", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({
        key: "auth.login.title",
        translations: { en: "Sign in" },
      });
      await result.current.tools.updateTranslation({
        key: "auth.login.title",
        language: "pl",
        value: "Zaloguj się",
      });
    });
    const key = result.current.store.keys.find((k) => k.key === "auth.login.title");
    expect(key?.translations.pl).toBe("Zaloguj się");
  });

  it("does not modify other keys", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "key.a", translations: { en: "A" } });
      await result.current.tools.addKey({ key: "key.b", translations: { en: "B" } });
      await result.current.tools.updateTranslation({ key: "key.a", language: "en", value: "AA" });
    });
    const keyB = result.current.store.keys.find((k) => k.key === "key.b");
    expect(keyB?.translations.en).toBe("B");
  });
});

// ─── removeKey ────────────────────────────────────────────────────────────────

describe("removeKey", () => {
  it("removes a key by dot notation", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({
        key: "auth.login.title",
        translations: { en: "Sign in" },
      });
      await result.current.tools.removeKey({ key: "auth.login.title" });
    });
    expect(result.current.store.keys).toHaveLength(0);
  });

  it("does not remove other keys", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "key.a", translations: { en: "A" } });
      await result.current.tools.addKey({ key: "key.b", translations: { en: "B" } });
      await result.current.tools.removeKey({ key: "key.a" });
    });
    expect(result.current.store.keys).toHaveLength(1);
    expect(result.current.store.keys[0]?.key).toBe("key.b");
  });
});

// ─── renameKey ────────────────────────────────────────────────────────────────

describe("renameKey", () => {
  it("renames a key", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "old.key", translations: { en: "Value" } });
      await result.current.tools.renameKey({ oldKey: "old.key", newKey: "new.key" });
    });
    const keys = result.current.store.keys.map((k) => k.key);
    expect(keys).toContain("new.key");
    expect(keys).not.toContain("old.key");
  });

  it("preserves translations after rename", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({
        key: "old.key",
        translations: { en: "Value", pl: "Wartość" },
      });
      await result.current.tools.renameKey({ oldKey: "old.key", newKey: "new.key" });
    });
    const key = result.current.store.keys.find((k) => k.key === "new.key");
    expect(key?.translations.en).toBe("Value");
    expect(key?.translations.pl).toBe("Wartość");
  });
});

// ─── bulkSetTranslations ──────────────────────────────────────────────────────

describe("bulkSetTranslations", () => {
  it("sets translations for multiple languages at once", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "cta.submit", translations: { en: "Submit" } });
      await result.current.tools.bulkSetTranslations({
        key: "cta.submit",
        translations: { pl: "Wyślij", de: "Absenden" },
      });
    });
    const key = result.current.store.keys.find((k) => k.key === "cta.submit");
    expect(key?.translations.pl).toBe("Wyślij");
    expect(key?.translations.de).toBe("Absenden");
  });
});

// ─── addLanguage ──────────────────────────────────────────────────────────────

describe("addLanguage", () => {
  it("adds a new language to activeLanguages", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addLanguage({ code: "de" });
    });
    expect(result.current.store.activeLanguages).toContain("de");
  });

  it("initializes existing keys with null for the new language", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "auth.title", translations: { en: "Sign in" } });
      await result.current.tools.addLanguage({ code: "de" });
    });
    const key = result.current.store.keys[0];
    expect(key?.translations.de).toBeNull();
  });

  it("is a no-op when language is already active", async () => {
    const { result } = renderHook(() => useSubject());
    const initialCount = result.current.store.activeLanguages.length;
    await act(async () => {
      await result.current.tools.addLanguage({ code: "en" });
    });
    expect(result.current.store.activeLanguages).toHaveLength(initialCount);
  });
});

// ─── removeLanguage ───────────────────────────────────────────────────────────

describe("removeLanguage", () => {
  it("removes a non-source language", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.removeLanguage({ code: "pl" });
    });
    expect(result.current.store.activeLanguages).not.toContain("pl");
  });

  it("does not remove the source language", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.removeLanguage({ code: "en" });
    });
    expect(result.current.store.activeLanguages).toContain("en");
  });

  it("removes translations for that language from all keys", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "k", translations: { en: "A", pl: "B" } });
      await result.current.tools.removeLanguage({ code: "pl" });
    });
    const key = result.current.store.keys[0];
    expect("pl" in (key?.translations ?? {})).toBe(false);
  });
});

// ─── importFromJson ───────────────────────────────────────────────────────────

describe("importFromJson", () => {
  it("creates new keys from flat JSON", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.importFromJson({
        lang: "en",
        entries: { "auth.title": "Sign in", "auth.submit": "Submit" },
      });
    });
    expect(result.current.store.keys).toHaveLength(2);
  });

  it("updates existing key translation when key exists", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "auth.title", translations: { en: "Old" } });
      await result.current.tools.importFromJson({
        lang: "pl",
        entries: { "auth.title": "Zaloguj się" },
      });
    });
    const key = result.current.store.keys.find((k) => k.key === "auth.title");
    expect(key?.translations.pl).toBe("Zaloguj się");
  });

  it("returns imported count", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Record<string, unknown> | undefined;
    await act(async () => {
      response = await result.current.tools.importFromJson({
        lang: "en",
        entries: { "key.a": "A", "key.b": "B", "key.c": "C" },
      });
    });
    expect(response?.imported).toBe(3);
  });
});

// ─── validateStore ────────────────────────────────────────────────────────────

describe("validateStore", () => {
  it("returns issues and stats", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.validateStore();
    expect(response).toHaveProperty("issues");
    expect(response).toHaveProperty("stats");
  });

  it("reports missing translations as errors", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "auth.title", translations: { en: "Sign in" } });
    });
    const response = await result.current.tools.validateStore();
    const issues = response.issues as { severity: string }[];
    expect(issues.some((i) => i.severity === "error")).toBe(true);
  });
});

// ─── searchKeys ───────────────────────────────────────────────────────────────

describe("searchKeys", () => {
  it("returns all keys when no pattern is provided", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "a.b", translations: { en: "AB" } });
      await result.current.tools.addKey({ key: "c.d", translations: { en: "CD" } });
    });
    const response = await result.current.tools.searchKeys({});
    expect((response.keys as unknown[]).length).toBe(2);
  });

  it("filters keys by pattern", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "auth.login", translations: { en: "Login" } });
      await result.current.tools.addKey({ key: "nav.home", translations: { en: "Home" } });
    });
    const response = await result.current.tools.searchKeys({ pattern: "auth" });
    expect((response.keys as { key: string }[]).every((k) => k.key.includes("auth"))).toBe(true);
  });
});

// ─── detectUnusedKeys ────────────────────────────────────────────────────────

describe("detectUnusedKeys", () => {
  it("identifies keys not in the usages list", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "used.key", translations: { en: "Used" } });
      await result.current.tools.addKey({ key: "unused.key", translations: { en: "Unused" } });
    });
    const response = await result.current.tools.detectUnusedKeys({ usages: ["used.key"] });
    expect((response.unused as string[]).includes("unused.key")).toBe(true);
    expect((response.unused as string[]).includes("used.key")).toBe(false);
  });
});

// ─── mergeNamespaces ─────────────────────────────────────────────────────────

describe("mergeNamespaces", () => {
  it("renames keys from source to target namespace", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({
        key: "auth.login.title",
        translations: { en: "Sign in" },
      });
      await result.current.tools.mergeNamespaces({
        sourceNamespace: "auth",
        targetNamespace: "user",
      });
    });
    const keys = result.current.store.keys.map((k) => k.key);
    expect(keys).toContain("user.login.title");
    expect(keys).not.toContain("auth.login.title");
  });

  it("does not modify keys outside the source namespace", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "nav.home", translations: { en: "Home" } });
      await result.current.tools.mergeNamespaces({
        sourceNamespace: "auth",
        targetNamespace: "user",
      });
    });
    expect(result.current.store.keys[0]?.key).toBe("nav.home");
  });
});

// ─── findDuplicateValues ──────────────────────────────────────────────────────

describe("findDuplicateValues", () => {
  it("finds keys with identical source text", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "a.submit", translations: { en: "Submit" } });
      await result.current.tools.addKey({ key: "b.submit", translations: { en: "Submit" } });
      await result.current.tools.addKey({ key: "c.cancel", translations: { en: "Cancel" } });
    });
    const response = await result.current.tools.findDuplicateValues({});
    const dupes = response.duplicates as { value: string; keys: string[] }[];
    const submitDupe = dupes.find((d) => d.value === "Submit");
    expect(submitDupe?.keys).toHaveLength(2);
  });
});

// ─── generateTypeFile ─────────────────────────────────────────────────────────

describe("generateTypeFile", () => {
  it("generates a TypeScript union type", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({ key: "auth.title", translations: { en: "Sign in" } });
    });
    const response = await result.current.tools.generateTypeFile({ outputFormat: "ts" });
    expect(typeof response.types).toBe("string");
    expect(response.types).toContain("auth.title");
  });
});

// ─── exportToXliff ────────────────────────────────────────────────────────────

describe("exportToXliff", () => {
  it("generates XLIFF XML string", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({
        key: "auth.title",
        translations: { en: "Sign in", pl: "Zaloguj się" },
      });
    });
    const response = await result.current.tools.exportToXliff({
      sourceLanguage: "en",
      targetLanguage: "pl",
    });
    expect(typeof response.xliff).toBe("string");
    expect(response.xliff).toContain("xliff");
    expect(response.xliff).toContain("Sign in");
  });
});

// ─── generateNamespaceSummary ────────────────────────────────────────────────

describe("generateNamespaceSummary", () => {
  it("returns a summary array grouped by namespace", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({
        key: "auth.login.title",
        translations: { en: "Sign in" },
      });
      await result.current.tools.addKey({
        key: "auth.login.submit",
        translations: { en: "Submit" },
      });
      await result.current.tools.addKey({ key: "nav.home", translations: { en: "Home" } });
    });
    const response = await result.current.tools.generateNamespaceSummary();
    const summary = response.summary as { namespace: string; total: number }[];
    const authSummary = summary.find((s) => s.namespace === "auth");
    expect(authSummary?.total).toBeGreaterThanOrEqual(2);
  });
});

// ─── scoreTranslationQuality ─────────────────────────────────────────────────

describe("scoreTranslationQuality", () => {
  it("returns score and issues", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.scoreTranslationQuality({});
    expect(typeof response.score).toBe("number");
    expect(Array.isArray(response.issues)).toBe(true);
  });

  it("flags translations identical to source", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addKey({
        key: "auth.title",
        translations: { en: "Sign in", pl: "Sign in" }, // identical to source
      });
    });
    const response = await result.current.tools.scoreTranslationQuality({ language: "pl" });
    const issues = response.issues as { issue: string }[];
    expect(issues.some((i) => i.issue.includes("identical"))).toBe(true);
  });
});

// ─── passthrough tools ────────────────────────────────────────────────────────

describe("passthrough tools", () => {
  it("setLanguageRTL returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.setLanguageRTL({ code: "ar", rtl: true });
    expect(response).toMatchObject({ success: true });
  });

  it("addGlossaryTerm returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addGlossaryTerm({
      sourceTerm: "Submit",
      language: "pl",
      targetTerm: "Wyślij",
    });
    expect(response).toMatchObject({ success: true });
  });

  it("setPluralRules returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.setPluralRules({
      language: "pl",
      forms: ["one", "few", "many"],
    });
    expect(response).toMatchObject({ success: true });
  });
});
