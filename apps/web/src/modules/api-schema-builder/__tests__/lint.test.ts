import { describe, it, expect } from "vitest";
import { lintApiSpec, lintSummary } from "../lint";
import { makeEmptySpec } from "../hooks/useApiState";
import type { OpenApiSpec, ApiEndpoint } from "@ai-builder/schemas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEndpoint(overrides: Partial<ApiEndpoint> = {}): ApiEndpoint {
  return {
    id: "ep_001",
    method: "GET",
    path: "/users",
    summary: "List users",
    description: null,
    parameters: null,
    requestBody: null,
    responses: [
      { status: 200, description: "OK", schema: null },
      { status: 500, description: "Server error", schema: null },
    ],
    tags: null,
    deprecated: null,
    requiresAuth: null,
    ...overrides,
  };
}

function specWith(endpoints: ApiEndpoint[], extras: Partial<OpenApiSpec> = {}): OpenApiSpec {
  return {
    ...makeEmptySpec(),
    baseUrl: "https://api.example.com",
    description: "A great API",
    endpoints,
    ...extras,
  };
}

// ─── Empty spec ───────────────────────────────────────────────────────────────

describe("empty spec", () => {
  it("reports no-endpoints info issue", () => {
    const issues = lintApiSpec(makeEmptySpec());
    expect(issues.some((i) => i.message.includes("No endpoints"))).toBe(true);
  });

  it("reports missing base URL info issue", () => {
    const issues = lintApiSpec(makeEmptySpec());
    expect(issues.some((i) => i.message.includes("base URL"))).toBe(true);
  });

  it("reports missing description info issue", () => {
    const issues = lintApiSpec(makeEmptySpec());
    expect(issues.some((i) => i.message.includes("description"))).toBe(true);
  });
});

// ─── Duplicate endpoint ───────────────────────────────────────────────────────

describe("duplicate endpoint", () => {
  it("flags duplicate method+path as error", () => {
    const ep1 = makeEndpoint({ id: "ep_001" });
    const ep2 = makeEndpoint({ id: "ep_002" });
    const issues = lintApiSpec(specWith([ep1, ep2]));
    expect(issues.some((i) => i.level === "error" && i.message.includes("Duplicate"))).toBe(true);
  });

  it("does not flag distinct method+path combinations", () => {
    const ep1 = makeEndpoint({ id: "ep_001", method: "GET" });
    const ep2 = makeEndpoint({ id: "ep_002", method: "POST" });
    const issues = lintApiSpec(specWith([ep1, ep2]));
    expect(issues.every((i) => !i.message.includes("Duplicate"))).toBe(true);
  });
});

// ─── Missing summary ──────────────────────────────────────────────────────────

describe("missing summary", () => {
  it("warns when summary is null", () => {
    const ep = makeEndpoint({ summary: null });
    const issues = lintApiSpec(specWith([ep]));
    expect(
      issues.some((i) => i.level === "warning" && i.message.includes("missing a summary"))
    ).toBe(true);
  });

  it("does not warn when summary is provided", () => {
    const ep = makeEndpoint({ summary: "List all users" });
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.every((i) => !i.message.includes("missing a summary"))).toBe(true);
  });
});

// ─── Missing 404 on by-ID GET ─────────────────────────────────────────────────

describe("missing 404 on parameterised GET", () => {
  it("warns when GET with path param has no 404 response", () => {
    const ep = makeEndpoint({
      path: "/users/{id}",
      responses: [
        { status: 200, description: "OK", schema: null },
        { status: 500, description: "Error", schema: null },
      ],
    });
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.some((i) => i.level === "warning" && i.message.includes("no 404"))).toBe(true);
  });

  it("does not warn when 404 is present", () => {
    const ep = makeEndpoint({
      path: "/users/{id}",
      responses: [
        { status: 200, description: "OK", schema: null },
        { status: 404, description: "Not Found", schema: null },
        { status: 500, description: "Error", schema: null },
      ],
    });
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.every((i) => !i.message.includes("no 404"))).toBe(true);
  });

  it("does not trigger for collection GET without path params", () => {
    const ep = makeEndpoint({
      path: "/users",
      responses: [
        { status: 200, description: "OK", schema: null },
        { status: 500, description: "Error", schema: null },
      ],
    });
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.every((i) => !i.message.includes("no 404"))).toBe(true);
  });
});

// ─── Missing request body ─────────────────────────────────────────────────────

describe("missing request body on mutating endpoints", () => {
  it("informs when POST has no request body", () => {
    const ep = makeEndpoint({ method: "POST", requestBody: null });
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.some((i) => i.message.includes("no request body"))).toBe(true);
  });

  it("informs when PUT has no request body", () => {
    const ep = makeEndpoint({ method: "PUT", requestBody: null });
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.some((i) => i.message.includes("no request body"))).toBe(true);
  });

  it("does not inform when body is provided", () => {
    const ep = makeEndpoint({
      method: "POST",
      requestBody: { contentType: "application/json", schemaRef: "CreateInput", description: null },
    });
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.every((i) => !i.message.includes("no request body"))).toBe(true);
  });

  it("does not inform for GET", () => {
    const ep = makeEndpoint({ method: "GET", requestBody: null });
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.every((i) => !i.message.includes("no request body"))).toBe(true);
  });
});

// ─── Non-kebab path ───────────────────────────────────────────────────────────

describe("path casing", () => {
  it("warns for camelCase path segment", () => {
    const ep = makeEndpoint({ path: "/userOrders" });
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.some((i) => i.level === "warning" && i.message.includes("kebab-case"))).toBe(
      true
    );
  });

  it("does not warn for kebab-case path", () => {
    const ep = makeEndpoint({ path: "/user-orders" });
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.every((i) => !i.message.includes("kebab-case"))).toBe(true);
  });

  it("allows path parameters in non-kebab segments", () => {
    const ep = makeEndpoint({ path: "/users/{id}/orders" });
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.every((i) => !i.message.includes("kebab-case"))).toBe(true);
  });
});

// ─── Auth requirement ─────────────────────────────────────────────────────────

describe("mutating endpoint without auth", () => {
  it("informs when POST lacks requiresAuth and spec has security scheme", () => {
    const ep = makeEndpoint({ method: "POST", requiresAuth: null });
    const spec = specWith([ep], { securityScheme: "BearerJWT" });
    const issues = lintApiSpec(spec);
    expect(issues.some((i) => i.message.includes("requiresAuth"))).toBe(true);
  });

  it("does not inform when requiresAuth is true", () => {
    const ep = makeEndpoint({ method: "POST", requiresAuth: true });
    const spec = specWith([ep], { securityScheme: "BearerJWT" });
    const issues = lintApiSpec(spec);
    expect(issues.every((i) => !i.message.includes("requiresAuth"))).toBe(true);
  });

  it("does not inform when spec has no security scheme", () => {
    const ep = makeEndpoint({ method: "POST", requiresAuth: null });
    const spec = specWith([ep], { securityScheme: null });
    const issues = lintApiSpec(spec);
    expect(issues.every((i) => !i.message.includes("requiresAuth"))).toBe(true);
  });

  it("does not inform for GET regardless of auth", () => {
    const ep = makeEndpoint({ method: "GET", requiresAuth: null });
    const spec = specWith([ep], { securityScheme: "ApiKey" });
    const issues = lintApiSpec(spec);
    expect(issues.every((i) => !i.message.includes("requiresAuth"))).toBe(true);
  });
});

// ─── Missing 5xx response ─────────────────────────────────────────────────────

describe("missing 5xx response", () => {
  it("informs when no 5xx response is defined", () => {
    const ep = makeEndpoint({
      responses: [{ status: 200, description: "OK", schema: null }],
    });
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.some((i) => i.message.includes("5xx"))).toBe(true);
  });

  it("does not inform when a 5xx response is present", () => {
    const ep = makeEndpoint();
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.every((i) => !i.message.includes("5xx"))).toBe(true);
  });
});

// ─── Undefined tag ────────────────────────────────────────────────────────────

describe("undefined tag", () => {
  it("warns when endpoint uses a tag not defined in the spec", () => {
    const ep = makeEndpoint({ tags: ["products"] });
    const spec = specWith([ep], { tagDefinitions: [] });
    const issues = lintApiSpec(spec);
    expect(issues.some((i) => i.level === "warning" && i.message.includes('"products"'))).toBe(
      true
    );
  });

  it("does not warn when tag is defined in tagDefinitions", () => {
    const ep = makeEndpoint({ tags: ["products"] });
    const spec = specWith([ep], {
      tagDefinitions: [{ name: "products", description: null }],
    });
    const issues = lintApiSpec(spec);
    expect(issues.every((i) => !i.message.includes('"products"'))).toBe(true);
  });

  it("does not warn when endpoint has no tags", () => {
    const ep = makeEndpoint({ tags: null });
    const issues = lintApiSpec(specWith([ep]));
    expect(issues.every((i) => !i.message.includes("Tag"))).toBe(true);
  });
});

// ─── lintSummary ─────────────────────────────────────────────────────────────

describe("lintSummary", () => {
  it("counts errors, warnings, and infos correctly", () => {
    const ep1 = makeEndpoint({ id: "ep_a" });
    const ep2 = makeEndpoint({ id: "ep_b" }); // duplicate
    const issues = lintApiSpec(specWith([ep1, ep2]));
    const summary = lintSummary(issues);
    expect(summary.errors).toBeGreaterThanOrEqual(1);
    expect(typeof summary.warnings).toBe("number");
    expect(typeof summary.infos).toBe("number");
  });

  it("returns zero counts for a clean spec", () => {
    const issues: ReturnType<typeof lintApiSpec> = [];
    const summary = lintSummary(issues);
    expect(summary).toEqual({ errors: 0, warnings: 0, infos: 0 });
  });
});
