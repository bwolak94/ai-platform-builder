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
import type { TestFile, TestCase, TestStep } from "@ai-builder/schemas";

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
    case "wait":
      return "  WAIT " + String(step.ms) + "ms";
    case "screenshot":
      return "  SCREENSHOT" + (step.name ? ' "' + step.name + '"' : "");
    case "expect":
      if (step.selector) {
        return (
          "  EXPECT [" +
          step.selector.strategy +
          '="' +
          step.selector.value +
          '"] ' +
          step.type +
          (step.value ? ' "' + step.value + '"' : "")
        );
      }
      return "  EXPECT " + step.type + (step.value ? ' "' + step.value + '"' : "");
  }
}

function serializeTestCase(tc: TestCase): string {
  const tags = tc.tags?.length ? " [" + tc.tags.join(",") + "]" : "";
  const steps = tc.steps.map(serializeStep).join("\n");
  return "TEST: " + tc.name + tags + "\n" + steps;
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
  if (line.startsWith("NAVIGATE ")) {
    return { action: "navigate", path: line.slice(9).trim() };
  }
  if (line.startsWith("CLICK ")) {
    const sel = parseSelector(line);
    if (!sel) return null;
    return { action: "click", selector: sel };
  }
  if (line.startsWith("FILL ")) {
    const sel = parseSelector(line);
    const valueMatch = /[→>]\s*"([^"]*)"/.exec(line);
    if (!sel) return null;
    return { action: "fill", selector: sel, value: valueMatch?.[1] ?? "" };
  }
  if (line.startsWith("SELECT ")) {
    const sel = parseSelector(line);
    const valueMatch = /[→>]\s*"([^"]*)"/.exec(line);
    if (!sel) return null;
    return { action: "select", selector: sel, value: valueMatch?.[1] ?? "" };
  }
  if (line.startsWith("CHECK ")) {
    const sel = parseSelector(line);
    const checked = !line.includes("false");
    if (!sel) return null;
    return { action: "check", selector: sel, checked };
  }
  if (line.startsWith("WAIT ")) {
    const ms = parseInt(/(\d+)ms/.exec(line)?.[1] ?? "0", 10);
    return { action: "wait", ms };
  }
  if (line.startsWith("SCREENSHOT")) {
    const nameMatch = /"([^"]+)"/.exec(line);
    return { action: "screenshot", name: nameMatch?.[1] ?? null };
  }
  if (line.startsWith("EXPECT ")) {
    const rest = line.slice(7);
    const sel = parseSelector(rest);
    const typeMatch = /(visible|hidden|text|url|count)/.exec(rest);
    const valueMatch = sel ? /\]\s+\w+\s+"([^"]+)"/.exec(rest) : /"([^"]+)"/.exec(rest);
    return {
      action: "expect",
      type: (typeMatch?.[1] ?? "visible") as TestStep extends { action: "expect" }
        ? TestStep["type"]
        : never,
      selector: sel,
      value: valueMatch?.[1] ?? null,
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
    case "css":
      return 'page.locator("' + sel.value + '")';
    default:
      return 'page.locator("' + sel.value + '")';
  }
}

function stepToPlaywright(step: TestStep): string {
  switch (step.action) {
    case "navigate":
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
    case "wait":
      return "  await page.waitForTimeout(" + String(step.ms) + ");";
    case "screenshot":
      return (
        "  await page.screenshot(" + (step.name ? '{ path: "' + step.name + '.png" }' : "") + ");"
      );
    case "expect": {
      if (step.type === "url")
        return "  await expect(page).toHaveURL(/" + (step.value ?? "") + "/);";
      if (!step.selector) return "  // expect " + step.type;
      const loc = selectorToPlaywright(step.selector);
      if (step.type === "visible") return "  await expect(" + loc + ").toBeVisible();";
      if (step.type === "hidden") return "  await expect(" + loc + ").toBeHidden();";
      if (step.type === "text")
        return "  await expect(" + loc + ').toHaveText("' + (step.value ?? "") + '");';
      return "  await expect(" + loc + ").toBeVisible();";
    }
  }
}

export function generatePlaywrightSpec(file: TestFile): string {
  const imports = `import { test, expect } from "@playwright/test";`;
  const describe = file.description ?? file.filename.replace(".spec.ts", "");
  const testBlocks = file.testCases.map((tc) => {
    const steps = tc.steps.map(stepToPlaywright).join("\n");
    return `  test("${tc.name}", async ({ page }) => {\n${steps}\n  });`;
  });

  return (
    imports +
    "\n\n" +
    'test.describe("' +
    describe +
    '", () => {\n' +
    testBlocks.join("\n\n") +
    "\n});\n"
  );
}
