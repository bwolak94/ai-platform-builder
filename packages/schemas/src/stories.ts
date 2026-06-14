import { z } from "zod";

export const ControlTypeSchema = z.enum(["text", "boolean", "select", "number", "color", "object"]);

export const ArgTypeSchema = z.object({
  name: z.string().min(1),
  control: ControlTypeSchema,
  options: z.array(z.string()).nullable(),
  defaultValue: z.string().nullable(),
  description: z.string().nullable(),
});

export const StoryVariantSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  args: z.record(z.string(), z.unknown()),
  viewport: z.enum(["mobile1", "mobile2", "tablet", "desktop"]).nullable(),
  docs: z.string().nullable(),
});

export const StoryFileSchema = z.object({
  id: z.string(),
  componentName: z
    .string()
    .min(1)
    .regex(/^[A-Z][A-Za-z0-9]*$/, "Must be PascalCase"),
  componentPath: z.string().min(1),
  title: z.string().min(1),
  layout: z.enum(["centered", "fullscreen", "padded"]).nullable(),
  defaultArgs: z.record(z.string(), z.unknown()).nullable(),
  argTypes: z.array(ArgTypeSchema).nullable(),
  variants: z.array(StoryVariantSchema),
});

export type ControlType = z.infer<typeof ControlTypeSchema>;
export type ArgType = z.infer<typeof ArgTypeSchema>;
export type StoryVariant = z.infer<typeof StoryVariantSchema>;
export type StoryFile = z.infer<typeof StoryFileSchema>;
