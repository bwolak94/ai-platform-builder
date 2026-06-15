import { tool } from "ai";
import { z } from "zod";

const STEP_ACTIONS = [
  "navigate",
  "click",
  "fill",
  "assert_text",
  "assert_visible",
  "assert_url",
  "screenshot",
  "wait",
] as const;

const StepSchema = z.object({
  id: z.string(),
  action: z.enum(STEP_ACTIONS),
  selector: z.string().optional().describe("Playwright locator string"),
  value: z.string().optional().describe("URL for navigate, text for fill/assert"),
  name: z.string().optional().describe("Screenshot name"),
});

export const e2eTools = {
  querySpec: tool({
    description: "Get the current test spec state including all test cases and steps.",
    parameters: z.object({}),
  }),

  setFileInfo: tool({
    description: "Set the test file metadata: filename, description, and base URL.",
    parameters: z.object({
      fileName: z.string().describe("File name without extension, e.g. 'auth-flow'"),
      description: z.string().optional(),
      baseUrl: z.string().describe("Base URL for navigate steps, no trailing slash"),
    }),
  }),

  addTestCase: tool({
    description: "Add a new test case (describe block) with an initial empty step list.",
    parameters: z.object({
      id: z.string(),
      name: z.string().describe("Human-readable test case name, e.g. 'User can log in'"),
      description: z.string().optional(),
    }),
  }),

  removeTestCase: tool({
    description: "Remove a test case and all its steps by id.",
    parameters: z.object({
      id: z.string(),
    }),
  }),

  addStep: tool({
    description: "Add a step to an existing test case.",
    parameters: z.object({
      testCaseId: z.string(),
      step: StepSchema,
    }),
  }),

  removeStep: tool({
    description: "Remove a step from a test case by step id.",
    parameters: z.object({
      testCaseId: z.string(),
      stepId: z.string(),
    }),
  }),

  reorderTestCases: tool({
    description: "Reorder test cases by providing the complete new ordered list of test case IDs.",
    parameters: z.object({
      orderedIds: z.array(z.string()),
    }),
  }),

  retrieveDocs: tool({
    description: "Search docs for Playwright API, locator strategies, and assertion patterns.",
    parameters: z.object({
      query: z.string(),
    }),
  }),
};
