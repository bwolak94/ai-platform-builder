import { describe, it, expect } from "vitest";
import {
  serializeEmailDSL,
  deserializeEmailDSL,
  generateEmailHtml,
  analyzeSpam,
  buildPresetSections,
} from "../email-dsl";
import type { EmailTemplate } from "@ai-builder/schemas";

const baseTemplate: EmailTemplate = {
  id: "email_1",
  subject: "Welcome to our platform",
  previewText: "Confirm your account to get started",
  type: "transactional",
  sections: [
    {
      id: "sec_001",
      type: "header",
      bgColor: null,
      logoUrl: null,
      logoAlt: null,
      title: "MyBrand",
    },
    {
      id: "sec_002",
      type: "hero",
      bgColor: null,
      heading: "Welcome, {{firstName}}!",
      subheading: "Please confirm your email address.",
      imageUrl: null,
    },
    {
      id: "sec_003",
      type: "cta",
      bgColor: null,
      cta: {
        label: "Confirm Email",
        url: "https://example.com/confirm",
        bgColor: "#4F46E5",
        textColor: "#FFFFFF",
      },
      text: "Click below to verify your account.",
    },
    {
      id: "sec_004",
      type: "footer",
      bgColor: null,
      companyName: "Acme Inc.",
      address: "123 Main St, Springfield",
      unsubscribeUrl: "https://example.com/unsubscribe",
    },
  ],
};

describe("serializeEmailDSL", () => {
  it("includes the email subject", () => {
    const dsl = serializeEmailDSL(baseTemplate);
    expect(dsl).toContain("Welcome to our platform");
  });

  it("includes section type markers", () => {
    const dsl = serializeEmailDSL(baseTemplate);
    expect(dsl).toContain("[HEADER]");
    expect(dsl).toContain("[HERO]");
    expect(dsl).toContain("[CTA]");
    expect(dsl).toContain("[FOOTER]");
  });

  it("includes the hero heading text", () => {
    const dsl = serializeEmailDSL(baseTemplate);
    expect(dsl).toContain("Welcome");
  });

  it("includes CTA label", () => {
    const dsl = serializeEmailDSL(baseTemplate);
    expect(dsl).toContain("Confirm Email");
  });

  it("produces a non-empty string for an empty template", () => {
    const empty: EmailTemplate = {
      id: "e",
      subject: "Test",
      previewText: null,
      type: "transactional",
      sections: [],
    };
    const dsl = serializeEmailDSL(empty);
    expect(dsl.length).toBeGreaterThan(0);
  });
});

describe("deserializeEmailDSL", () => {
  it("round-trips subject", () => {
    const dsl = serializeEmailDSL(baseTemplate);
    const restored = deserializeEmailDSL(dsl);
    expect(restored.subject).toBe("Welcome to our platform");
  });

  it("round-trips section count", () => {
    const dsl = serializeEmailDSL(baseTemplate);
    const restored = deserializeEmailDSL(dsl);
    expect(restored.sections).toHaveLength(4);
  });

  it("round-trips section types in order", () => {
    const dsl = serializeEmailDSL(baseTemplate);
    const restored = deserializeEmailDSL(dsl);
    const types = restored.sections.map((s) => s.type);
    expect(types).toEqual(["header", "hero", "cta", "footer"]);
  });

  it("round-trips hero heading", () => {
    const dsl = serializeEmailDSL(baseTemplate);
    const restored = deserializeEmailDSL(dsl);
    const hero = restored.sections.find((s) => s.type === "hero");
    expect(hero).toBeDefined();
    if (hero?.type === "hero") {
      expect(hero.heading).toContain("Welcome");
    }
  });
});

describe("generateEmailHtml", () => {
  it("produces a valid HTML string with DOCTYPE", () => {
    const html = generateEmailHtml(baseTemplate);
    expect(html).toContain("<!DOCTYPE");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("includes the CTA button text", () => {
    const html = generateEmailHtml(baseTemplate);
    expect(html).toContain("Confirm Email");
  });

  it("includes the unsubscribe link", () => {
    const html = generateEmailHtml(baseTemplate);
    expect(html).toContain("unsubscribe");
  });
});

describe("analyzeSpam", () => {
  it("returns a score and issues array", () => {
    const result = analyzeSpam(baseTemplate);
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("issues");
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it("returns a lower score for a well-formed template with unsubscribe", () => {
    const result = analyzeSpam(baseTemplate);
    expect(result.score).toBeLessThan(50);
  });

  it("flags missing unsubscribe as an issue for marketing email", () => {
    const noUnsubscribe: EmailTemplate = {
      ...baseTemplate,
      type: "marketing",
      sections: baseTemplate.sections.map((s) =>
        s.type === "footer" ? { ...s, unsubscribeUrl: null } : s
      ),
    };
    const result = analyzeSpam(noUnsubscribe);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("buildPresetSections", () => {
  it("returns sections for every preset name", () => {
    const presets = [
      "welcome",
      "password-reset",
      "order-confirmation",
      "newsletter",
      "promotional",
    ] as const;
    for (const name of presets) {
      const sections = buildPresetSections(name);
      expect(sections.length).toBeGreaterThan(0);
    }
  });

  it("welcome preset contains a hero section", () => {
    const sections = buildPresetSections("welcome");
    expect(sections.some((s) => s.type === "hero")).toBe(true);
  });

  it("welcome preset contains a footer with unsubscribe", () => {
    const sections = buildPresetSections("welcome");
    const footer = sections.find((s) => s.type === "footer");
    expect(footer).toBeDefined();
    if (footer?.type === "footer") {
      expect(footer.unsubscribeUrl).toBeTruthy();
    }
  });
});
