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
    action: z.literal("intercept"),
    id: z.string(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    urlPattern: z.string().describe("URL pattern or glob to intercept, e.g. '**/api/users'"),
    status: z.number().int().min(100).max(599).describe("HTTP status code to respond with"),
    body: z
      .record(z.string(), z.unknown())
      .nullable()
      .describe("JSON response body to return (null for empty body)"),
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

  addNetworkIntercept: tool({
    description:
      "Add a network interception step to a test case. The step uses page.route() to mock an API call and return a fixture response — enabling tests without a real backend.",
    inputSchema: z.object({
      testCaseId: z.string(),
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
      urlPattern: z
        .string()
        .describe("URL pattern to intercept, e.g. '**/api/users' or '/api/products'"),
      status: z.number().int().min(100).max(599).default(200),
      responseBody: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe("JSON body to return. Null = empty body."),
      insertBeforeStepId: z
        .string()
        .nullable()
        .optional()
        .describe("Insert before this step ID. Null = prepend to test case."),
    }),
  }),

  generateCIConfig: tool({
    description:
      "Generate a GitHub Actions workflow YAML that runs Playwright tests in CI. Supports tag-based sharding so smoke/regression/critical subsets run on separate jobs.",
    inputSchema: z.object({
      nodeVersion: z.string().default("20").describe("Node.js version for the CI runner"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Test tags to create separate CI jobs for, e.g. ['smoke', 'regression']"),
      browsers: z
        .array(z.enum(["chromium", "firefox", "webkit"]))
        .default(["chromium"])
        .describe("Browsers to run in CI"),
    }),
  }),

  generateTraceConfig: tool({
    description:
      "Generate a playwright.config.ts snippet with trace recording enabled and instructions for opening the HTML trace report locally with 'npx playwright show-trace'.",
    inputSchema: z.object({
      traceMode: z
        .enum(["on", "on-first-retry", "on-all-retries", "retain-on-failure"])
        .default("on-first-retry")
        .describe("When to record traces"),
    }),
  }),

  addVisualSnapshot: tool({
    description:
      "Add a screenshot comparison step to a test case. Captures a full-page or element-scoped screenshot and compares it against a stored baseline using Playwright's toHaveScreenshot().",
    inputSchema: z.object({
      testCaseId: z.string(),
      snapshotName: z.string().describe("Baseline snapshot filename, e.g. 'homepage.png'"),
      selector: z
        .string()
        .nullable()
        .optional()
        .describe("CSS selector to scope the screenshot. Null = full page."),
      threshold: z
        .number()
        .min(0)
        .max(1)
        .default(0.1)
        .describe("Max allowed pixel difference ratio"),
    }),
  }),

  generatePageObject: tool({
    description:
      "Generate a Page Object Model (POM) TypeScript class from the steps of the active test file. Groups selectors and actions by page, producing a reusable class with typed methods.",
    inputSchema: z.object({
      className: z.string().describe("PascalCase POM class name, e.g. 'LoginPage'"),
      pageUrl: z.string().optional().describe("URL the page object navigates to, e.g. '/login'"),
    }),
  }),

  addAuthSetup: tool({
    description:
      "Add a Playwright storageState-based authentication setup: creates a global setup script that logs in once and saves the session to a file, which all tests reuse to skip re-authentication.",
    inputSchema: z.object({
      loginUrl: z.string().describe("Login page URL, e.g. '/login'"),
      usernameSelector: SelectorSchema.describe("Locator for the username/email input"),
      passwordSelector: SelectorSchema.describe("Locator for the password input"),
      submitSelector: SelectorSchema.describe("Locator for the submit button"),
      storageStatePath: z
        .string()
        .default(".playwright/auth.json")
        .describe("Path to save the authentication state file"),
    }),
  }),

  addAccessibilityTest: tool({
    description:
      "Add a full-page axe-core accessibility scan step to a test case using @axe-core/playwright. Fails the test if any critical or serious violations are found.",
    inputSchema: z.object({
      testCaseId: z.string(),
      context: z
        .string()
        .nullable()
        .optional()
        .describe("CSS selector to scope the axe scan. Null = full page."),
      disabledRules: z
        .array(z.string())
        .optional()
        .describe("Axe rule IDs to disable, e.g. ['color-contrast']"),
    }),
  }),

  addMobileTest: tool({
    description:
      "Duplicate an existing test case and configure it to run in a mobile viewport using Playwright's device emulation (iPhone 14 by default).",
    inputSchema: z.object({
      testCaseId: z.string().describe("ID of the test case to create a mobile variant of"),
      newId: z.string().describe("New unique ID for the mobile test case"),
      device: z
        .string()
        .default("iPhone 14")
        .describe("Playwright device descriptor name from playwright.devices"),
    }),
  }),

  generateFixture: tool({
    description:
      "Generate a Playwright fixtures file (fixtures.ts) that extends the base test object with shared page objects, authenticated page instances, and test data factories.",
    inputSchema: z.object({
      fixtures: z
        .array(
          z.object({
            name: z.string().describe("Fixture name in camelCase, e.g. 'loggedInPage'"),
            type: z
              .enum(["page-object", "auth-page", "mock-data"])
              .describe("Type of fixture to generate"),
          })
        )
        .min(1)
        .describe("List of fixtures to include in the file"),
    }),
  }),

  generateReportConfig: tool({
    description:
      "Add Playwright HTML and JUnit report configuration to playwright.config.ts and return the commands to open the HTML report locally after a test run.",
    inputSchema: z.object({
      outputDir: z
        .string()
        .default("playwright-report")
        .describe("Directory for the HTML report output"),
      includeJUnit: z
        .boolean()
        .default(true)
        .describe("Also add JUnit XML reporter for CI integration"),
    }),
  }),

  retrieveDocs: tool({
    description:
      "Search docs for Playwright API, locator strategies, assertion patterns, and best practices.",
    inputSchema: z.object({ query: z.string() }),
  }),

  generateApiContractTest: tool({
    description:
      "Generate a Playwright API project test file that validates the actual HTTP responses of backend endpoints against an OpenAPI spec snapshot. Checks status codes, required response fields, and content types.",
    inputSchema: z.object({
      baseUrl: z.string().describe("API base URL, e.g. 'http://localhost:3000'"),
      endpoints: z
        .array(
          z.object({
            method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
            path: z.string().describe("Endpoint path, e.g. '/api/users'"),
            expectedStatus: z.number().int().describe("Expected HTTP status code"),
          })
        )
        .min(1)
        .describe("Endpoints to include in the contract test"),
    }),
  }),

  addRetryStrategy: tool({
    description:
      "Add retry configuration to a test case or to the global playwright.config.ts: sets a maximum retry count for flaky tests, with optional exponential backoff between retries.",
    inputSchema: z.object({
      testCaseId: z
        .string()
        .nullable()
        .optional()
        .describe("Test case to add retries to. Null = add to global config."),
      maxRetries: z.number().int().min(1).max(5).default(2).describe("Maximum retry attempts"),
      backoffMs: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Milliseconds to wait between retries (optional)"),
    }),
  }),

  generatePerformanceBudget: tool({
    description:
      "Add a performance budget test case that navigates to a URL, captures Web Vitals (LCP, CLS, FID) using the Performance API, and asserts they are within specified thresholds.",
    inputSchema: z.object({
      url: z.string().describe("URL to run the performance test against"),
      budgets: z
        .object({
          lcp: z.number().positive().optional().describe("Max LCP in milliseconds (default 2500)"),
          cls: z.number().positive().optional().describe("Max CLS score (default 0.1)"),
          fid: z.number().positive().optional().describe("Max FID in milliseconds (default 100)"),
          ttfb: z
            .number()
            .positive()
            .optional()
            .describe("Max Time to First Byte in ms (default 800)"),
        })
        .describe("Performance budget thresholds"),
    }),
  }),

  addMultiUserScenario: tool({
    description:
      "Generate a multi-user test scenario using Playwright's browser context isolation: creates two parallel browser contexts (e.g. admin and regular user) that interact with the same UI simultaneously.",
    inputSchema: z.object({
      name: z.string().describe("Test case name for this multi-user scenario"),
      users: z
        .array(
          z.object({
            role: z.string().describe("User role label, e.g. 'admin' or 'viewer'"),
            storageStatePath: z
              .string()
              .optional()
              .describe("Path to saved auth state for this user"),
          })
        )
        .min(2)
        .max(4)
        .describe("User contexts to create (2–4 users)"),
    }),
  }),

  convertCypressToPlaywright: tool({
    description:
      "Convert a Cypress test file (as text input) to a Playwright spec. Translates cy.visit, cy.get, cy.contains, cy.type, cy.click, cy.should assertions, and Cypress fixtures to their Playwright equivalents.",
    inputSchema: z.object({
      cypressSource: z.string().describe("Full Cypress test file source code to convert"),
    }),
  }),
};
