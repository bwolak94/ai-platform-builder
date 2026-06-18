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

  retrieveDocs: tool({
    description:
      "Search internal documentation for form patterns, ARIA guides, and validation examples.",
    inputSchema: z.object({
      query: z.string().describe("Natural language search query"),
    }),
  }),
};
