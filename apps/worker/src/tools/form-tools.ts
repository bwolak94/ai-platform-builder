import { tool } from "ai";
import { z } from "zod";

const ValidationRuleSchema = z.object({
  type: z.enum(["required", "minLength", "maxLength", "pattern", "min", "max", "custom"]),
  value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  message: z.string(),
});

const FieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

const FormFieldSchema = z.object({
  id: z.string().regex(/^f_[a-z0-9]{6}$/),
  type: z.enum([
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
  ]),
  name: z.string(),
  label: z.string(),
  placeholder: z.string().nullable(),
  defaultValue: z.string().nullable(),
  options: z.array(FieldOptionSchema).nullable(),
  validation: z.array(ValidationRuleSchema).nullable(),
  className: z.string().nullable(),
  helpText: z.string().nullable(),
  disabled: z.boolean().nullable(),
  hidden: z.boolean().nullable(),
});

export const formTools = {
  querySchema: tool({
    description: "Get the current form schema state including all fields and metadata.",
    parameters: z.object({}),
  }),

  addField: tool({
    description: "Add a new field to the form at the specified position.",
    parameters: z.object({
      field: FormFieldSchema,
      afterFieldId: z
        .string()
        .nullable()
        .optional()
        .describe("Insert after this field id. Null = append."),
    }),
  }),

  removeField: tool({
    description: "Remove a field from the form by its id.",
    parameters: z.object({
      fieldId: z.string(),
    }),
  }),

  updateField: tool({
    description: "Update properties of an existing field (partial update).",
    parameters: z.object({
      fieldId: z.string(),
      updates: FormFieldSchema.partial(),
    }),
  }),

  reorderFields: tool({
    description: "Reorder form fields by providing the complete new ordered list of field IDs.",
    parameters: z.object({
      orderedIds: z.array(z.string()),
    }),
  }),

  retrieveDocs: tool({
    description:
      "Search internal documentation for form patterns, ARIA guides, and validation examples.",
    parameters: z.object({
      query: z.string().describe("Natural language search query"),
    }),
  }),
};
