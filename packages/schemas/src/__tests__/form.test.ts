import { describe, it, expect } from "vitest";
import { FormFieldSchema, FormSchemaSchema } from "../form";

const validField = {
  id: "f_abc123",
  type: "text",
  name: "firstName",
  label: "First name",
  placeholder: null,
  defaultValue: null,
  options: null,
  validation: null,
  className: null,
  helpText: null,
  disabled: null,
  hidden: null,
};

const validSchema = {
  id: "form_1",
  title: "Contact Form",
  description: null,
  submitLabel: "Send",
  fields: [validField],
  layout: "single-column",
};

describe("FormFieldSchema", () => {
  it("accepts a valid field", () => {
    expect(FormFieldSchema.safeParse(validField).success).toBe(true);
  });

  it("rejects an invalid field id format", () => {
    const result = FormFieldSchema.safeParse({ ...validField, id: "invalid_id" });
    expect(result.success).toBe(false);
  });

  it("rejects label longer than 60 chars", () => {
    const result = FormFieldSchema.safeParse({ ...validField, label: "a".repeat(61) });
    expect(result.success).toBe(false);
  });

  it("rejects name starting with a digit", () => {
    const result = FormFieldSchema.safeParse({ ...validField, name: "1field" });
    expect(result.success).toBe(false);
  });

  it("accepts all field types", () => {
    const types = [
      "text",
      "email",
      "password",
      "number",
      "tel",
      "textarea",
      "select",
      "multiselect",
      "checkbox",
      "radio",
      "date",
      "file",
      "hidden",
    ];
    types.forEach((type) => {
      const r = FormFieldSchema.safeParse({ ...validField, type });
      expect(r.success, `type ${type} should be valid`).toBe(true);
    });
  });

  it("accepts validation rules", () => {
    const field = {
      ...validField,
      validation: [
        { type: "required", value: true, message: "Required" },
        { type: "minLength", value: 3, message: "Min 3 chars" },
      ],
    };
    expect(FormFieldSchema.safeParse(field).success).toBe(true);
  });

  it("accepts options for select field", () => {
    const field = {
      ...validField,
      type: "select",
      options: [
        { label: "Option A", value: "a" },
        { label: "Option B", value: "b" },
      ],
    };
    expect(FormFieldSchema.safeParse(field).success).toBe(true);
  });
});

describe("FormSchemaSchema", () => {
  it("accepts a valid form schema", () => {
    expect(FormSchemaSchema.safeParse(validSchema).success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = FormSchemaSchema.safeParse({ ...validSchema, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid layout value", () => {
    const result = FormSchemaSchema.safeParse({ ...validSchema, layout: "invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts null layout", () => {
    expect(FormSchemaSchema.safeParse({ ...validSchema, layout: null }).success).toBe(true);
  });

  it("accepts all valid layout values", () => {
    ["single-column", "two-column", "grid"].forEach((layout) => {
      const r = FormSchemaSchema.safeParse({ ...validSchema, layout });
      expect(r.success, `layout ${layout} should be valid`).toBe(true);
    });
  });

  it("accepts empty fields array", () => {
    expect(FormSchemaSchema.safeParse({ ...validSchema, fields: [] }).success).toBe(true);
  });
});
