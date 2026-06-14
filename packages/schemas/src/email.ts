import { z } from "zod";

export const HexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g. #FFFFFF)");

export const SystemFontSchema = z.enum([
  "Arial",
  "Georgia",
  "Helvetica",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
]);

export const EmailCtaSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  bgColor: HexColorSchema.nullable(),
  textColor: HexColorSchema.nullable(),
});

const baseSectionFields = {
  id: z.string(),
  bgColor: HexColorSchema.nullable(),
};

export const EmailSectionSchema = z.discriminatedUnion("type", [
  z.object({
    ...baseSectionFields,
    type: z.literal("header"),
    logoUrl: z.string().nullable(),
    logoAlt: z.string().nullable(),
    title: z.string().nullable(),
  }),
  z.object({
    ...baseSectionFields,
    type: z.literal("hero"),
    heading: z.string().min(1),
    subheading: z.string().nullable(),
    imageUrl: z.string().nullable(),
  }),
  z.object({
    ...baseSectionFields,
    type: z.literal("text"),
    content: z.string().min(1),
    fontFamily: SystemFontSchema.nullable(),
  }),
  z.object({
    ...baseSectionFields,
    type: z.literal("cta"),
    cta: EmailCtaSchema,
    text: z.string().nullable(),
  }),
  z.object({
    ...baseSectionFields,
    type: z.literal("footer"),
    companyName: z.string().nullable(),
    address: z.string().nullable(),
    unsubscribeUrl: z.string().nullable(),
  }),
]);

export const EmailTemplateSchema = z.object({
  id: z.string(),
  subject: z.string().min(1),
  previewText: z.string().nullable(),
  type: z.enum(["transactional", "marketing", "notification"]),
  sections: z.array(EmailSectionSchema),
});

export type HexColor = z.infer<typeof HexColorSchema>;
export type SystemFont = z.infer<typeof SystemFontSchema>;
export type EmailCta = z.infer<typeof EmailCtaSchema>;
export type EmailSection = z.infer<typeof EmailSectionSchema>;
export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;
