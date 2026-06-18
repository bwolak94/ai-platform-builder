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

  injectPresetSection: tool({
    description:
      "Insert a complete pre-built page section at a specified position. Faster than building from scratch.",
    inputSchema: z.object({
      preset: z
        .enum([
          "hero-centered",
          "hero-split",
          "features-grid",
          "features-list",
          "testimonials",
          "pricing-three-tier",
          "faq-accordion",
          "team-grid",
          "newsletter-cta",
          "stats-bar",
          "logo-cloud",
          "footer-links",
        ])
        .describe("Preset section type to inject"),
      parentId: z.string().nullable().optional().describe("Parent node ID. Null = append to root."),
      afterSiblingId: z
        .string()
        .nullable()
        .optional()
        .describe("Insert after this sibling. Null = append."),
    }),
  }),

  addDarkModeVariants: tool({
    description:
      "Add dark: variant classes to a component for dark mode support. The preview panel's theme toggle will reflect the changes.",
    inputSchema: z.object({
      nodeId: z.string().describe("ID of the node to add dark mode classes to"),
      darkClasses: z
        .array(z.string())
        .describe("Tailwind dark: classes to add, e.g. ['dark:bg-gray-900', 'dark:text-white']"),
    }),
  }),

  exportPage: tool({
    description:
      "Generate a complete Astro page (.astro) or Next.js page (page.tsx) file from the current layout tree.",
    inputSchema: z.object({
      framework: z.enum(["astro", "nextjs"]).describe("Target framework for the export"),
      pageTitle: z.string().optional().describe("HTML <title> for the page"),
    }),
  }),

  addAnimation: tool({
    description:
      "Add Tailwind animate-* or transition-* classes to a component for entrance animations or hover transitions.",
    inputSchema: z.object({
      nodeId: z.string().describe("ID of the node to animate"),
      animationClasses: z
        .array(z.string())
        .describe(
          "Tailwind animation classes, e.g. ['animate-fade-in', 'transition-transform', 'hover:scale-105']"
        ),
      trigger: z
        .enum(["load", "hover", "focus", "scroll"])
        .optional()
        .describe("When the animation triggers (informational; affects class choice)"),
    }),
  }),

  cloneNode: tool({
    description:
      "Deep copy a node subtree with fresh auto-generated IDs and insert the clone immediately after the original. Use this instead of duplicateComponent when you need to clone into a different parent.",
    inputSchema: z.object({
      nodeId: z.string().describe("ID of the node to clone"),
      targetParentId: z
        .string()
        .nullable()
        .optional()
        .describe("Parent to insert into. Null = same parent as original."),
    }),
  }),

  extractComponent: tool({
    description:
      "Wrap an existing node subtree in a new named container div with a data-component attribute, making it a logical named component block. Useful for documenting reusable sections.",
    inputSchema: z.object({
      nodeId: z.string().describe("ID of the root node to wrap"),
      componentName: z
        .string()
        .describe("PascalCase component name, e.g. 'HeroSection', written into data-component"),
    }),
  }),

  addBreakpointClasses: tool({
    description:
      "Add responsive variant Tailwind classes to a node for one or more breakpoints (sm, md, lg, xl, 2xl).",
    inputSchema: z.object({
      nodeId: z.string().describe("ID of the node to add responsive classes to"),
      breakpoints: z
        .array(
          z.object({
            prefix: z.enum(["sm", "md", "lg", "xl", "2xl"]).describe("Tailwind breakpoint prefix"),
            classes: z.array(z.string()).describe("Classes to apply at this breakpoint"),
          })
        )
        .describe("Breakpoint class definitions"),
    }),
  }),

  setNodeVisibility: tool({
    description:
      "Show or hide a node by adding/removing the Tailwind `hidden` class. Useful for toggling sections without removing them.",
    inputSchema: z.object({
      nodeId: z.string().describe("ID of the node"),
      visible: z.boolean().describe("True = show (remove `hidden`); false = hide (add `hidden`)"),
    }),
  }),

  addGroupPeer: tool({
    description:
      "Add `group` or `peer` Tailwind utility to a parent node and corresponding `group-*` / `peer-*` classes to a child node, enabling CSS-only interactive patterns.",
    inputSchema: z.object({
      parentNodeId: z.string().describe("Node to receive `group` or `peer` class"),
      utility: z.enum(["group", "peer"]).describe("Which Tailwind utility to apply to the parent"),
      childNodeId: z
        .string()
        .describe("Node to receive dependent classes (e.g. group-hover:block)"),
      childClasses: z
        .array(z.string())
        .describe(
          "Dependent classes for the child, e.g. ['group-hover:block', 'group-focus:ring']"
        ),
    }),
  }),

  wrapNode: tool({
    description:
      "Insert a new wrapper container node around an existing node. The existing node becomes the only child of the new wrapper.",
    inputSchema: z.object({
      nodeId: z.string().describe("ID of the node to wrap"),
      wrapper: NodeInputSchema.describe("The new wrapper node (must be a container tag)"),
    }),
  }),

  generateCSSVariables: tool({
    description:
      "Generate a `:root {}` CSS custom properties snippet from the current layout's Tailwind color and typography classes, ready to paste into a global stylesheet or Tailwind config.",
    inputSchema: z.object({}),
  }),

  retrieveDocs: tool({
    description: "Search docs for Tailwind patterns, shadcn components, and ARIA guidelines.",
    inputSchema: z.object({
      query: z.string(),
    }),
  }),
};
