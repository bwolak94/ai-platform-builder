import { describe, it, expect } from "vitest";
import { TestStepSchema, TestCaseSchema, TestFileSchema, TestManagerStateSchema } from "../e2e";

// ─── TestStepSchema ───────────────────────────────────────────────────────────

describe("TestStepSchema — navigate", () => {
  it("accepts a valid navigate step", () => {
    const result = TestStepSchema.safeParse({
      action: "navigate",
      id: "step_abc123",
      path: "/login",
    });
    expect(result.success).toBe(true);
  });

  it("rejects navigate with empty path", () => {
    const result = TestStepSchema.safeParse({ action: "navigate", id: "step_abc123", path: "" });
    expect(result.success).toBe(false);
  });
});

describe("TestStepSchema — click", () => {
  it("accepts a valid click step", () => {
    const result = TestStepSchema.safeParse({
      action: "click",
      id: "step_abc123",
      selector: { strategy: "role", value: "button", name: "Submit" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects click with empty selector value", () => {
    const result = TestStepSchema.safeParse({
      action: "click",
      id: "step_abc123",
      selector: { strategy: "role", value: "", name: null },
    });
    expect(result.success).toBe(false);
  });
});

describe("TestStepSchema — fill", () => {
  it("accepts a valid fill step", () => {
    const result = TestStepSchema.safeParse({
      action: "fill",
      id: "step_abc123",
      selector: { strategy: "label", value: "Email", name: null },
      value: "user@example.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("TestStepSchema — check", () => {
  it("accepts checked=true", () => {
    const result = TestStepSchema.safeParse({
      action: "check",
      id: "step_abc123",
      selector: { strategy: "label", value: "Accept terms", name: null },
      checked: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts checked=false", () => {
    const result = TestStepSchema.safeParse({
      action: "check",
      id: "step_abc123",
      selector: { strategy: "label", value: "Accept terms", name: null },
      checked: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("TestStepSchema — hover", () => {
  it("accepts a valid hover step", () => {
    const result = TestStepSchema.safeParse({
      action: "hover",
      id: "step_abc123",
      selector: { strategy: "text", value: "Menu", name: null },
    });
    expect(result.success).toBe(true);
  });
});

describe("TestStepSchema — press", () => {
  it("accepts a valid press step", () => {
    const result = TestStepSchema.safeParse({
      action: "press",
      id: "step_abc123",
      key: "Enter",
    });
    expect(result.success).toBe(true);
  });

  it("rejects press with empty key", () => {
    const result = TestStepSchema.safeParse({ action: "press", id: "step_abc123", key: "" });
    expect(result.success).toBe(false);
  });
});

describe("TestStepSchema — upload", () => {
  it("accepts a valid upload step", () => {
    const result = TestStepSchema.safeParse({
      action: "upload",
      id: "step_abc123",
      selector: { strategy: "label", value: "Profile picture", name: null },
      filePath: "./fixtures/avatar.png",
    });
    expect(result.success).toBe(true);
  });
});

describe("TestStepSchema — scroll", () => {
  it("accepts scroll with selector", () => {
    const result = TestStepSchema.safeParse({
      action: "scroll",
      id: "step_abc123",
      selector: { strategy: "css", value: "#footer", name: null },
      x: null,
      y: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts scroll with coordinates", () => {
    const result = TestStepSchema.safeParse({
      action: "scroll",
      id: "step_abc123",
      selector: null,
      x: 0,
      y: 500,
    });
    expect(result.success).toBe(true);
  });
});

describe("TestStepSchema — wait", () => {
  it("accepts a valid wait step", () => {
    const result = TestStepSchema.safeParse({ action: "wait", id: "step_abc123", ms: 500 });
    expect(result.success).toBe(true);
  });

  it("rejects negative ms", () => {
    const result = TestStepSchema.safeParse({ action: "wait", id: "step_abc123", ms: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer ms", () => {
    const result = TestStepSchema.safeParse({ action: "wait", id: "step_abc123", ms: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe("TestStepSchema — screenshot", () => {
  it("accepts screenshot with name", () => {
    const result = TestStepSchema.safeParse({
      action: "screenshot",
      id: "step_abc123",
      name: "checkout-complete",
    });
    expect(result.success).toBe(true);
  });

  it("accepts screenshot with null name", () => {
    const result = TestStepSchema.safeParse({
      action: "screenshot",
      id: "step_abc123",
      name: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("TestStepSchema — axe", () => {
  it("accepts axe with context", () => {
    const result = TestStepSchema.safeParse({
      action: "axe",
      id: "step_abc123",
      context: "#main",
    });
    expect(result.success).toBe(true);
  });

  it("accepts axe with null context (full page)", () => {
    const result = TestStepSchema.safeParse({
      action: "axe",
      id: "step_abc123",
      context: null,
    });
    expect(result.success).toBe(true);
  });
});

// ─── intercept (new) ─────────────────────────────────────────────────────────

describe("TestStepSchema — intercept (new)", () => {
  it("accepts a valid GET intercept step", () => {
    const result = TestStepSchema.safeParse({
      action: "intercept",
      id: "step_abc123",
      method: "GET",
      urlPattern: "**/api/users",
      status: 200,
      body: { data: [] },
    });
    expect(result.success).toBe(true);
  });

  it("accepts POST intercept with 201 status", () => {
    const result = TestStepSchema.safeParse({
      action: "intercept",
      id: "step_abc123",
      method: "POST",
      urlPattern: "/api/orders",
      status: 201,
      body: { id: "ord_1", status: "created" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts intercept with null body", () => {
    const result = TestStepSchema.safeParse({
      action: "intercept",
      id: "step_abc123",
      method: "DELETE",
      urlPattern: "/api/items/1",
      status: 204,
      body: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all HTTP methods", () => {
    const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
    for (const method of methods) {
      const result = TestStepSchema.safeParse({
        action: "intercept",
        id: "step_abc123",
        method,
        urlPattern: "/api/test",
        status: 200,
        body: null,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid HTTP method", () => {
    const result = TestStepSchema.safeParse({
      action: "intercept",
      id: "step_abc123",
      method: "HEAD",
      urlPattern: "/api/test",
      status: 200,
      body: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects status below 100", () => {
    const result = TestStepSchema.safeParse({
      action: "intercept",
      id: "step_abc123",
      method: "GET",
      urlPattern: "/api/test",
      status: 99,
      body: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects status above 599", () => {
    const result = TestStepSchema.safeParse({
      action: "intercept",
      id: "step_abc123",
      method: "GET",
      urlPattern: "/api/test",
      status: 600,
      body: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty urlPattern", () => {
    const result = TestStepSchema.safeParse({
      action: "intercept",
      id: "step_abc123",
      method: "GET",
      urlPattern: "",
      status: 200,
      body: null,
    });
    expect(result.success).toBe(false);
  });
});

// ─── expect ───────────────────────────────────────────────────────────────────

describe("TestStepSchema — expect", () => {
  it("accepts expect url with value", () => {
    const result = TestStepSchema.safeParse({
      action: "expect",
      id: "step_abc123",
      type: "url",
      selector: null,
      value: "/dashboard",
      attribute: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts expect visible with selector", () => {
    const result = TestStepSchema.safeParse({
      action: "expect",
      id: "step_abc123",
      type: "visible",
      selector: { strategy: "role", value: "heading", name: "Dashboard" },
      value: null,
      attribute: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all expect types", () => {
    const types = [
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
    ] as const;
    for (const type of types) {
      const result = TestStepSchema.safeParse({
        action: "expect",
        id: "step_abc123",
        type,
        selector: null,
        value: null,
        attribute: null,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects unknown expect type", () => {
    const result = TestStepSchema.safeParse({
      action: "expect",
      id: "step_abc123",
      type: "snapshot",
      selector: null,
      value: null,
      attribute: null,
    });
    expect(result.success).toBe(false);
  });
});

// ─── selector strategies ─────────────────────────────────────────────────────

describe("SelectorStrategy", () => {
  const strategies = [
    "data-testid",
    "role",
    "label",
    "text",
    "placeholder",
    "css",
    "alt-text",
    "title",
  ] as const;

  it("accepts all valid selector strategies in a click step", () => {
    for (const strategy of strategies) {
      const result = TestStepSchema.safeParse({
        action: "click",
        id: "step_abc123",
        selector: { strategy, value: "test-value", name: null },
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects unknown selector strategy", () => {
    const result = TestStepSchema.safeParse({
      action: "click",
      id: "step_abc123",
      selector: { strategy: "xpath", value: "//button", name: null },
    });
    expect(result.success).toBe(false);
  });
});

// ─── TestCaseSchema ───────────────────────────────────────────────────────────

describe("TestCaseSchema", () => {
  const validStep = {
    action: "navigate" as const,
    id: "step_abc123",
    path: "/login",
  };

  it("accepts a valid test case with steps", () => {
    const result = TestCaseSchema.safeParse({
      id: "tc_abc123",
      name: "User can log in",
      tags: ["smoke"],
      beforeEach: null,
      steps: [validStep],
    });
    expect(result.success).toBe(true);
  });

  it("accepts test case with beforeEach", () => {
    const result = TestCaseSchema.safeParse({
      id: "tc_abc123",
      name: "User can view dashboard",
      tags: null,
      beforeEach: [validStep],
      steps: [validStep],
    });
    expect(result.success).toBe(true);
  });

  it("accepts test case with empty steps array", () => {
    const result = TestCaseSchema.safeParse({
      id: "tc_abc123",
      name: "Placeholder test",
      tags: null,
      beforeEach: null,
      steps: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects test case with empty name", () => {
    const result = TestCaseSchema.safeParse({
      id: "tc_abc123",
      name: "",
      tags: null,
      beforeEach: null,
      steps: [],
    });
    expect(result.success).toBe(false);
  });
});

// ─── TestFileSchema ───────────────────────────────────────────────────────────

describe("TestFileSchema", () => {
  it("accepts a valid test file", () => {
    const result = TestFileSchema.safeParse({
      id: "e2e_abc123",
      filename: "auth.spec.ts",
      baseUrl: "http://localhost:3000",
      description: "Authentication flow tests",
      testCases: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects filename without .spec.ts suffix", () => {
    const result = TestFileSchema.safeParse({
      id: "e2e_abc123",
      filename: "auth.test.ts",
      baseUrl: "http://localhost:3000",
      description: null,
      testCases: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty filename", () => {
    const result = TestFileSchema.safeParse({
      id: "e2e_abc123",
      filename: "",
      baseUrl: "http://localhost:3000",
      description: null,
      testCases: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts null description", () => {
    const result = TestFileSchema.safeParse({
      id: "e2e_abc123",
      filename: "smoke.spec.ts",
      baseUrl: "http://localhost:3000",
      description: null,
      testCases: [],
    });
    expect(result.success).toBe(true);
  });
});

// ─── TestManagerStateSchema ───────────────────────────────────────────────────

describe("TestManagerStateSchema", () => {
  const validFile = {
    id: "e2e_abc123",
    filename: "app.spec.ts",
    baseUrl: "http://localhost:3000",
    description: null,
    testCases: [],
  };

  it("accepts a valid manager state", () => {
    const result = TestManagerStateSchema.safeParse({
      files: [validFile],
      activeFileId: "e2e_abc123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty files array", () => {
    const result = TestManagerStateSchema.safeParse({
      files: [],
      activeFileId: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts multiple files", () => {
    const result = TestManagerStateSchema.safeParse({
      files: [validFile, { ...validFile, id: "e2e_def456", filename: "other.spec.ts" }],
      activeFileId: "e2e_def456",
    });
    expect(result.success).toBe(true);
  });
});
