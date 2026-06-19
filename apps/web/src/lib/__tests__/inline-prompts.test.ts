import { describe, it, expect } from "vitest";
import { buildInlinePrompt, INLINE_ACTIONS } from "../inline-prompts";
import type { FormField } from "@ai-builder/schemas";

const textField: FormField = {
  id: "f_abc123",
  type: "text",
  name: "firstName",
  label: "First Name",
  placeholder: null,
  defaultValue: null,
  options: null,
  validation: null,
  className: null,
  helpText: null,
  disabled: null,
  hidden: null,
};

const emailField: FormField = {
  ...textField,
  id: "f_def456",
  type: "email",
  name: "email",
  label: "Email Address",
};

describe("INLINE_ACTIONS", () => {
  it("exports 4 action configs", () => {
    expect(INLINE_ACTIONS).toHaveLength(4);
  });

  it("every action has id, label, and icon", () => {
    for (const action of INLINE_ACTIONS) {
      expect(action.id).toBeTruthy();
      expect(action.label).toBeTruthy();
      expect(action.icon).toBeTruthy();
    }
  });

  it("includes make-required, add-validation, duplicate, add-help-text", () => {
    const ids = INLINE_ACTIONS.map((a) => a.id);
    expect(ids).toContain("make-required");
    expect(ids).toContain("add-validation");
    expect(ids).toContain("duplicate");
    expect(ids).toContain("add-help-text");
  });
});

describe("buildInlinePrompt", () => {
  describe("make-required", () => {
    it("references the field label", () => {
      const prompt = buildInlinePrompt(textField, "make-required");
      expect(prompt).toContain("First Name");
    });

    it("references the field ID", () => {
      const prompt = buildInlinePrompt(textField, "make-required");
      expect(prompt).toContain("f_abc123");
    });

    it("mentions 'required'", () => {
      const prompt = buildInlinePrompt(textField, "make-required");
      expect(prompt.toLowerCase()).toContain("required");
    });
  });

  describe("add-validation", () => {
    it("references the field type", () => {
      const prompt = buildInlinePrompt(emailField, "add-validation");
      expect(prompt).toContain("email");
    });

    it("references the field label and ID", () => {
      const prompt = buildInlinePrompt(emailField, "add-validation");
      expect(prompt).toContain("Email Address");
      expect(prompt).toContain("f_def456");
    });
  });

  describe("duplicate", () => {
    it("mentions 'duplicate' or 'copy'", () => {
      const prompt = buildInlinePrompt(textField, "duplicate");
      const lower = prompt.toLowerCase();
      expect(lower.includes("duplicate") || lower.includes("copy")).toBe(true);
    });

    it("references the field ID", () => {
      expect(buildInlinePrompt(textField, "duplicate")).toContain("f_abc123");
    });
  });

  describe("add-help-text", () => {
    it("references the field label", () => {
      expect(buildInlinePrompt(textField, "add-help-text")).toContain("First Name");
    });

    it("mentions help text", () => {
      const prompt = buildInlinePrompt(textField, "add-help-text").toLowerCase();
      expect(prompt.includes("help") || prompt.includes("text")).toBe(true);
    });
  });

  describe("explain", () => {
    it("references the field label and ID", () => {
      const prompt = buildInlinePrompt(textField, "explain");
      expect(prompt).toContain("First Name");
      expect(prompt).toContain("f_abc123");
    });
  });

  it("returns a non-empty string for every action type", () => {
    const actions = [
      "make-required",
      "add-validation",
      "duplicate",
      "add-help-text",
      "explain",
    ] as const;
    for (const action of actions) {
      const prompt = buildInlinePrompt(textField, action);
      expect(typeof prompt).toBe("string");
      expect(prompt.trim().length).toBeGreaterThan(0);
    }
  });
});
