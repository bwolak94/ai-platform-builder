import { describe, it, expect } from "vitest";
import {
  serializeApiDSL,
  deserializeApiDSL,
  generateMockForEndpoint,
  generateOpenApiJson,
} from "../api-dsl";
import type { OpenApiSpec } from "@ai-builder/schemas";

const baseSpec: OpenApiSpec = {
  id: "spec_1",
  title: "Users API",
  version: "1.0.0",
  baseUrl: "https://api.example.com",
  securityScheme: "BearerJWT",
  description: null,
  tagDefinitions: [{ name: "users", description: "User management" }],
  endpoints: [
    {
      id: "ep_001",
      method: "GET",
      path: "/users",
      summary: "List users",
      description: null,
      parameters: [
        { name: "page", in: "query", required: false, schema: "integer", description: null },
      ],
      requestBody: null,
      responses: [{ status: 200, description: "OK", schema: "User[]" }],
      tags: ["users"],
      deprecated: null,
      requiresAuth: true,
    },
    {
      id: "ep_002",
      method: "POST",
      path: "/users",
      summary: "Create user",
      description: null,
      parameters: null,
      requestBody: {
        contentType: "application/json",
        schemaRef: "CreateUserInput",
        description: null,
      },
      responses: [
        { status: 201, description: "Created", schema: "User" },
        { status: 400, description: "Bad Request", schema: null },
      ],
      tags: null,
      deprecated: null,
      requiresAuth: null,
    },
  ],
  schemas: [
    {
      name: "User",
      description: null,
      properties: { id: "string", email: "string", name: "string" },
      required: ["id", "email"],
    },
    {
      name: "CreateUserInput",
      description: null,
      properties: { email: "string", name: "string" },
      required: ["email"],
    },
  ],
};

describe("serializeApiDSL", () => {
  it("includes the API header with title and version", () => {
    const dsl = serializeApiDSL(baseSpec);
    expect(dsl).toContain("Users API");
    expect(dsl).toContain("1.0.0");
  });

  it("serializes endpoint methods and paths", () => {
    const dsl = serializeApiDSL(baseSpec);
    expect(dsl).toContain("GET");
    expect(dsl).toContain("/users");
    expect(dsl).toContain("POST");
  });

  it("serializes response status codes", () => {
    const dsl = serializeApiDSL(baseSpec);
    expect(dsl).toContain("200");
    expect(dsl).toContain("201");
  });

  it("includes schema names", () => {
    const dsl = serializeApiDSL(baseSpec);
    expect(dsl).toContain("User");
    expect(dsl).toContain("CreateUserInput");
  });

  it("includes auth marker for authenticated endpoint", () => {
    const dsl = serializeApiDSL(baseSpec);
    expect(dsl).toContain("[auth]");
  });

  it("produces a non-empty string for an empty spec", () => {
    const emptySpec: OpenApiSpec = {
      id: "s",
      title: "Empty",
      version: "0.1",
      baseUrl: null,
      securityScheme: null,
      description: null,
      tagDefinitions: null,
      endpoints: [],
      schemas: [],
    };
    const dsl = serializeApiDSL(emptySpec);
    expect(dsl.length).toBeGreaterThan(0);
    expect(dsl).toContain("Empty");
  });
});

describe("deserializeApiDSL", () => {
  it("round-trips title and version", () => {
    const dsl = serializeApiDSL(baseSpec);
    const restored = deserializeApiDSL(dsl);
    expect(restored.title).toBe("Users API");
    expect(restored.version).toBe("1.0.0");
  });

  it("round-trips endpoint count", () => {
    const dsl = serializeApiDSL(baseSpec);
    const restored = deserializeApiDSL(dsl);
    expect(restored.endpoints).toHaveLength(2);
  });

  it("round-trips endpoint method and path", () => {
    const dsl = serializeApiDSL(baseSpec);
    const restored = deserializeApiDSL(dsl);
    const get = restored.endpoints.find((e) => e.method === "GET");
    expect(get).toBeDefined();
    expect(get?.path).toBe("/users");
  });

  it("round-trips schema names", () => {
    const dsl = serializeApiDSL(baseSpec);
    const restored = deserializeApiDSL(dsl);
    const names = restored.schemas.map((s) => s.name);
    expect(names).toContain("User");
    expect(names).toContain("CreateUserInput");
  });
});

describe("generateMockForEndpoint", () => {
  it("returns a mock object for a known endpoint", () => {
    const mock = generateMockForEndpoint(baseSpec, "ep_001");
    expect(mock).toBeDefined();
  });

  it("returns null for an unknown endpoint id", () => {
    const mock = generateMockForEndpoint(baseSpec, "ep_unknown");
    expect(mock).toBeNull();
  });
});

describe("generateOpenApiJson", () => {
  it("produces valid OpenAPI JSON with openapi version", () => {
    const json = generateOpenApiJson(baseSpec);
    expect(json).toHaveProperty("openapi");
    expect(json).toHaveProperty("info");
    expect(json).toHaveProperty("paths");
  });

  it("includes all paths", () => {
    const json = generateOpenApiJson(baseSpec);
    const paths = json.paths as Record<string, unknown>;
    expect(Object.keys(paths)).toContain("/users");
  });
});
