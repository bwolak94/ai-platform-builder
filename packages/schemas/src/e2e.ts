import { z } from "zod";

export const SelectorStrategySchema = z.enum([
  "data-testid",
  "role",
  "label",
  "text",
  "placeholder",
  "css",
]);

const SelectorSchema = z.object({
  strategy: SelectorStrategySchema,
  value: z.string().min(1),
  name: z.string().nullable(),
});

export const TestStepSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("navigate"),
    path: z.string().min(1),
  }),
  z.object({
    action: z.literal("click"),
    selector: SelectorSchema,
  }),
  z.object({
    action: z.literal("fill"),
    selector: SelectorSchema,
    value: z.string(),
  }),
  z.object({
    action: z.literal("select"),
    selector: SelectorSchema,
    value: z.string(),
  }),
  z.object({
    action: z.literal("check"),
    selector: SelectorSchema,
    checked: z.boolean(),
  }),
  z.object({
    action: z.literal("wait"),
    ms: z.number().int().min(0),
  }),
  z.object({
    action: z.literal("screenshot"),
    name: z.string().nullable(),
  }),
  z.object({
    action: z.literal("expect"),
    type: z.enum(["visible", "hidden", "text", "url", "count"]),
    selector: SelectorSchema.nullable(),
    value: z.string().nullable(),
  }),
]);

export const TestCaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  tags: z.array(z.string()).nullable(),
  steps: z.array(TestStepSchema),
});

export const TestFileSchema = z.object({
  id: z.string(),
  filename: z.string().min(1).endsWith(".spec.ts"),
  baseUrl: z.string().min(1),
  description: z.string().nullable(),
  testCases: z.array(TestCaseSchema),
});

export type SelectorStrategy = z.infer<typeof SelectorStrategySchema>;
export type TestStep = z.infer<typeof TestStepSchema>;
export type TestCase = z.infer<typeof TestCaseSchema>;
export type TestFile = z.infer<typeof TestFileSchema>;
