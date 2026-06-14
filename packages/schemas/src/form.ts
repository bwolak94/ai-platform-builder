import { z } from "zod";

export const FieldTypeSchema = z.enum([
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
]);

export const ValidationRuleSchema = z.object({
  type: z.enum(["required", "minLength", "maxLength", "pattern", "min", "max", "custom"]),
  value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  message: z.string().min(1),
});

export const FieldOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const FormFieldSchema = z.object({
  id: z.string().regex(/^f_[a-z0-9]{6}$/, "Field id must match f_XXXXXX"),
  type: FieldTypeSchema,
  name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*/),
  label: z.string().min(1).max(60),
  placeholder: z.string().nullable(),
  defaultValue: z.string().nullable(),
  options: z.array(FieldOptionSchema).nullable(),
  validation: z.array(ValidationRuleSchema).nullable(),
  className: z.string().nullable(),
  helpText: z.string().nullable(),
  disabled: z.boolean().nullable(),
  hidden: z.boolean().nullable(),
});

export const FormSchemaSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().nullable(),
  submitLabel: z.string().nullable(),
  fields: z.array(FormFieldSchema),
  layout: z.enum(["single-column", "two-column", "grid"]).nullable(),
});

export type FieldType = z.infer<typeof FieldTypeSchema>;
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;
export type FieldOption = z.infer<typeof FieldOptionSchema>;
export type FormField = z.infer<typeof FormFieldSchema>;
export type FormSchema = z.infer<typeof FormSchemaSchema>;
