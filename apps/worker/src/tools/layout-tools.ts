import { tool } from "ai";
import { z } from "zod";
import { LayoutNodeSchema } from "@ai-builder/schemas";

export const layoutTools = {
  queryLayout: tool({
    description: "Get the current layout tree with all components and their Tailwind classes.",
    inputSchema: z.object({}),
  }),

  addComponent: tool({
    description:
      "Add a new component node to the layout tree. Provide a full LayoutNode object including id (format: {tag}_{6alphanumeric}, e.g. section_abc123), tag, classes, and tag-specific fields (content for text nodes, children/label for containers, etc.).",
    inputSchema: z.object({
      node: LayoutNodeSchema,
      parentId: z.string().nullable().optional().describe("Parent node ID. Null = append to root."),
      afterSiblingId: z
        .string()
        .nullable()
        .optional()
        .describe("Insert after this sibling ID. Null = append."),
    }),
  }),

  removeComponent: tool({
    description: "Remove a component and all its children from the layout tree.",
    inputSchema: z.object({
      nodeId: z.string(),
    }),
  }),

  updateClasses: tool({
    description: "Update Tailwind classes on a component.",
    inputSchema: z.object({
      nodeId: z.string(),
      classes: z.array(z.string()),
      mode: z
        .enum(["replace", "merge", "remove"])
        .describe(
          "replace: set classes exactly; merge: add classes; remove: delete listed classes"
        ),
    }),
  }),

  nestComponent: tool({
    description: "Move a component inside another component in the tree.",
    inputSchema: z.object({
      nodeId: z.string(),
      newParentId: z.string(),
    }),
  }),

  applyTheme: tool({
    description: "Apply a global color and typography theme across the layout.",
    inputSchema: z.object({
      colorScheme: z.string().optional().describe("e.g. 'dark', 'light'"),
      accentColor: z.string().optional().describe("Tailwind color prefix, e.g. 'blue', 'indigo'"),
      fontSize: z.string().optional().describe("Tailwind text size, e.g. 'text-base'"),
      rounded: z.string().optional().describe("Tailwind border-radius, e.g. 'rounded-lg'"),
    }),
  }),

  retrieveDocs: tool({
    description: "Search docs for Tailwind patterns, shadcn components, and ARIA guidelines.",
    inputSchema: z.object({
      query: z.string(),
    }),
  }),
};
