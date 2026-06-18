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
    description:
      "Get the current active story file state including component info and all variants.",
    inputSchema: z.object({}),
  }),

  setComponent: tool({
    description: "Set the component being documented (name and import path).",
    inputSchema: z.object({
      componentName: z.string().describe("PascalCase component name, e.g. 'Button'"),
      componentPath: z
        .string()
        .describe("Relative import path, e.g. './Button' or 'src/components/Button'"),
      title: z.string().optional().describe("Storybook sidebar title, e.g. 'Components/Button'"),
    }),
  }),

  addVariant: tool({
    description: "Add a named story variant (named export in CSF3 format).",
    inputSchema: z.object({
      name: z.string().describe("PascalCase variant name, e.g. 'Primary', 'Disabled'"),
      args: z.record(z.string(), z.unknown()).describe("Component props for this variant"),
      viewport: z
        .enum(["mobile1", "mobile2", "tablet", "desktop"])
        .optional()
        .describe("Viewport preset for this variant"),
      docs: z.string().optional().describe("Short description shown as a comment in the story"),
      parameters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Storybook parameters override (e.g. backgrounds, layout)"),
    }),
  }),

  updateVariant: tool({
    description: "Update args, docs, viewport, or parameters for an existing variant.",
    inputSchema: z.object({
      name: z.string().describe("Exact variant name to update"),
      args: z.record(z.string(), z.unknown()).optional(),
      docs: z.string().optional(),
      viewport: z.enum(["mobile1", "mobile2", "tablet", "desktop"]).optional(),
      parameters: z.record(z.string(), z.unknown()).optional(),
    }),
  }),

  removeVariant: tool({
    description: "Remove a story variant by name.",
    inputSchema: z.object({
      name: z.string().describe("Exact variant name to remove"),
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

  addDecorator: tool({
    description: "Add a decorator to the story file Meta (e.g. a provider wrapper).",
    inputSchema: z.object({
      decorator: z
        .string()
        .describe(
          "JSX arrow function string, e.g. '(Story) => <ThemeProvider><Story /></ThemeProvider>'"
        ),
    }),
  }),

  addTag: tool({
    description: "Add a tag to the story file (e.g. 'autodocs', 'test').",
    inputSchema: z.object({
      tag: z.string().describe("Tag string, e.g. 'autodocs'"),
    }),
  }),

  createStoryFile: tool({
    description: "Create a new story file for a different component (enables multi-file workflow).",
    inputSchema: z.object({
      componentName: z.string().describe("PascalCase component name"),
      componentPath: z.string().describe("Relative import path"),
      title: z.string().optional().describe("Storybook sidebar title"),
    }),
  }),

  switchStoryFile: tool({
    description: "Switch the active story file by component name.",
    inputSchema: z.object({
      componentName: z.string().describe("PascalCase component name of the file to switch to"),
    }),
  }),

  removeStoryFile: tool({
    description: "Remove a story file by component name (cannot remove the last file).",
    inputSchema: z.object({
      componentName: z.string().describe("PascalCase component name of the file to remove"),
    }),
  }),

  addPlayFunction: tool({
    description:
      "Add a play function to a story variant to define interaction tests using @storybook/test userEvent and expect. The play function runs after the story renders.",
    inputSchema: z.object({
      variantName: z.string().describe("Exact PascalCase variant name to add the play function to"),
      steps: z
        .array(
          z.object({
            description: z
              .string()
              .describe("Human description of the step, e.g. 'Click submit button'"),
            code: z
              .string()
              .describe(
                "Play function step code string using userEvent/expect, e.g. \"await userEvent.click(canvas.getByRole('button'))\""
              ),
          })
        )
        .describe("Ordered list of play function steps"),
    }),
  }),

  addMSWDecorator: tool({
    description:
      "Add a Mock Service Worker (msw) decorator to the story file or a specific variant. Provides mock API responses for network calls made inside the component.",
    inputSchema: z.object({
      variantName: z
        .string()
        .nullable()
        .optional()
        .describe("Variant to scope the decorator to. Null = add to Meta (all variants)."),
      handlers: z
        .array(
          z.object({
            method: z.enum(["get", "post", "put", "patch", "delete"]),
            url: z.string().describe("URL pattern to mock, e.g. '/api/users'"),
            status: z.number().int().default(200),
            response: z.record(z.string(), z.unknown()).describe("JSON response body"),
          })
        )
        .describe("MSW request handlers"),
    }),
  }),

  inferStoriesFromInterface: tool({
    description:
      "Given a TypeScript interface definition, infer argTypes and generate story variants for each prop combination. Used when the user pastes a component interface.",
    inputSchema: z.object({
      interfaceSource: z.string().describe("TypeScript interface or type source code to parse"),
    }),
  }),

  generateDesignTokenStory: tool({
    description:
      "Generate a design token showcase story file with Color Palette, Typography Scale, and Spacing Scale stories. Useful for documenting a design system.",
    inputSchema: z.object({
      title: z
        .string()
        .default("Design System/Tokens")
        .describe("Storybook sidebar title for the token showcase"),
    }),
  }),

  retrieveDocs: tool({
    description:
      "Search docs for Storybook patterns, CSF3 API, controls configuration, and decorators.",
    inputSchema: z.object({
      query: z.string(),
    }),
  }),
};
