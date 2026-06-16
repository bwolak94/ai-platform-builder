import { tool } from "ai";
import { z } from "zod";

// Flat node schema for tool inputs — avoids z.lazy()/z.discriminatedUnion() which
// produce $defs/$ref JSON Schema structures rejected by Anthropic's tool input validator.
const NodeInputSchema = z.object({
  id: z.string().describe("Unique node ID, format: {tag}_{6alphanumeric}, e.g. section_abc123"),
  tag: z
    .enum([
      "div",
      "section",
      "nav",
      "header",
      "main",
      "footer",
      "article",
      "aside",
      "h1",
      "h2",
      "h3",
      "h4",
      "p",
      "span",
      "img",
      "button",
    ])
    .describe("HTML tag for this node"),
  classes: z.array(z.string()).nullable().optional().describe("Tailwind CSS classes"),
  // Container fields
  label: z.string().nullable().optional().describe("Human label for container nodes"),
  children: z
    .array(z.record(z.string(), z.unknown()))
    .nullable()
    .optional()
    .describe("Child nodes (for container tags: div, section, nav, etc.)"),
  // Leaf fields
  content: z.string().optional().describe("Text content for h1-h4, p, span, button"),
  src: z.string().nullable().optional().describe("Image src (for img tag)"),
  alt: z.string().optional().describe("Image alt text (for img tag)"),
  variant: z
    .enum(["primary", "secondary", "ghost", "danger"])
    .nullable()
    .optional()
    .describe("Button variant (for button tag)"),
});

export const layoutTools = {
  queryLayout: tool({
    description: "Get the current layout tree with all components and their Tailwind classes.",
    inputSchema: z.object({}),
  }),

  addComponent: tool({
    description:
      "Add a new component node to the layout tree. Provide a full node object including id (format: {tag}_{6alphanumeric}, e.g. section_abc123), tag, classes, and tag-specific fields (content for text nodes, children/label for containers, etc.).",
    inputSchema: z.object({
      node: NodeInputSchema,
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

  updateContent: tool({
    description:
      "Update the text content of a text node (h1-h4, p, span, button) or the alt text of an img node. Use this instead of remove+add when only the text needs to change.",
    inputSchema: z.object({
      nodeId: z.string().describe("ID of the node to update"),
      content: z.string().describe("New text content or alt text"),
    }),
  }),

  nestComponent: tool({
    description: "Move a component inside another component in the tree.",
    inputSchema: z.object({
      nodeId: z.string(),
      newParentId: z.string(),
    }),
  }),

  reorderComponents: tool({
    description: "Reorder the children of a container by providing an ordered list of IDs.",
    inputSchema: z.object({
      parentId: z.string().describe("ID of the parent container"),
      orderedIds: z
        .array(z.string())
        .describe("Child IDs in the desired order. Missing IDs are appended at the end."),
    }),
  }),

  duplicateComponent: tool({
    description:
      "Duplicate a component (and all its children) and insert the copy immediately after the original. New IDs are generated automatically.",
    inputSchema: z.object({
      nodeId: z.string().describe("ID of the node to duplicate"),
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
