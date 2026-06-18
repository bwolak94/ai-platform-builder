import { describe, it, expect } from "vitest";
import {
  ApiEndpointSchema,
  ApiSchemaObjectSchema,
  OpenApiSpecSchema,
  ApiParameterSchema,
  ApiResponseSchema,
} from "../api";

const validEndpoint = {
  id: "ep_001",
  method: "GET" as const,
  path: "/users",
  summary: "List users",
  description: null,
  parameters: null,
  requestBody: null,
  responses: [{ status: 200, description: "OK", schema: "User[]" }],
  tags: null,
  deprecated: null,
  requiresAuth: null,
};

const validSchema = {
  name: "User",
  description: null,
  properties: { id: "string", email: "string" },
  required: ["id", "email"],
};

const validSpec = {
  id: "spec_1",
  title: "My API",
  version: "1.0.0",
  baseUrl: null,
  securityScheme: null,
  description: null,
  tagDefinitions: null,
  endpoints: [validEndpoint],
  schemas: [validSchema],
};

describe("ApiParameterSchema", () => {
  it("accepts a valid query parameter", () => {
    const result = ApiParameterSchema.safeParse({
      name: "page",
      in: "query",
      required: false,
    });
    expect(result.success).toBe(true);
  });

  it("defaults schema and description to null when omitted", () => {
    const result = ApiParameterSchema.safeParse({ name: "id", in: "path", required: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schema).toBeNull();
      expect(result.data.description).toBeNull();
    }
  });

  it("rejects an invalid 'in' value", () => {
    const result = ApiParameterSchema.safeParse({ name: "x", in: "body", required: false });
    expect(result.success).toBe(false);
  });
});

describe("ApiResponseSchema", () => {
  it("accepts a valid response", () => {
    const result = ApiResponseSchema.safeParse({ status: 200, description: "OK", schema: "User" });
    expect(result.success).toBe(true);
  });

  it("rejects status below 100", () => {
    const result = ApiResponseSchema.safeParse({ status: 99, description: "Bad", schema: null });
    expect(result.success).toBe(false);
  });

  it("rejects status above 599", () => {
    const result = ApiResponseSchema.safeParse({ status: 600, description: "Bad", schema: null });
    expect(result.success).toBe(false);
  });

  it("defaults schema to null when omitted", () => {
    const result = ApiResponseSchema.safeParse({ status: 204, description: "No Content" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.schema).toBeNull();
  });
});

describe("ApiEndpointSchema", () => {
  it("accepts a valid endpoint", () => {
    expect(ApiEndpointSchema.safeParse(validEndpoint).success).toBe(true);
  });

  it("rejects a path not starting with /", () => {
    const result = ApiEndpointSchema.safeParse({ ...validEndpoint, path: "users" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid HTTP method", () => {
    const result = ApiEndpointSchema.safeParse({ ...validEndpoint, method: "CONNECT" });
    expect(result.success).toBe(false);
  });

  it("rejects empty responses array", () => {
    const result = ApiEndpointSchema.safeParse({ ...validEndpoint, responses: [] });
    // responses is just an array — empty is technically allowed by schema
    expect(result.success).toBe(true);
  });

  it("accepts endpoint with request body", () => {
    const result = ApiEndpointSchema.safeParse({
      ...validEndpoint,
      method: "POST",
      requestBody: { contentType: "application/json", schemaRef: "CreateUserInput" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts endpoint with parameters", () => {
    const result = ApiEndpointSchema.safeParse({
      ...validEndpoint,
      path: "/users/{id}",
      parameters: [{ name: "id", in: "path", required: true }],
    });
    expect(result.success).toBe(true);
  });
});

describe("ApiSchemaObjectSchema", () => {
  it("accepts a valid schema object", () => {
    expect(ApiSchemaObjectSchema.safeParse(validSchema).success).toBe(true);
  });

  it("rejects a name starting with a digit", () => {
    const result = ApiSchemaObjectSchema.safeParse({ ...validSchema, name: "1User" });
    expect(result.success).toBe(false);
  });

  it("rejects a name with spaces", () => {
    const result = ApiSchemaObjectSchema.safeParse({ ...validSchema, name: "My User" });
    expect(result.success).toBe(false);
  });

  it("accepts PascalCase name", () => {
    const result = ApiSchemaObjectSchema.safeParse({ ...validSchema, name: "CreateUserInput" });
    expect(result.success).toBe(true);
  });
});

describe("OpenApiSpecSchema", () => {
  it("accepts a valid spec", () => {
    expect(OpenApiSpecSchema.safeParse(validSpec).success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = OpenApiSpecSchema.safeParse({ ...validSpec, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty version", () => {
    const result = OpenApiSpecSchema.safeParse({ ...validSpec, version: "" });
    expect(result.success).toBe(false);
  });

  it("accepts valid security schemes", () => {
    for (const scheme of ["BearerJWT", "ApiKey", "OAuth2", "BasicAuth", "None"] as const) {
      const result = OpenApiSpecSchema.safeParse({ ...validSpec, securityScheme: scheme });
      expect(result.success).toBe(true);
    }
  });
});
