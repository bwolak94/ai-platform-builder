import { describe, it, expect } from "vitest";
import {
  generateZodSchema,
  generateReactHookForm,
  generateFormikForm,
  generateHtml,
} from "../form-exporters";
import type { FormSchema } from "@ai-builder/schemas";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const minimalSchema: FormSchema = {
  id: "form_1",
  title: "Contact Form",
  description: null,
  submitLabel: "Send",
  layout: "single-column",
  fields: [
    {
      id: "f_abc123",
      type: "text",
      name: "fullName",
      label: "Full Name",
      placeholder: "Jane Doe",
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
        { type: "required", value: true, message: "Email required" },
        { type: "minLength", value: 5, message: "Too short" },
      ],
      className: null,
      helpText: null,
      disabled: null,
      hidden: null,
    },
  ],
};

const selectSchema: FormSchema = {
  id: "form_2",
  title: "Survey Form",
  description: null,
  submitLabel: "Submit",
  layout: "single-column",
  fields: [
    {
      id: "f_sel111",
      type: "select",
      name: "role",
      label: "Role",
      placeholder: null,
      defaultValue: null,
      options: [
        { value: "admin", label: "Admin" },
        { value: "user", label: "User" },
      ],
      validation: null,
      className: null,
      helpText: null,
      disabled: null,
      hidden: null,
    },
  ],
};

const emptySchema: FormSchema = {
  id: "form_3",
  title: "Empty Form",
  description: null,
  submitLabel: null,
  layout: "single-column",
  fields: [],
};

// ─── generateZodSchema ────────────────────────────────────────────────────────

describe("generateZodSchema", () => {
  it("imports z from zod", () => {
    expect(generateZodSchema(minimalSchema)).toContain('import { z } from "zod"');
  });

  it("exports a schema const named after the form title in PascalCase", () => {
    const code = generateZodSchema(minimalSchema);
    expect(code).toContain("export const ContactFormSchema = z.object({");
  });

  it("exports an inferred type alias", () => {
    const code = generateZodSchema(minimalSchema);
    expect(code).toContain("export type ContactForm = z.infer<typeof ContactFormSchema>");
  });

  it("marks required fields without .optional()", () => {
    const code = generateZodSchema(minimalSchema);
    // fullName has required validation — must NOT have .optional()
    const lines = code.split("\n");
    const fullNameLine = lines.find((l) => l.includes("fullName:"));
    expect(fullNameLine).toBeDefined();
    expect(fullNameLine).not.toContain(".optional()");
  });

  it("marks non-required fields with .optional()", () => {
    const schema: FormSchema = {
      ...minimalSchema,
      fields: [
        {
          id: "f_abc123",
          type: "text",
          name: "fullName",
          label: "Full Name",
          placeholder: "Jane Doe",
          defaultValue: null,
          options: null,
          validation: null, // no required rule — field becomes optional
          className: null,
          helpText: null,
          disabled: null,
          hidden: null,
        },
      ],
    };
    const code = generateZodSchema(schema);
    expect(code).toContain(".optional()");
  });

  it("uses z.string().email() for email fields", () => {
    expect(generateZodSchema(minimalSchema)).toContain("z.string().email(");
  });

  it("uses z.enum() for select fields with options", () => {
    const code = generateZodSchema(selectSchema);
    expect(code).toContain('z.enum(["admin", "user"])');
  });

  it("applies minLength validation", () => {
    const code = generateZodSchema(minimalSchema);
    expect(code).toContain(".min(5,");
  });

  it("generates valid output for empty field list", () => {
    const code = generateZodSchema(emptySchema);
    expect(code).toContain("z.object({");
    expect(code).toContain("})");
  });
});

// ─── generateReactHookForm ────────────────────────────────────────────────────

describe("generateReactHookForm", () => {
  it("imports useForm and zodResolver", () => {
    const code = generateReactHookForm(minimalSchema);
    expect(code).toContain("import { useForm }");
    expect(code).toContain("zodResolver");
  });

  it("exports a component named after the form title", () => {
    const code = generateReactHookForm(minimalSchema);
    expect(code).toContain("export function ContactFormForm()");
  });

  it("registers each field by name", () => {
    const code = generateReactHookForm(minimalSchema);
    expect(code).toContain('register("fullName"');
    expect(code).toContain('register("email"');
  });

  it("renders label elements with field label text", () => {
    const code = generateReactHookForm(minimalSchema);
    expect(code).toContain(">Full Name<");
    expect(code).toContain(">Email address<");
  });

  it("uses placeholder attribute when field has a placeholder", () => {
    const code = generateReactHookForm(minimalSchema);
    expect(code).toContain('placeholder="Jane Doe"');
  });

  it("renders select element with options for select fields", () => {
    const code = generateReactHookForm(selectSchema);
    expect(code).toContain("<select");
    expect(code).toContain('<option value="admin">Admin</option>');
  });

  it("uses submitLabel for the submit button text", () => {
    const code = generateReactHookForm(minimalSchema);
    expect(code).toContain("Send");
  });

  it("falls back to 'Submit' when submitLabel is null", () => {
    const code = generateReactHookForm(emptySchema);
    expect(code).toContain("Submit");
  });
});

// ─── generateFormikForm ───────────────────────────────────────────────────────

describe("generateFormikForm", () => {
  it("imports Formik, Form, Field, and ErrorMessage", () => {
    const code = generateFormikForm(minimalSchema);
    expect(code).toContain("import { Formik, Form, Field, ErrorMessage }");
  });

  it("imports Yup for validation schema", () => {
    const code = generateFormikForm(minimalSchema);
    expect(code).toContain('import * as Yup from "yup"');
  });

  it("exports a component named after the form title", () => {
    const code = generateFormikForm(minimalSchema);
    expect(code).toContain("export function ContactFormForm()");
  });

  it("uses Field components for each form field", () => {
    const code = generateFormikForm(minimalSchema);
    expect(code).toContain('name="fullName"');
    expect(code).toContain('name="email"');
  });

  it("adds Yup.string().required() for required fields", () => {
    const code = generateFormikForm(minimalSchema);
    expect(code).toContain(".required(");
  });

  it("uses Yup.string().email() for email type fields", () => {
    const code = generateFormikForm(minimalSchema);
    expect(code).toContain(".email(");
  });

  it("initializes string fields with empty string", () => {
    const code = generateFormikForm(minimalSchema);
    expect(code).toContain('fullName: ""');
  });
});

// ─── generateHtml ─────────────────────────────────────────────────────────────

describe("generateHtml", () => {
  it("produces a valid HTML5 skeleton", () => {
    const code = generateHtml(minimalSchema);
    expect(code).toContain("<!DOCTYPE html>");
    expect(code).toContain('<html lang="en">');
    expect(code).toContain("</html>");
  });

  it("includes the form title in a heading", () => {
    const code = generateHtml(minimalSchema);
    expect(code).toContain("<h2>Contact Form</h2>");
  });

  it("renders input elements with correct type and id", () => {
    const code = generateHtml(minimalSchema);
    expect(code).toContain('type="text"');
    expect(code).toContain('id="f_abc123"');
    expect(code).toContain('type="email"');
    expect(code).toContain('id="f_def456"');
  });

  it("renders placeholder attribute when present", () => {
    const code = generateHtml(minimalSchema);
    expect(code).toContain('placeholder="Jane Doe"');
  });

  it("adds required attribute for required fields", () => {
    const code = generateHtml(minimalSchema);
    expect(code).toContain(" required");
  });

  it("renders select with option elements", () => {
    const code = generateHtml(selectSchema);
    expect(code).toContain("<select");
    expect(code).toContain('<option value="admin">Admin</option>');
    expect(code).toContain('<option value="user">User</option>');
  });

  it("adds minlength attribute from minLength validation", () => {
    const code = generateHtml(minimalSchema);
    expect(code).toContain('minlength="5"');
  });

  it("includes a submit button with the form's submitLabel", () => {
    const code = generateHtml(minimalSchema);
    expect(code).toContain(">Send<");
  });

  it("uses 'Submit' as default button text when submitLabel is null", () => {
    const code = generateHtml(emptySchema);
    expect(code).toContain(">Submit<");
  });
});
