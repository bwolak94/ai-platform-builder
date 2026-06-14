import { describe, it, expect } from "vitest";
import { serializeFormDSL, deserializeFormDSL } from "../form-dsl";
import type { FormSchema } from "@ai-builder/schemas";

const baseSchema: FormSchema = {
  id: "form_1",
  title: "Contact Form",
  description: null,
  submitLabel: "Send",
  layout: "single-column",
  fields: [
    {
      id: "f_abc123",
      type: "text",
      name: "firstName",
      label: "First name",
      placeholder: null,
      defaultValue: null,
      options: null,
      validation: [{ type: "required", value: true, message: "Required" }],
      className: null,
      helpText: null,
      disabled: null,
      hidden: null,
    },
    {
      id: "f_def456",
      type: "email",
      name: "email",
      label: "Email address",
      placeholder: null,
      defaultValue: null,
      options: null,
      validation: [
        { type: "required", value: true, message: "Required" },
        { type: "minLength", value: 5, message: "Min 5 chars" },
      ],
      className: null,
      helpText: null,
      disabled: null,
      hidden: null,
    },
  ],
};

describe("serializeFormDSL", () => {
  it("produces a header line with title and layout", () => {
    const dsl = serializeFormDSL(baseSchema);
    expect(dsl).toContain("FORM: Contact Form | layout:single-column");
  });

  it("includes all field lines", () => {
    const dsl = serializeFormDSL(baseSchema);
    expect(dsl).toContain("f_abc123 text:firstName");
    expect(dsl).toContain("f_def456 email:email");
  });

  it("serializes validation rules inline", () => {
    const dsl = serializeFormDSL(baseSchema);
    expect(dsl).toContain("[required]");
    expect(dsl).toContain("[required,minLength:5]");
  });

  it("produces no empty lines for fields without validation", () => {
    const firstField = baseSchema.fields[0];
    if (!firstField) throw new Error("test setup: no field at index 0");
    const schema: FormSchema = {
      ...baseSchema,
      fields: [{ ...firstField, validation: null }],
    };
    const dsl = serializeFormDSL(schema);
    expect(dsl).not.toContain("[]");
  });
});

describe("deserializeFormDSL", () => {
  it("parses the title correctly", () => {
    const dsl = serializeFormDSL(baseSchema);
    const result = deserializeFormDSL(dsl);
    expect(result.title).toBe("Contact Form");
  });

  it("parses the layout correctly", () => {
    const dsl = serializeFormDSL(baseSchema);
    const result = deserializeFormDSL(dsl);
    expect(result.layout).toBe("single-column");
  });

  it("parses the correct number of fields", () => {
    const dsl = serializeFormDSL(baseSchema);
    const result = deserializeFormDSL(dsl);
    expect(result.fields).toHaveLength(2);
  });

  it("preserves field id, type, name and label", () => {
    const dsl = serializeFormDSL(baseSchema);
    const result = deserializeFormDSL(dsl);
    expect(result.fields[0]).toMatchObject({
      id: "f_abc123",
      type: "text",
      name: "firstName",
      label: "First name",
    });
  });
});

describe("round-trip", () => {
  it("serializes and deserializes back to equivalent fields", () => {
    const dsl = serializeFormDSL(baseSchema);
    const result = deserializeFormDSL(dsl);

    expect(result.title).toBe(baseSchema.title);
    expect(result.layout).toBe(baseSchema.layout);
    expect(result.fields).toHaveLength(baseSchema.fields.length);

    result.fields.forEach((field, i) => {
      const original = baseSchema.fields[i];
      if (!original) throw new Error("No original field at index " + String(i));
      expect(field.id).toBe(original.id);
      expect(field.type).toBe(original.type);
      expect(field.name).toBe(original.name);
      expect(field.label).toBe(original.label);
    });
  });

  it("round-trips validation rules", () => {
    const dsl = serializeFormDSL(baseSchema);
    const result = deserializeFormDSL(dsl);
    const emailField = result.fields[1];
    const secondRule = emailField?.validation?.[1];
    expect(emailField?.validation).toHaveLength(2);
    expect(secondRule?.type).toBe("minLength");
    expect(secondRule?.value).toBe(5);
  });
});
