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

  retrieveDocs: tool({
    description:
      "Search internal documentation for form patterns, ARIA guides, and validation examples.",
    inputSchema: z.object({
      query: z.string().describe("Natural language search query"),
    }),
  }),
};
