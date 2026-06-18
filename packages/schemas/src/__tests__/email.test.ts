import { describe, it, expect } from "vitest";
import { EmailSectionSchema, EmailTemplateSchema, EmailCtaSchema, HexColorSchema } from "../email";

const validCta = {
  label: "Click here",
  url: "https://example.com",
  bgColor: null,
  textColor: null,
};

const heroSection = {
  id: "sec_001",
  type: "hero" as const,
  bgColor: null,
  heading: "Welcome!",
  subheading: "Please confirm your email",
  imageUrl: null,
};

const ctaSection = {
  id: "sec_002",
  type: "cta" as const,
  bgColor: null,
  cta: validCta,
  text: null,
};

const footerSection = {
  id: "sec_003",
  type: "footer" as const,
  bgColor: null,
  companyName: "Acme Inc.",
  address: "123 Main St",
  unsubscribeUrl: "https://example.com/unsubscribe",
};

const validTemplate = {
  id: "email_1",
  subject: "Welcome to our platform",
  previewText: "Confirm your account",
  type: "transactional" as const,
  sections: [heroSection, ctaSection, footerSection],
};

describe("HexColorSchema", () => {
  it("accepts a valid hex color", () => {
    expect(HexColorSchema.safeParse("#4F46E5").success).toBe(true);
  });

  it("accepts lowercase hex", () => {
    expect(HexColorSchema.safeParse("#ffffff").success).toBe(true);
  });

  it("rejects 3-digit hex", () => {
    expect(HexColorSchema.safeParse("#FFF").success).toBe(false);
  });

  it("rejects hex without #", () => {
    expect(HexColorSchema.safeParse("FFFFFF").success).toBe(false);
  });
});

describe("EmailCtaSchema", () => {
  it("accepts a valid CTA", () => {
    expect(EmailCtaSchema.safeParse(validCta).success).toBe(true);
  });

  it("rejects empty label", () => {
    const result = EmailCtaSchema.safeParse({ ...validCta, label: "" });
    expect(result.success).toBe(false);
  });

  it("accepts hex bg and text colors", () => {
    const result = EmailCtaSchema.safeParse({
      ...validCta,
      bgColor: "#4F46E5",
      textColor: "#FFFFFF",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid hex for bgColor", () => {
    const result = EmailCtaSchema.safeParse({ ...validCta, bgColor: "blue" });
    expect(result.success).toBe(false);
  });
});

describe("EmailSectionSchema", () => {
  it("accepts a hero section", () => {
    expect(EmailSectionSchema.safeParse(heroSection).success).toBe(true);
  });

  it("rejects hero with empty heading", () => {
    const result = EmailSectionSchema.safeParse({ ...heroSection, heading: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a CTA section", () => {
    expect(EmailSectionSchema.safeParse(ctaSection).success).toBe(true);
  });

  it("accepts a footer section", () => {
    expect(EmailSectionSchema.safeParse(footerSection).success).toBe(true);
  });

  it("accepts a header section", () => {
    const result = EmailSectionSchema.safeParse({
      id: "sec_h",
      type: "header",
      bgColor: null,
      logoUrl: null,
      logoAlt: null,
      title: "My Brand",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a text section", () => {
    const result = EmailSectionSchema.safeParse({
      id: "sec_t",
      type: "text",
      bgColor: null,
      content: "Hello world",
      fontFamily: "Arial",
    });
    expect(result.success).toBe(true);
  });

  it("rejects text section with empty content", () => {
    const result = EmailSectionSchema.safeParse({
      id: "sec_t",
      type: "text",
      bgColor: null,
      content: "",
      fontFamily: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a columns section with 2 columns", () => {
    const result = EmailSectionSchema.safeParse({
      id: "sec_c",
      type: "columns",
      bgColor: null,
      columns: [
        { heading: "Col 1", body: "Body 1", imageUrl: null, cta: null },
        { heading: "Col 2", body: "Body 2", imageUrl: null, cta: null },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects columns section with fewer than 2 columns", () => {
    const result = EmailSectionSchema.safeParse({
      id: "sec_c",
      type: "columns",
      bgColor: null,
      columns: [{ heading: "Col 1", body: null, imageUrl: null, cta: null }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects columns section with more than 3 columns", () => {
    const col = { heading: null, body: null, imageUrl: null, cta: null };
    const result = EmailSectionSchema.safeParse({
      id: "sec_c",
      type: "columns",
      bgColor: null,
      columns: [col, col, col, col],
    });
    expect(result.success).toBe(false);
  });
});

describe("EmailTemplateSchema", () => {
  it("accepts a valid template", () => {
    expect(EmailTemplateSchema.safeParse(validTemplate).success).toBe(true);
  });

  it("rejects empty subject", () => {
    const result = EmailTemplateSchema.safeParse({ ...validTemplate, subject: "" });
    expect(result.success).toBe(false);
  });

  it("accepts all email types", () => {
    for (const type of ["transactional", "marketing", "notification"] as const) {
      const result = EmailTemplateSchema.safeParse({ ...validTemplate, type });
      expect(result.success).toBe(true);
    }
  });

  it("accepts empty sections array", () => {
    const result = EmailTemplateSchema.safeParse({ ...validTemplate, sections: [] });
    expect(result.success).toBe(true);
  });
});
