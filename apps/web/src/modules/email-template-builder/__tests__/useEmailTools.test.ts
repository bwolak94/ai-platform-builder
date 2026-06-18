import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEmailState } from "../hooks/useEmailState";
import { useEmailTools } from "../hooks/useEmailTools";

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
  const state = useEmailState();
  const tools = useEmailTools(state.template, state.setTemplate, state.setClientMode);
  return { ...state, tools };
}

// ─── queryTemplate ────────────────────────────────────────────────────────────

describe("queryTemplate", () => {
  it("returns a non-empty dsl string", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.queryTemplate();
    expect(typeof response.dsl).toBe("string");
    expect((response.dsl as string).length).toBeGreaterThan(0);
  });

  it("dsl reflects subject after updateMetadata", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.updateMetadata({ subject: "Hello World" });
    });
    const response = await result.current.tools.queryTemplate();
    expect(response.dsl).toContain("Hello World");
  });
});

// ─── updateMetadata ───────────────────────────────────────────────────────────

describe("updateMetadata", () => {
  it("updates subject", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.updateMetadata({ subject: "New subject" });
    });
    expect(result.current.template.subject).toBe("New subject");
  });

  it("updates previewText to a value", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.updateMetadata({ previewText: "Open me!" });
    });
    expect(result.current.template.previewText).toBe("Open me!");
  });

  it("sets previewText to null", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.updateMetadata({ previewText: "text" });
      await result.current.tools.updateMetadata({ previewText: null });
    });
    expect(result.current.template.previewText).toBeNull();
  });

  it("updates type to marketing", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.updateMetadata({ type: "marketing" });
    });
    expect(result.current.template.type).toBe("marketing");
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.updateMetadata({ subject: "x" });
    expect(response).toMatchObject({ success: true });
  });
});

// ─── addSection ───────────────────────────────────────────────────────────────

describe("addSection", () => {
  it("appends a valid hero section", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: { id: "sec_001", type: "hero", heading: "Welcome!" },
      });
    });
    expect(result.current.template.sections).toHaveLength(1);
    expect(result.current.template.sections[0]?.type).toBe("hero");
  });

  it("appends a valid footer section", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: {
          id: "sec_footer",
          type: "footer",
          companyName: "Acme Inc.",
          address: "123 Main St",
          unsubscribeUrl: "https://example.com/unsubscribe",
        },
      });
    });
    expect(result.current.template.sections[0]?.type).toBe("footer");
  });

  it("returns success with sectionId", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Record<string, unknown> | undefined;
    await act(async () => {
      response = await result.current.tools.addSection({
        section: { id: "sec_001", type: "hero", heading: "Hi" },
      });
    });
    expect(response).toMatchObject({ success: true, sectionId: "sec_001" });
  });

  it("inserts after a specific section when afterSectionId is provided", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: { id: "sec_hdr", type: "header" },
      });
      await result.current.tools.addSection({
        section: { id: "sec_ftr", type: "footer" },
      });
      await result.current.tools.addSection({
        section: { id: "sec_hero", type: "hero", heading: "Middle" },
        afterSectionId: "sec_hdr",
      });
    });
    const types = result.current.template.sections.map((s) => s.type);
    expect(types).toEqual(["header", "hero", "footer"]);
  });

  it("returns error for invalid section type", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addSection({
      section: { id: "sec_bad", type: "unknown" },
    });
    expect(response).toMatchObject({ error: expect.any(String) });
    expect(result.current.template.sections).toHaveLength(0);
  });
});

// ─── updateSection ────────────────────────────────────────────────────────────

describe("updateSection", () => {
  it("updates hero heading", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: { id: "sec_hero", type: "hero", heading: "Original" },
      });
      await result.current.tools.updateSection({
        id: "sec_hero",
        updates: { heading: "Updated" },
      });
    });
    const section = result.current.template.sections[0];
    if (section?.type === "hero") {
      expect(section.heading).toBe("Updated");
    } else {
      throw new Error("Expected hero section");
    }
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: { id: "sec_hero", type: "hero", heading: "Hi" },
      });
    });
    const response = await result.current.tools.updateSection({
      id: "sec_hero",
      updates: { heading: "New" },
    });
    expect(response).toMatchObject({ success: true });
  });

  it("does not modify other sections", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: { id: "sec_hdr", type: "header", title: "Brand" },
      });
      await result.current.tools.addSection({
        section: { id: "sec_hero", type: "hero", heading: "Original" },
      });
      await result.current.tools.updateSection({
        id: "sec_hero",
        updates: { heading: "Changed" },
      });
    });
    const header = result.current.template.sections.find((s) => s.id === "sec_hdr");
    if (header?.type === "header") {
      expect(header.title).toBe("Brand");
    }
  });
});

// ─── removeSection ────────────────────────────────────────────────────────────

describe("removeSection", () => {
  it("removes the section by id", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: { id: "sec_hero", type: "hero", heading: "Hi" },
      });
      await result.current.tools.removeSection({ id: "sec_hero" });
    });
    expect(result.current.template.sections).toHaveLength(0);
  });

  it("removes only the targeted section", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: { id: "sec_hdr", type: "header" },
      });
      await result.current.tools.addSection({
        section: { id: "sec_hero", type: "hero", heading: "Hi" },
      });
      await result.current.tools.removeSection({ id: "sec_hdr" });
    });
    expect(result.current.template.sections).toHaveLength(1);
    expect(result.current.template.sections[0]?.type).toBe("hero");
  });
});

// ─── duplicateSection ─────────────────────────────────────────────────────────

describe("duplicateSection", () => {
  it("inserts a clone after the original", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: { id: "sec_hero", type: "hero", heading: "Hi" },
      });
      await result.current.tools.duplicateSection({ id: "sec_hero" });
    });
    expect(result.current.template.sections).toHaveLength(2);
    expect(result.current.template.sections[1]?.type).toBe("hero");
  });

  it("clone has a different id than original", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: { id: "sec_hero", type: "hero", heading: "Hi" },
      });
      await result.current.tools.duplicateSection({ id: "sec_hero" });
    });
    const ids = result.current.template.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("is a no-op for unknown id", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: { id: "sec_hero", type: "hero", heading: "Hi" },
      });
      await result.current.tools.duplicateSection({ id: "ghost" });
    });
    expect(result.current.template.sections).toHaveLength(1);
  });
});

// ─── reorderSections ─────────────────────────────────────────────────────────

describe("reorderSections", () => {
  it("reorders sections by provided id array", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({ section: { id: "s1", type: "header" } });
      await result.current.tools.addSection({ section: { id: "s2", type: "hero", heading: "H" } });
      await result.current.tools.addSection({ section: { id: "s3", type: "footer" } });
      await result.current.tools.reorderSections({ orderedIds: ["s3", "s2", "s1"] });
    });
    const types = result.current.template.sections.map((s) => s.id);
    expect(types).toEqual(["s3", "s2", "s1"]);
  });

  it("excludes unknown ids from result", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({ section: { id: "s1", type: "header" } });
      await result.current.tools.reorderSections({ orderedIds: ["ghost", "s1"] });
    });
    expect(result.current.template.sections).toHaveLength(1);
    expect(result.current.template.sections[0]?.id).toBe("s1");
  });
});

// ─── previewInClient ──────────────────────────────────────────────────────────

describe("previewInClient", () => {
  it("sets client mode to mobile", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.previewInClient({ client: "mobile" });
    });
    expect(result.current.clientMode).toBe("mobile");
  });

  it("returns success with client name", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.previewInClient({ client: "outlook" });
    expect(response).toMatchObject({ success: true, client: "outlook" });
  });
});

// ─── checkSpam ────────────────────────────────────────────────────────────────

describe("checkSpam", () => {
  it("returns score and issues array", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.checkSpam();
    expect(response).toHaveProperty("score");
    expect(Array.isArray(response.issues)).toBe(true);
  });
});

// ─── loadPreset ───────────────────────────────────────────────────────────────

describe("loadPreset", () => {
  it("replaces sections with preset sections", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.loadPreset({ name: "welcome" });
    });
    expect(result.current.template.sections.length).toBeGreaterThan(0);
  });

  it("returns sectionCount", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Record<string, unknown> | undefined;
    await act(async () => {
      response = await result.current.tools.loadPreset({ name: "password-reset" });
    });
    expect(typeof response?.sectionCount).toBe("number");
    expect((response?.sectionCount as number) > 0).toBe(true);
  });
});

// ─── generatePlainText ───────────────────────────────────────────────────────

describe("generatePlainText", () => {
  it("returns a plainText string", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: { id: "sec_hero", type: "hero", heading: "Welcome to the platform" },
      });
    });
    const response = await result.current.tools.generatePlainText();
    expect(typeof response.plainText).toBe("string");
    expect(response.plainText).toContain("Welcome to the platform");
  });

  it("returns empty string for empty template", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generatePlainText();
    expect(response.plainText).toBe("");
  });
});

// ─── addSocialProof ──────────────────────────────────────────────────────────

describe("addSocialProof", () => {
  it("appends a text section for testimonial variant", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSocialProof({
        variant: "testimonial-quote",
        quote: "Fantastic!",
        author: "Jane Doe",
      });
    });
    expect(result.current.template.sections).toHaveLength(1);
    expect(result.current.template.sections[0]?.type).toBe("text");
  });

  it("includes quote text in section content", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSocialProof({
        variant: "testimonial-quote",
        quote: "Amazing product",
        author: "Alice",
      });
    });
    const section = result.current.template.sections[0];
    if (section?.type === "text") {
      expect(section.content).toContain("Amazing product");
    }
  });

  it("appends stars rating section", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSocialProof({
        variant: "stars-rating",
        rating: 5,
      });
    });
    expect(result.current.template.sections[0]?.type).toBe("text");
  });
});

// ─── previewDarkMode ─────────────────────────────────────────────────────────

describe("previewDarkMode", () => {
  it("sets clientMode to dark when enabled is true", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.previewDarkMode({ enabled: true });
    });
    expect(result.current.clientMode).toBe("dark");
  });

  it("sets clientMode to desktop when enabled is false", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.previewDarkMode({ enabled: true });
      await result.current.tools.previewDarkMode({ enabled: false });
    });
    expect(result.current.clientMode).toBe("desktop");
  });

  it("returns mode in response", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.previewDarkMode({ enabled: true });
    expect(response).toMatchObject({ success: true, mode: "dark" });
  });
});

// ─── auditEmailAccessibility ─────────────────────────────────────────────────

describe("auditEmailAccessibility", () => {
  it("returns an issues array", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.auditEmailAccessibility();
    expect(Array.isArray(response.issues)).toBe(true);
  });

  it("flags header logo without alt text", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: {
          id: "sec_hdr",
          type: "header",
          logoUrl: "https://example.com/logo.png",
          logoAlt: null,
        },
      });
    });
    const response = await result.current.tools.auditEmailAccessibility();
    expect((response.issues as string[]).length).toBeGreaterThan(0);
  });

  it("does not flag header logo with alt text", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSection({
        section: {
          id: "sec_hdr",
          type: "header",
          logoUrl: "https://example.com/logo.png",
          logoAlt: "Brand logo",
        },
      });
    });
    const response = await result.current.tools.auditEmailAccessibility();
    expect((response.issues as string[]).length).toBe(0);
  });
});

// ─── passthrough tools ────────────────────────────────────────────────────────

describe("passthrough tools", () => {
  it("suggestSubjectLines returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.suggestSubjectLines({ count: 3 });
    expect(response).toMatchObject({ success: true });
  });

  it("addPersonalizationToken returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addPersonalizationToken({
      token: "{{firstName}}",
      description: "User first name",
      exampleValue: "John",
    });
    expect(response).toMatchObject({ success: true });
  });

  it("generateABVariant returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateABVariant({
      variantName: "B",
      change: "subject line",
      bValue: "Try this!",
    });
    expect(response).toMatchObject({ success: true });
  });

  it("validateCSSCompatibility returns dsl", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.validateCSSCompatibility();
    expect(response).toHaveProperty("dsl");
  });

  it("generateUnsubscribePage returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateUnsubscribePage({
      brandName: "Acme",
      accentColor: "#4F46E5",
    });
    expect(response).toMatchObject({ success: true });
  });
});
