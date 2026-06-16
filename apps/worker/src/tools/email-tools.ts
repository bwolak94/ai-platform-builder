import { tool } from "ai";
import { z } from "zod";

const SECTION_TYPES = ["header", "hero", "text", "cta", "footer"] as const;

const SectionPropsSchema = z.object({
  // header
  logoUrl: z.string().nullable().optional(),
  logoAlt: z.string().nullable().optional(),
  navLinks: z
    .array(z.object({ label: z.string(), url: z.string() }))
    .nullable()
    .optional(),

  // hero
  headline: z.string().nullable().optional(),
  subheading: z.string().nullable().optional(),
  backgroundColor: z.string().nullable().optional().describe("Hex color code"),

  // text
  content: z.string().nullable().optional(),

  // cta
  label: z.string().nullable().optional().describe("Action verb button label"),
  url: z.string().nullable().optional(),
  buttonColor: z.string().nullable().optional().describe("Hex color code"),

  // footer
  companyName: z.string().nullable().optional(),
  unsubscribeUrl: z.string().nullable().optional(),
});

export const emailTools = {
  queryTemplate: tool({
    description: "Get the current email template state including all sections.",
    inputSchema: z.object({}),
  }),

  addSection: tool({
    description: "Add a new section to the email template.",
    inputSchema: z.object({
      id: z.string().describe("Unique section identifier"),
      type: z.enum(SECTION_TYPES),
      props: SectionPropsSchema,
      afterSectionId: z
        .string()
        .nullable()
        .optional()
        .describe("Insert after this section. Null = append."),
    }),
  }),

  updateSection: tool({
    description: "Update properties of an existing section (partial update).",
    inputSchema: z.object({
      id: z.string(),
      updates: SectionPropsSchema,
    }),
  }),

  removeSection: tool({
    description: "Remove a section from the email template by its id.",
    inputSchema: z.object({
      id: z.string(),
    }),
  }),

  reorderSections: tool({
    description: "Reorder sections by providing the complete new ordered list of section IDs.",
    inputSchema: z.object({
      orderedIds: z.array(z.string()),
    }),
  }),

  previewInClient: tool({
    description: "Switch the email preview to a specific email client simulation.",
    inputSchema: z.object({
      client: z.enum(["gmail", "outlook", "apple"]),
    }),
  }),

  retrieveDocs: tool({
    description: "Search docs for email HTML best practices and email client compatibility.",
    inputSchema: z.object({
      query: z.string(),
    }),
  }),
};
