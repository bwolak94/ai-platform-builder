// Flat section input schema — avoids z.discriminatedUnion() which produces
// $defs/$ref JSON Schema structures rejected by Anthropic's tool input validator.
import { tool } from "ai";
import { z } from "zod";

const SECTION_TYPES = ["header", "hero", "text", "cta", "footer", "columns"] as const;

const SYSTEM_FONTS = [
  "Arial",
  "Georgia",
  "Helvetica",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
] as const;

// Flat schema: all fields for all section types in one object.
// The "type" field determines which fields are required.
const FlatSectionSchema = z.object({
  id: z.string().describe("Unique section ID, format: sec_{6alphanumeric}, e.g. sec_abc123"),
  type: z
    .enum(SECTION_TYPES)
    .describe(
      "Section type. Required fields per type:\n" +
        "  header: title? logoUrl? logoAlt?\n" +
        "  hero: heading (required), subheading? imageUrl?\n" +
        "  text: content (required), fontFamily?\n" +
        "  cta: ctaLabel (required), ctaUrl (required), ctaBgColor? ctaTextColor? ctaText?\n" +
        "  footer: companyName? address? unsubscribeUrl?\n" +
        "  columns: columns (required, 2–3 items)"
    ),
  bgColor: z.string().nullable().optional().describe("Section background hex color, e.g. #F9FAFB"),
  // header
  logoUrl: z.string().nullable().optional().describe("Logo image URL (header only)"),
  logoAlt: z.string().nullable().optional().describe("Logo alt text (header only)"),
  title: z.string().nullable().optional().describe("Brand name shown in header (header only)"),
  // hero
  heading: z.string().optional().describe("Main headline — required for hero sections"),
  subheading: z.string().nullable().optional().describe("Subheading text (hero only)"),
  imageUrl: z.string().nullable().optional().describe("Hero image URL (hero only)"),
  // text
  content: z.string().optional().describe("Body copy — required for text sections"),
  fontFamily: z.enum(SYSTEM_FONTS).nullable().optional().describe("Email-safe font (text only)"),
  // cta
  ctaLabel: z.string().optional().describe("Button label — required for CTA sections"),
  ctaUrl: z.string().optional().describe("Button href — required for CTA sections"),
  ctaBgColor: z.string().nullable().optional().describe("Button background hex color (CTA only)"),
  ctaTextColor: z.string().nullable().optional().describe("Button text hex color (CTA only)"),
  ctaText: z.string().nullable().optional().describe("Text paragraph above the CTA button"),
  // footer
  companyName: z.string().nullable().optional().describe("Company name in footer"),
  address: z.string().nullable().optional().describe("Physical address in footer (CAN-SPAM)"),
  unsubscribeUrl: z
    .string()
    .nullable()
    .optional()
    .describe("Unsubscribe link — required for marketing emails"),
  // columns
  columns: z
    .array(
      z.object({
        heading: z.string().nullable().optional(),
        body: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
        ctaLabel: z.string().nullable().optional(),
        ctaUrl: z.string().nullable().optional(),
        ctaBgColor: z.string().nullable().optional(),
      })
    )
    .optional()
    .describe("Column definitions — required for columns sections (2–3 items)"),
});

// Partial version for updates
const FlatSectionUpdateSchema = FlatSectionSchema.omit({ id: true, type: true }).partial();

const PresetNameSchema = z.enum([
  "welcome",
  "password-reset",
  "order-confirmation",
  "newsletter",
  "promotional",
]);

export const emailTools = {
  queryTemplate: tool({
    description:
      "Get the current email template state as a compact DSL. ALWAYS call this first before any modification so you know the current section IDs.",
    inputSchema: z.object({}),
  }),

  addSection: tool({
    description:
      "Add a new section to the email template. Provide a flat section object with type-specific fields. The section is appended at the end by default, or inserted after afterSectionId.",
    inputSchema: z.object({
      section: FlatSectionSchema,
      afterSectionId: z
        .string()
        .nullable()
        .optional()
        .describe("Insert after this section ID. Null = append at end."),
    }),
  }),

  updateSection: tool({
    description:
      "Update one or more fields of an existing section. Only the specified fields are changed; others remain unchanged.",
    inputSchema: z.object({
      id: z.string().describe("ID of the section to update"),
      updates: FlatSectionUpdateSchema,
    }),
  }),

  removeSection: tool({
    description: "Remove a section from the template by its id.",
    inputSchema: z.object({
      id: z.string().describe("ID of the section to remove"),
    }),
  }),

  duplicateSection: tool({
    description:
      "Duplicate a section and insert the copy immediately after the original. A new unique ID is generated for the copy.",
    inputSchema: z.object({
      id: z.string().describe("ID of the section to duplicate"),
    }),
  }),

  reorderSections: tool({
    description:
      "Reorder all sections by providing the complete list of section IDs in the desired order.",
    inputSchema: z.object({
      orderedIds: z.array(z.string()).describe("All section IDs in the new order"),
    }),
  }),

  updateMetadata: tool({
    description:
      "Update the email template metadata: subject line, preview text, or email type. Call this when the user wants to rename the email or change its type.",
    inputSchema: z.object({
      subject: z.string().max(60).optional().describe("Email subject line (max 60 chars)"),
      previewText: z
        .string()
        .nullable()
        .optional()
        .describe("Preview text shown in inbox (< 140 chars)"),
      type: z.enum(["transactional", "marketing", "notification"]).optional(),
    }),
  }),

  previewInClient: tool({
    description: "Switch the email preview pane to simulate a specific email client viewport.",
    inputSchema: z.object({
      client: z
        .enum(["desktop", "mobile", "outlook", "dark"])
        .describe(
          "desktop=full width, mobile=375px, outlook=600px table layout, dark=dark mode simulation"
        ),
    }),
  }),

  checkSpam: tool({
    description:
      "Analyze the current email template for spam triggers and deliverability issues. Returns a score (0–100, lower is better) and a list of issues to fix.",
    inputSchema: z.object({}),
  }),

  loadPreset: tool({
    description:
      "Load a preset email template, replacing the current sections. Use when the user asks to 'start from a template' or 'use the welcome email template'.",
    inputSchema: z.object({
      name: PresetNameSchema.describe(
        "Preset name: welcome | password-reset | order-confirmation | newsletter | promotional"
      ),
    }),
  }),
};
