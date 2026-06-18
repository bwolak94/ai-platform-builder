import { tool } from "ai";
import { z } from "zod";
import { FormFieldSchema } from "@ai-builder/schemas";

export const formTools = {
  querySchema: tool({
    description: "Get the current form schema state including all fields and metadata.",
    inputSchema: z.object({}),
  }),

  addField: tool({
    description: "Add a new field to the form at the specified position.",
    inputSchema: z.object({
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
    inputSchema: z.object({
      fieldId: z.string(),
    }),
  }),

  updateField: tool({
    description: "Update properties of an existing field (partial update).",
    inputSchema: z.object({
      fieldId: z.string(),
      updates: FormFieldSchema.partial(),
    }),
  }),

  reorderFields: tool({
    description: "Reorder form fields by providing the complete new ordered list of field IDs.",
    inputSchema: z.object({
      orderedIds: z.array(z.string()),
    }),
  }),

  applyFormTemplate: tool({
    description:
      "Replace the current form with a pre-built template. Useful when the user asks to 'start from a template' or 'use the registration template'.",
    inputSchema: z.object({
      template: z
        .enum([
          "contact",
          "registration",
          "feedback",
          "survey",
          "job-application",
          "checkout",
          "login",
          "newsletter-signup",
        ])
        .describe("Template to load"),
    }),
  }),

  addConditionalRule: tool({
    description:
      "Add a conditional visibility rule to a field: show or hide it based on the value of another field.",
    inputSchema: z.object({
      fieldId: z.string().describe("ID of the field to conditionally show/hide"),
      dependsOnFieldId: z.string().describe("ID of the field whose value controls visibility"),
      operator: z
        .enum(["equals", "not_equals", "contains", "not_empty"])
        .describe("Comparison operator"),
      value: z.string().nullable().describe("Expected value (null when operator is not_empty)"),
      action: z.enum(["show", "hide"]).describe("What to do when condition is met"),
    }),
  }),

  addFieldGroup: tool({
    description:
      "Wrap a set of fields in a named fieldset with a legend, grouping them visually and semantically.",
    inputSchema: z.object({
      groupId: z.string().describe("Unique group ID, e.g. g_abc123"),
      legend: z.string().describe("Visible label for the fieldset, e.g. 'Billing Address'"),
      fieldIds: z.array(z.string()).describe("Ordered list of field IDs to include in this group"),
    }),
  }),

  exportToReactHookForm: tool({
    description:
      "Generate a working React component using react-hook-form + Zod resolver from the current form schema. Returns the full TSX source.",
    inputSchema: z.object({}),
  }),

  auditFormAccessibility: tool({
    description:
      "Audit the current form for ARIA and accessibility issues: missing labels, incorrect input types, missing error IDs, and submit button conventions. Returns a list of issues with suggested fixes.",
    inputSchema: z.object({}),
  }),

  createFormWizard: tool({
    description:
      "Convert the current form into a multi-step wizard with named steps, a progress indicator, and back/next navigation. Returns the wizard config with step titles and field assignments.",
    inputSchema: z.object({
      steps: z
        .array(
          z.object({
            title: z.string().describe("Step title, e.g. 'Personal Info'"),
            fieldIds: z.array(z.string()).describe("Field IDs included in this step"),
          })
        )
        .min(2)
        .describe("At least 2 steps required"),
    }),
  }),

  getConditionalGraph: tool({
    description:
      "Return a Mermaid flowchart of all conditional visibility rules in the form, showing which fields control which others. Useful for reviewing complex dependency chains.",
    inputSchema: z.object({}),
  }),

  importJsonSchema: tool({
    description:
      "Parse a JSON Schema (draft-7) object and add its properties as form fields. Infers field type from JSON Schema types and formats (e.g. format:email → email field).",
    inputSchema: z.object({
      schema: z
        .record(z.string(), z.unknown())
        .describe("JSON Schema object with a 'properties' key"),
      overwrite: z
        .boolean()
        .default(false)
        .describe("If true, replace all existing fields; if false, append"),
    }),
  }),

  exportZodSchema: tool({
    description:
      "Generate a Zod schema TypeScript snippet (z.object({…})) from the current form fields, ready to paste into a schema file or use as a react-hook-form Zod resolver.",
    inputSchema: z.object({}),
  }),

  previewField: tool({
    description: "Highlight and scroll to a specific field in the live preview iframe.",
    inputSchema: z.object({
      fieldId: z.string().describe("Field ID to focus in the preview panel"),
    }),
  }),

  duplicateField: tool({
    description:
      "Clone an existing field with a new ID, appending '(copy)' to its label. The duplicate is inserted immediately after the original.",
    inputSchema: z.object({
      fieldId: z.string().describe("ID of the field to duplicate"),
      newId: z.string().describe("New unique field ID, e.g. f_copy001"),
    }),
  }),

  addComputedField: tool({
    description:
      "Add a read-only computed field whose display value is derived from other fields (e.g. 'price × quantity = total'). The formula is included as a comment in the exported code.",
    inputSchema: z.object({
      id: z.string().describe("Unique field ID, e.g. f_total001"),
      label: z.string().describe("Display label, e.g. 'Order Total'"),
      formula: z.string().describe("Human-readable formula, e.g. 'price * quantity'"),
      dependsOn: z.array(z.string()).describe("Field IDs this field reads from"),
    }),
  }),

  retrieveDocs: tool({
    description:
      "Search internal documentation for form patterns, ARIA guides, and validation examples.",
    inputSchema: z.object({
      query: z.string().describe("Natural language search query"),
    }),
  }),
};
