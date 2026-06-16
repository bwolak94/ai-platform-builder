import { tool } from "ai";
import { z } from "zod";

const CONTROL_TYPES = [
  "color",
  "text",
  "number",
  "boolean",
  "select",
  "radio",
  "range",
  "object",
  "file",
] as const;

const ArgTypeSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  control: z.object({
    type: z.enum(CONTROL_TYPES),
    options: z.array(z.string()).optional(),
  }),
  defaultValue: z.unknown().optional(),
});

export const storyTools = {
  queryStory: tool({
    description: "Get the current story file state including component info and all variants.",
    inputSchema: z.object({}),
  }),

  setComponent: tool({
    description: "Set the component being documented (name and import path).",
    inputSchema: z.object({
      name: z.string().describe("PascalCase component name"),
      importPath: z.string().describe("Relative import path, e.g. './Button'"),
      title: z.string().optional().describe("Storybook sidebar title, e.g. 'Components/Button'"),
    }),
  }),

  addVariant: tool({
    description: "Add a named story variant (named export in CSF3 format).",
    inputSchema: z.object({
      name: z.string().describe("PascalCase variant name, e.g. 'Primary', 'Disabled'"),
      args: z.record(z.string(), z.unknown()).describe("Component props for this variant"),
      parameters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Storybook parameters override"),
    }),
  }),

  updateVariant: tool({
    description: "Update args or parameters for an existing variant.",
    inputSchema: z.object({
      name: z.string(),
      args: z.record(z.string(), z.unknown()).optional(),
      parameters: z.record(z.string(), z.unknown()).optional(),
    }),
  }),

  removeVariant: tool({
    description: "Remove a story variant by name.",
    inputSchema: z.object({
      name: z.string(),
    }),
  }),

  setDefaultArgs: tool({
    description: "Set component-level default args in the Meta export.",
    inputSchema: z.object({
      args: z.record(z.string(), z.unknown()),
    }),
  }),

  setLayout: tool({
    description: "Set the Storybook layout for all stories in this file.",
    inputSchema: z.object({
      layout: z.enum(["centered", "fullscreen", "padded"]),
    }),
  }),

  addArgType: tool({
    description: "Define a control type for a component prop.",
    inputSchema: z.object({
      argType: ArgTypeSchema,
    }),
  }),

  retrieveDocs: tool({
    description: "Search docs for Storybook patterns, CSF3 API, and controls configuration.",
    inputSchema: z.object({
      query: z.string(),
    }),
  }),
};
