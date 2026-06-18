// DSL format:
// FILE: contact-form.spec.ts | url:http://localhost:3000
// DESCRIBE: Contact Form
//
// TEST: Happy path [critical,happy-path]
//   NAVIGATE /contact
//   FILL [label="Your name"] → "John Doe"
//   CLICK [role=button, name="Submit"]
//   EXPECT url CONTAINS /success

import { nanoid } from "nanoid";
import type { TestFile, TestCase, TestStep, TestManagerState } from "@ai-builder/schemas";

// ─── Serialize ────────────────────────────────────────────────────────────────

function serializeStep(step: TestStep): string {
  switch (step.action) {
    case "navigate":
      return "  NAVIGATE " + step.path;
    case "click":
      return "  CLICK [" + step.selector.strategy + '="' + step.selector.value + '"]';
    case "fill":
      return (
        "  FILL [" +
        step.selector.strategy +
        '="' +
        step.selector.value +
        '"] \u2192 "' +
        step.value +
        '"'
      );
    case "select":
      return (
        "  SELECT [" +
        step.selector.strategy +
        '="' +
        step.selector.value +
        '"] \u2192 "' +
        step.value +
        '"'
      );
    case "check":
      return (
        "  CHECK [" +
        step.selector.strategy +
        '="' +
        step.selector.value +
        '"] ' +
        String(step.checked)
      );
    case "hover":
      return "  HOVER [" + step.selector.strategy + '="' + step.selector.value + '"]';
    case "press":
      return '  PRESS "' + step.key + '"';
    case "upload":
      return (
        "  UPLOAD [" +
        step.selector.strategy +
        '="' +
        step.selector.value +
        '"] \u2192 "' +
        step.filePath +
        '"'
      );
    case "scroll":
      if (step.selector) {
        return "  SCROLL [" + step.selector.strategy + '="' + step.selector.value + '"]';
      }
      return "  SCROLL " + String(step.x ?? 0) + "," + String(step.y ?? 0);
    case "wait":
      return "  WAIT " + String(step.ms) + "ms";
    case "screenshot":
      return "  SCREENSHOT" + (step.name ? ' "' + step.name + '"' : "");
    case "axe":
      return "  AXE" + (step.context ? ' "' + step.context + '"' : "");
    case "expect":
      if (step.selector) {
        return (
          "  EXPECT [" +
          step.selector.strategy +
          '="' +
          step.selector.value +
          '"] ' +
          step.type +
          (step.attribute ? ' attr="' + step.attribute + '"' : "") +
          (step.value ? ' "' + step.value + '"' : "")
        );
      }
      return (
        "  EXPECT " +
        step.type +
        (step.attribute ? ' attr="' + step.attribute + '"' : "") +
        (step.value ? ' "' + step.value + '"' : "")
      );
  }
}

function serializeTestCase(tc: TestCase): string {
  const tags = tc.tags?.length ? " [" + tc.tags.join(",") + "]" : "";
  const beforeEachLines = tc.beforeEach?.length
    ? "  BEFORE_EACH:\n" + tc.beforeEach.map(serializeStep).join("\n") + "\n"
    : "";
  const steps = tc.steps.map(serializeStep).join("\n");
  return "TEST: " + tc.name + tags + "\n" + beforeEachLines + steps;
}

export function serializeE2eDSL(file: TestFile): string {
  const header = "FILE: " + file.filename + " | url:" + file.baseUrl;
  const describe = "DESCRIBE: " + (file.description ?? file.filename.replace(".spec.ts", ""));
  const tests = file.testCases.map(serializeTestCase).join("\n\n");
  return [header, describe, "", tests].join("\n");
}

// ─── Deserialize ─────────────────────────────────────────────────────────────

export function deserializeE2eDSL(dsl: string): TestFile {
  const lines = dsl.split("\n");
  const firstLine = lines[0] ?? "";

  const filenameMatch = /FILE:\s*([^\s|]+)/.exec(firstLine);
  const urlMatch = /url:(\S+)/.exec(firstLine);

  const testCases: TestCase[] = [];
  let currentCase: TestCase | null = null;
  let description: string | null = null;

  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("DESCRIBE:")) {
      description = trimmed.slice(9).trim();
      continue;
    }

    if (trimmed.startsWith("TEST:")) {
      if (currentCase) testCases.push(currentCase);
      const nameMatch = /TEST:\s*([^[]+)/.exec(trimmed);
      const tagsMatch = /\[([^\]]+)\]/.exec(trimmed);
      currentCase = {
        id: "tc_" + nanoid(6),
        name: nameMatch?.[1]?.trim() ?? "Test",
        tags: tagsMatch?.[1]?.split(",").map((t) => t.trim()) ?? null,
        beforeEach: null,
        steps: [],
      };
      continue;
    }

    if (!currentCase) continue;

    // Parse steps
    const step = parseStep(trimmed);
    if (step) currentCase.steps.push(step);
  }

  if (currentCase) testCases.push(currentCase);

  return {
    id: "e2e_" + nanoid(6),
    filename: filenameMatch?.[1] ?? "test.spec.ts",
    baseUrl: urlMatch?.[1] ?? "http://localhost:3000",
    description,
    testCases,
  };
}

function parseSelector(str: string) {
  const strategyMatch = /\[(\w[\w-]*)="([^"]+)"\]/.exec(str);
  if (!strategyMatch) return null;
  return {
    strategy: strategyMatch[1] as TestStep extends { selector: infer S }
      ? S extends { strategy: infer T }
        ? T
        : never
      : never,
    value: strategyMatch[2] ?? "",
    name: null,
  };
}

function parseStep(line: string): TestStep | null {
  const id = "step_" + nanoid(6);
  if (line.startsWith("NAVIGATE ")) {
    return { action: "navigate", id, path: line.slice(9).trim() };
  }
  if (line.startsWith("CLICK ")) {
    const sel = parseSelector(line);
    if (!sel) return null;
    return { action: "click", id, selector: sel };
  }
  if (line.startsWith("FILL ")) {
    const sel = parseSelector(line);
    const valueMatch = /[→>]\s*"([^"]*)"/.exec(line);
    if (!sel) return null;
    return { action: "fill", id, selector: sel, value: valueMatch?.[1] ?? "" };
  }
  if (line.startsWith("SELECT ")) {
    const sel = parseSelector(line);
    const valueMatch = /[→>]\s*"([^"]*)"/.exec(line);
    if (!sel) return null;
    return { action: "select", id, selector: sel, value: valueMatch?.[1] ?? "" };
  }
  if (line.startsWith("CHECK ")) {
    const sel = parseSelector(line);
    const checked = !line.includes("false");
    if (!sel) return null;
    return { action: "check", id, selector: sel, checked };
  }
  if (line.startsWith("HOVER ")) {
    const sel = parseSelector(line);
    if (!sel) return null;
    return { action: "hover", id, selector: sel };
  }
  if (line.startsWith("PRESS ")) {
    const keyMatch = /"([^"]+)"/.exec(line);
    return { action: "press", id, key: keyMatch?.[1] ?? "Enter" };
  }
  if (line.startsWith("UPLOAD ")) {
    const sel = parseSelector(line);
    const valueMatch = /[→>]\s*"([^"]*)"/.exec(line);
    if (!sel) return null;
    return { action: "upload", id, selector: sel, filePath: valueMatch?.[1] ?? "" };
  }
  if (line.startsWith("SCROLL ")) {
    const sel = parseSelector(line);
    if (sel) return { action: "scroll", id, selector: sel, x: null, y: null };
    const coordMatch = /(\d+),(\d+)/.exec(line);
    return {
      action: "scroll",
      id,
      selector: null,
      x: coordMatch ? parseInt(coordMatch[1] ?? "0", 10) : null,
      y: coordMatch ? parseInt(coordMatch[2] ?? "0", 10) : null,
    };
  }
  if (line.startsWith("WAIT ")) {
    const ms = parseInt(/(\d+)ms/.exec(line)?.[1] ?? "0", 10);
    return { action: "wait", id, ms };
  }
  if (line.startsWith("SCREENSHOT")) {
    const nameMatch = /"([^"]+)"/.exec(line);
    return { action: "screenshot", id, name: nameMatch?.[1] ?? null };
  }
  if (line.startsWith("AXE")) {
    const ctxMatch = /"([^"]+)"/.exec(line);
    return { action: "axe", id, context: ctxMatch?.[1] ?? null };
  }
  if (line.startsWith("EXPECT ")) {
    const rest = line.slice(7);
    const sel = parseSelector(rest);
    const typeMatch =
      /(visible|hidden|text|url|count|value|attribute|enabled|disabled|checked)/.exec(rest);
    const attrMatch = /attr="([^"]+)"/.exec(rest);
    const valueMatch = sel
      ? /\]\s+\w+(?:\s+attr="[^"]*")?\s+"([^"]+)"/.exec(rest)
      : /"([^"]+)"/.exec(rest);
    return {
      action: "expect",
      id,
      type: (typeMatch?.[1] ?? "visible") as
        | "visible"
        | "hidden"
        | "text"
        | "url"
        | "count"
        | "value"
        | "attribute"
        | "enabled"
        | "disabled"
        | "checked",
      selector: sel,
      value: valueMatch?.[1] ?? null,
      attribute: attrMatch?.[1] ?? null,
    };
  }
  return null;
}

// ─── Playwright .spec.ts generation ──────────────────────────────────────────

function selectorToPlaywright(sel: {
  strategy: string;
  value: string;
  name: string | null;
}): string {
  switch (sel.strategy) {
    case "data-testid":
      return 'page.getByTestId("' + sel.value + '")';
    case "role":
      return (
        'page.getByRole("' +
        sel.value +
        '"' +
        (sel.name ? ', { name: "' + sel.name + '" }' : "") +
        ")"
      );
    case "label":
      return 'page.getByLabel("' + sel.value + '")';
    case "text":
      return 'page.getByText("' + sel.value + '")';
    case "placeholder":
      return 'page.getByPlaceholder("' + sel.value + '")';
    case "alt-text":
      return 'page.getByAltText("' + sel.value + '")';
    case "title":
      return 'page.getByTitle("' + sel.value + '")';
    case "css":
      return 'page.locator("' + sel.value + '")';
    default:
      return 'page.locator("' + sel.value + '")';
  }
}

function stepToPlaywright(step: TestStep): string {
  switch (step.action) {
    case "navigate":
      // Relative path — baseURL is set via test.use({ baseURL }) in the file
      return '  await page.goto("' + step.path + '");';
    case "click":
      return "  await " + selectorToPlaywright(step.selector) + ".click();";
    case "fill":
      return "  await " + selectorToPlaywright(step.selector) + '.fill("' + step.value + '");';
    case "select":
      return (
        "  await " + selectorToPlaywright(step.selector) + '.selectOption("' + step.value + '");'
      );
    case "check":
      return (
        "  await " +
        selectorToPlaywright(step.selector) +
        (step.checked ? ".check();" : ".uncheck();")
      );
    case "hover":
      return "  await " + selectorToPlaywright(step.selector) + ".hover();";
    case "press":
      return '  await page.keyboard.press("' + step.key + '");';
    case "upload":
      return (
        "  await " +
        selectorToPlaywright(step.selector) +
        '.setInputFiles("' +
        step.filePath +
        '");'
      );
    case "scroll":
      if (step.selector) {
        return "  await " + selectorToPlaywright(step.selector) + ".scrollIntoViewIfNeeded();";
      }
      return (
        "  await page.evaluate(() => window.scrollTo(" +
        String(step.x ?? 0) +
        ", " +
        String(step.y ?? 0) +
        "));"
      );
    case "wait":
      return (
        '  await page.locator("body").waitFor({ timeout: ' +
        String(step.ms) +
        " });\n" +
        "  // Note: prefer locator waits over fixed timeouts"
      );
    case "screenshot":
      return (
        "  await page.screenshot(" + (step.name ? '{ path: "' + step.name + '.png" }' : "") + ");"
      );
    case "axe":
      return (
        "  await injectAxe(page);\n" +
        "  await checkA11y(" +
        (step.context ? 'page, "' + step.context + '"' : "page") +
        ");"
      );
    case "expect": {
      if (step.type === "url")
        return '  await expect(page).toHaveURL(new RegExp("' + (step.value ?? "") + '"));';
      if (!step.selector) return "  // expect " + step.type;
      const loc = selectorToPlaywright(step.selector);
      if (step.type === "visible") return "  await expect(" + loc + ").toBeVisible();";
      if (step.type === "hidden") return "  await expect(" + loc + ").toBeHidden();";
      if (step.type === "text")
        return "  await expect(" + loc + ').toHaveText("' + (step.value ?? "") + '");';
      if (step.type === "value")
        return "  await expect(" + loc + ').toHaveValue("' + (step.value ?? "") + '");';
      if (step.type === "count")
        return "  await expect(" + loc + ").toHaveCount(" + (step.value ?? "1") + ");";
      if (step.type === "attribute")
        return (
          "  await expect(" +
          loc +
          ').toHaveAttribute("' +
          (step.attribute ?? "") +
          '", "' +
          (step.value ?? "") +
          '");'
        );
      if (step.type === "enabled") return "  await expect(" + loc + ").toBeEnabled();";
      if (step.type === "disabled") return "  await expect(" + loc + ").toBeDisabled();";
      return "  await expect(" + loc + ").toBeChecked();";
    }
  }
}

function hasAxeStep(steps: TestStep[]): boolean {
  return steps.some((s) => s.action === "axe");
}

export function generatePlaywrightSpec(file: TestFile): string {
  const needsAxe =
    file.testCases.some((tc) => hasAxeStep(tc.steps)) ||
    file.testCases.some((tc) => hasAxeStep(tc.beforeEach ?? []));
  const imports =
    'import { test, expect } from "@playwright/test";' +
    (needsAxe ? '\nimport { injectAxe, checkA11y } from "axe-playwright";' : "");
  const describe = file.description ?? file.filename.replace(".spec.ts", "");

  const testBlocks = file.testCases.map((tc) => {
    const beforeEachBlock = tc.beforeEach?.length
      ? "  test.beforeEach(async ({ page }) => {\n" +
        tc.beforeEach.map(stepToPlaywright).join("\n") +
        "\n  });\n\n"
      : "";
    const steps = tc.steps.map(stepToPlaywright).join("\n");
    return (
      beforeEachBlock + '  test("' + tc.name + '", async ({ page }) => {\n' + steps + "\n  });"
    );
  });

  return (
    imports +
    "\n\n" +
    "test.use({ baseURL: " +
    '"' +
    file.baseUrl +
    '"' +
    " });\n\n" +
    'test.describe("' +
    describe +
    '", () => {\n' +
    testBlocks.join("\n\n") +
    "\n});\n"
  );
}

export function generatePlaywrightConfig(file: TestFile): string {
  return (
    'import { defineConfig, devices } from "@playwright/test";\n\n' +
    "export default defineConfig({\n" +
    '  testDir: "./tests",\n' +
    "  fullyParallel: true,\n" +
    "  forbidOnly: !!process.env.CI,\n" +
    "  retries: process.env.CI ? 2 : 0,\n" +
    "  workers: process.env.CI ? 1 : undefined,\n" +
    '  reporter: "html",\n' +
    "  use: {\n" +
    '    baseURL: "' +
    file.baseUrl +
    '",\n' +
    '    trace: "on-first-retry",\n' +
    '    screenshot: "only-on-failure",\n' +
    '    video: "retain-on-failure",\n' +
    "  },\n" +
    "  projects: [\n" +
    '    { name: "chromium", use: { ...devices["Desktop Chrome"] } },\n' +
    '    { name: "firefox", use: { ...devices["Desktop Firefox"] } },\n' +
    '    { name: "webkit", use: { ...devices["Desktop Safari"] } },\n' +
    '    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },\n' +
    '    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },\n' +
    "  ],\n" +
    "  webServer: {\n" +
    '    command: "npm run dev",\n' +
    '    url: "' +
    file.baseUrl +
    '",\n' +
    "    reuseExistingServer: !process.env.CI,\n" +
    "  },\n" +
    "});\n"
  );
}

export function generatePageObject(file: TestFile): string {
  const className =
    (file.description ?? file.filename.replace(".spec.ts", ""))
      .replace(/[^a-zA-Z0-9]/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("") + "Page";

  const navigatePaths = [
    ...new Set(
      file.testCases.flatMap((tc) =>
        tc.steps.filter((s) => s.action === "navigate").map((s) => (s as { path: string }).path)
      )
    ),
  ];

  const methodLines: string[] = [];

  if (navigatePaths.length > 0) {
    methodLines.push(
      "  async goto() {\n" +
        '    await this.page.goto("' +
        (navigatePaths[0] ?? "/") +
        '");\n' +
        "  }"
    );
  }

  // Generate one method per test case
  for (const tc of file.testCases) {
    const methodName =
      tc.name
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .trim()
        .split(" ")
        .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
        .join("") || "runTest";
    const stepLines = tc.steps.map((s) => "    " + stepToPlaywright(s).trim()).join("\n");
    methodLines.push("  async " + methodName + "() {\n" + stepLines + "\n  }");
  }

  return (
    'import type { Page } from "@playwright/test";\n\n' +
    "export class " +
    className +
    " {\n" +
    "  constructor(private readonly page: Page) {}\n\n" +
    methodLines.join("\n\n") +
    "\n}\n"
  );
}

/** Serialize the full manager state (all files) as a multi-file DSL string */
export function serializeE2eManagerDSL(state: TestManagerState): string {
  return state.files
    .map((f) => (f.id === state.activeFileId ? "[ACTIVE]\n" : "") + serializeE2eDSL(f))
    .join("\n\n---\n\n");
}
