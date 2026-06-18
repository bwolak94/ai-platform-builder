import { z } from "zod";

export const SelectorStrategySchema = z.enum([
  "data-testid",
  "role",
  "label",
  "text",
  "placeholder",
  "css",
  "alt-text",
  "title",
]);

const SelectorSchema = z.object({
  strategy: SelectorStrategySchema,
  value: z.string().min(1),
  name: z.string().nullable(),
});

export const TestStepSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("navigate"), id: z.string(), path: z.string().min(1) }),
  z.object({ action: z.literal("click"), id: z.string(), selector: SelectorSchema }),
  z.object({
    action: z.literal("fill"),
    id: z.string(),
    selector: SelectorSchema,
    value: z.string(),
  }),
  z.object({
    action: z.literal("select"),
    id: z.string(),
    selector: SelectorSchema,
    value: z.string(),
  }),
  z.object({
    action: z.literal("check"),
    id: z.string(),
    selector: SelectorSchema,
    checked: z.boolean(),
  }),
  z.object({ action: z.literal("hover"), id: z.string(), selector: SelectorSchema }),
  z.object({ action: z.literal("press"), id: z.string(), key: z.string().min(1) }),
  z.object({
    action: z.literal("upload"),
    id: z.string(),
    selector: SelectorSchema,
    filePath: z.string(),
  }),
  z.object({
    action: z.literal("scroll"),
    id: z.string(),
    selector: SelectorSchema.nullable(),
    x: z.number().nullable(),
    y: z.number().nullable(),
  }),
  z.object({ action: z.literal("wait"), id: z.string(), ms: z.number().int().min(0) }),
  z.object({ action: z.literal("screenshot"), id: z.string(), name: z.string().nullable() }),
  z.object({ action: z.literal("axe"), id: z.string(), context: z.string().nullable() }),
  z.object({
    action: z.literal("intercept"),
    id: z.string(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    urlPattern: z.string().min(1),
    status: z.number().int().min(100).max(599),
    body: z.record(z.string(), z.unknown()).nullable(),
  }),
  z.object({
    action: z.literal("expect"),
    id: z.string(),
    type: z.enum([
      "visible",
      "hidden",
      "text",
      "url",
      "count",
      "value",
      "attribute",
      "enabled",
      "disabled",
      "checked",
    ]),
    selector: SelectorSchema.nullable(),
    value: z.string().nullable(),
    attribute: z.string().nullable(),
  }),
]);

export const TestCaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  tags: z.array(z.string()).nullable(),
  beforeEach: z.array(TestStepSchema).nullable(),
  steps: z.array(TestStepSchema),
});

export const TestFileSchema = z.object({
  id: z.string(),
  filename: z.string().min(1).endsWith(".spec.ts"),
  baseUrl: z.string().min(1),
  description: z.string().nullable(),
  testCases: z.array(TestCaseSchema),
});

export const TestManagerStateSchema = z.object({
  files: z.array(TestFileSchema).min(1),
  activeFileId: z.string(),
});

export type SelectorStrategy = z.infer<typeof SelectorStrategySchema>;
export type TestStep = z.infer<typeof TestStepSchema>;
export type TestCase = z.infer<typeof TestCaseSchema>;
export type TestFile = z.infer<typeof TestFileSchema>;
export type TestManagerState = z.infer<typeof TestManagerStateSchema>;
