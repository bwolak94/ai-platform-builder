import { tool } from "ai";
import { z } from "zod";

const SelectorSchema = z.object({
  strategy: z
    .enum(["data-testid", "role", "label", "text", "placeholder", "css", "alt-text", "title"])
    .describe("Playwright locator strategy"),
  value: z.string().min(1).describe("Locator value"),
  name: z.string().nullable().describe("Accessible name for role locator"),
});

const TestStepSchema = z.discriminatedUnion("action", [
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
  z.object({ action: z.literal("press"), id: z.string(), key: z.string() }),
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

export const e2eTools = {
  querySpec: tool({
    description:
      "Get the current test spec state as a compact DSL string. Always call before modifying.",
    inputSchema: z.object({}),
  }),

  setFileInfo: tool({
    description:
      "Set the test file metadata: filename (without .spec.ts), description, and base URL.",
    inputSchema: z.object({
      filename: z.string().describe("File name ending in .spec.ts, e.g. 'auth-flow.spec.ts'"),
      description: z.string().nullable().optional(),
      baseUrl: z
        .string()
        .describe("Base URL for navigate steps, no trailing slash, e.g. 'http://localhost:3000'"),
    }),
  }),

  addTestCase: tool({
    description: "Add a new named test case. Optionally include initial steps and tags.",
    inputSchema: z.object({
      id: z.string().describe("Unique ID, e.g. 'tc_abc123'"),
      name: z.string().describe("Human-readable test name, e.g. 'User can log in successfully'"),
      tags: z.array(z.string()).nullable().optional().describe("e.g. ['smoke', 'auth']"),
      beforeEach: z
        .array(TestStepSchema)
        .nullable()
        .optional()
        .describe("Steps that run before each test (setup)"),
      steps: z.array(TestStepSchema).describe("Ordered list of test steps"),
    }),
  }),

  updateTestCase: tool({
    description: "Rename a test case or update its tags.",
    inputSchema: z.object({
      testCaseId: z.string(),
      name: z.string().optional(),
      tags: z.array(z.string()).nullable().optional(),
    }),
  }),

  removeTestCase: tool({
    description: "Remove a test case and all its steps by id.",
    inputSchema: z.object({
      testCaseId: z.string(),
    }),
  }),

  duplicateTestCase: tool({
    description: "Duplicate an existing test case with a new id and optional new name.",
    inputSchema: z.object({
      testCaseId: z.string(),
      newId: z.string(),
      newName: z.string().optional(),
    }),
  }),

  addStep: tool({
    description:
      "Append a step to an existing test case. Use addBeforeEachStep for beforeEach steps.",
    inputSchema: z.object({
      testCaseId: z.string(),
      step: TestStepSchema,
    }),
  }),

  updateStep: tool({
    description: "Replace a step in a test case with a new step definition.",
    inputSchema: z.object({
      testCaseId: z.string(),
      stepId: z.string(),
      step: TestStepSchema,
    }),
  }),

  removeStep: tool({
    description: "Remove a step from a test case by step id.",
    inputSchema: z.object({
      testCaseId: z.string(),
      stepId: z.string(),
    }),
  }),

  reorderSteps: tool({
    description:
      "Reorder steps within a test case by providing the complete new ordered step ID list.",
    inputSchema: z.object({
      testCaseId: z.string(),
      orderedStepIds: z.array(z.string()),
    }),
  }),

  addBeforeEachStep: tool({
    description: "Add a step to the beforeEach block of a test case.",
    inputSchema: z.object({
      testCaseId: z.string(),
      step: TestStepSchema,
    }),
  }),

  reorderTestCases: tool({
    description: "Reorder test cases by providing the complete new ordered list of test case IDs.",
    inputSchema: z.object({
      orderedIds: z.array(z.string()),
    }),
  }),

  createTestFile: tool({
    description: "Create a new test file and make it the active file.",
    inputSchema: z.object({
      id: z.string(),
      filename: z.string().endsWith(".spec.ts"),
      baseUrl: z.string(),
      description: z.string().nullable().optional(),
    }),
  }),

  switchTestFile: tool({
    description: "Switch to a different test file by id.",
    inputSchema: z.object({ fileId: z.string() }),
  }),

  removeTestFile: tool({
    description: "Remove a test file by id. Cannot remove the last file.",
    inputSchema: z.object({ fileId: z.string() }),
  }),

  retrieveDocs: tool({
    description:
      "Search docs for Playwright API, locator strategies, assertion patterns, and best practices.",
    inputSchema: z.object({ query: z.string() }),
  }),
};
