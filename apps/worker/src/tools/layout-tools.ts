import { tool } from "ai";
import { z } from "zod";

const NODE_ID_REGEX = /^[a-z]+_[a-z0-9]{6}$/;

export const layoutTools = {
  queryLayout: tool({
    description: "Get the current layout tree with all components and their Tailwind classes.",
    parameters: z.object({}),
  }),

  addComponent: tool({
    description: "Add a new component node to the layout tree.",
    parameters: z.object({
      id: z.string().regex(NODE_ID_REGEX, "Must match {tag}_{6alphanumeric}"),
      tag: z.string().describe("HTML tag or component name (e.g., div, section, button)"),
      classes: z.array(z.string()).describe("Tailwind CSS utility classes"),
      text: z.string().nullable().optional().describe("Text content for leaf nodes"),
      parentId: z.string().nullable().optional().describe("Parent node id. Null = root."),
    }),
  }),

  removeComponent: tool({
    description: "Remove a component and all its children from the layout tree.",
    parameters: z.object({
      id: z.string(),
    }),
  }),

  updateClasses: tool({
    description: "Update Tailwind classes on a component.",
    parameters: z.object({
      id: z.string(),
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
    parameters: z.object({
      childId: z.string(),
      newParentId: z.string(),
    }),
  }),

  applyTheme: tool({
    description: "Apply a global color and typography theme across the layout.",
    parameters: z.object({
      primaryColor: z.string().describe("Tailwind color class prefix, e.g. 'blue', 'indigo'"),
      fontFamily: z.string().optional().describe("Tailwind font-family class, e.g. 'font-sans'"),
      borderRadius: z
        .string()
        .optional()
        .describe("Tailwind border-radius class, e.g. 'rounded-lg'"),
    }),
  }),

  retrieveDocs: tool({
    description: "Search docs for Tailwind patterns, shadcn components, and ARIA guidelines.",
    parameters: z.object({
      query: z.string(),
    }),
  }),
};
