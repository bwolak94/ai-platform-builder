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

  suggestSubjectLines: tool({
    description:
      "Generate subject line variants for the current email template. Returns 5 options with emoji variants, personalization tokens, and open-rate rationale for each.",
    inputSchema: z.object({
      count: z
        .number()
        .int()
        .min(3)
        .max(10)
        .default(5)
        .describe("Number of subject line variants to generate"),
      tone: z
        .enum(["professional", "friendly", "urgent", "curiosity", "benefit-focused"])
        .optional()
        .describe("Desired tone for the subject lines"),
    }),
  }),

  addPersonalizationToken: tool({
    description:
      "Register a personalization token (e.g. {{firstName}}, {{company}}) so the preview highlights it and the agent uses it consistently in future content.",
    inputSchema: z.object({
      token: z.string().describe("Token name without braces, e.g. 'firstName'"),
      description: z
        .string()
        .describe("What this token represents, e.g. 'The recipient first name'"),
      exampleValue: z.string().describe("Example value for preview rendering, e.g. 'Alex'"),
    }),
  }),

  auditEmailAccessibility: tool({
    description:
      "Audit the email template for screen reader compatibility: checks alt text on all images, sufficient color contrast, link text quality, and heading order.",
    inputSchema: z.object({}),
  }),

  addLanguageVariant: tool({
    description:
      "Duplicate the current template structure and translate all text content into a target language. Produces a parallel template with identical layout.",
    inputSchema: z.object({
      language: z
        .string()
        .describe("ISO 639-1 language code for the variant, e.g. 'fr', 'de', 'es'"),
      languageLabel: z.string().describe("Human-readable language name, e.g. 'French'"),
    }),
  }),

  createCampaignSequence: tool({
    description:
      "Generate a multi-email drip campaign sequence. Creates separate template stubs for each email in the sequence with consistent branding and escalating CTAs.",
    inputSchema: z.object({
      name: z.string().describe("Campaign name, e.g. 'Onboarding Sequence'"),
      emails: z
        .array(
          z.object({
            dayOffset: z.number().int().min(0).describe("Days after signup to send this email"),
            purpose: z
              .string()
              .describe("One-line description of this email goal, e.g. 'Introduce key feature'"),
          })
        )
        .min(2)
        .max(10)
        .describe("Sequence definition — minimum 2, maximum 10 emails"),
    }),
  }),
  generateABVariant: tool({
    description:
      "Create an A/B test variant of the current email template by duplicating the structure and applying a specified change (different subject, hero copy, or CTA). Returns both variant configs.",
    inputSchema: z.object({
      variantName: z.string().describe("Label for the B variant, e.g. 'urgency-cta'"),
      change: z
        .enum(["subject", "hero-copy", "cta-label", "cta-color"])
        .describe("Which element to vary between A and B"),
      bValue: z.string().describe("The alternate value for the B variant"),
    }),
  }),

  addDynamicBlock: tool({
    description:
      "Add a conditionally shown section to the template: the section renders only when a personalization token matches the specified value (e.g. show upgrade CTA only for free-tier users).",
    inputSchema: z.object({
      conditionToken: z.string().describe("Token name to check, e.g. 'plan'"),
      conditionValue: z.string().describe("Value that triggers the block, e.g. 'free'"),
      section: z
        .object({
          type: z.enum(["hero", "text", "cta"]).describe("Section type to conditionally render"),
          heading: z.string().optional(),
          content: z.string().optional(),
          ctaLabel: z.string().optional(),
          ctaUrl: z.string().optional(),
        })
        .describe("Section content for the conditional block"),
    }),
  }),

  generatePlainText: tool({
    description:
      "Generate a plain-text fallback version of the email template by stripping HTML and preserving the logical content hierarchy. Essential for spam filter compliance.",
    inputSchema: z.object({}),
  }),

  validateCSSCompatibility: tool({
    description:
      "Check all CSS properties used in the template against the Can I Email compatibility table. Returns a list of unsupported properties per email client (Outlook, Gmail, Apple Mail) with fallback suggestions.",
    inputSchema: z.object({}),
  }),

  addSocialProof: tool({
    description:
      "Insert a social proof block (star rating, testimonial quote, or logo strip) into the template at the specified position. Useful for promotional and onboarding emails.",
    inputSchema: z.object({
      variant: z
        .enum(["stars-rating", "testimonial-quote", "logo-strip"])
        .describe("Type of social proof element to add"),
      afterSectionId: z
        .string()
        .nullable()
        .optional()
        .describe("Insert after this section ID. Null = append."),
      quote: z.string().optional().describe("Testimonial quote text (for testimonial-quote)"),
      author: z.string().optional().describe("Attribution name (for testimonial-quote)"),
      rating: z.number().min(1).max(5).optional().describe("Star rating value (for stars-rating)"),
    }),
  }),

  previewDarkMode: tool({
    description:
      "Switch the preview pane to simulate dark-mode email rendering (adds CSS prefers-color-scheme:dark overrides in the preview iframe).",
    inputSchema: z.object({
      enabled: z.boolean().describe("True = enable dark mode preview; false = light mode"),
    }),
  }),

  generateUnsubscribePage: tool({
    description:
      "Generate a minimal unsubscribe confirmation page HTML that can be hosted at the unsubscribeUrl. Includes a one-click confirm button and a re-subscribe link.",
    inputSchema: z.object({
      brandName: z.string().describe("Brand name shown on the page"),
      accentColor: z.string().default("#4F46E5").describe("Hex color for the confirm button"),
    }),
  }),
};
