import { tool } from "ai";
import { z } from "zod";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
const SECURITY_SCHEMES = ["BearerJWT", "ApiKey", "OAuth2", "BasicAuth", "None"] as const;

const ResponseSchema = z.object({
  status: z.number().int().min(100).max(599),
  description: z.string(),
  schema: z
    .string()
    .nullable()
    .optional()
    .describe("Type name or $ref (e.g. User, User[], string)"),
});

const ParameterSchema = z.object({
  name: z.string(),
  in: z.enum(["path", "query", "header", "cookie"]),
  required: z.boolean(),
  description: z.string().nullable().optional(),
  schema: z
    .string()
    .nullable()
    .optional()
    .describe("Type string: string, number, integer, boolean"),
});

const RequestBodySchema = z.object({
  contentType: z.string().default("application/json").describe("MIME type, e.g. application/json"),
  schemaRef: z.string().describe("Name of an existing schema component"),
  description: z.string().nullable().optional(),
});

const SchemaObjectSchema = z.object({
  name: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/)
    .describe("PascalCase identifier"),
  description: z.string().nullable().optional(),
  properties: z
    .record(z.string(), z.string())
    .describe("Property map: { propName: typeString } e.g. { id: 'string', age: 'integer' }"),
  required: z.array(z.string()).nullable().optional(),
});

export const apiTools = {
  querySpec: tool({
    description:
      "Get the current OpenAPI spec DSL including endpoints, schemas and tags. ALWAYS call this first before modifying.",
    inputSchema: z.object({}),
  }),

  updateSpec: tool({
    description:
      "Update top-level API spec metadata: title, version, baseUrl, description, securityScheme.",
    inputSchema: z.object({
      title: z.string().optional(),
      version: z.string().optional(),
      baseUrl: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      securityScheme: z.enum(SECURITY_SCHEMES).nullable().optional(),
    }),
  }),

  addEndpoint: tool({
    description: "Add a new REST endpoint to the OpenAPI spec.",
    inputSchema: z.object({
      id: z.string().describe("Unique identifier, e.g. ep_abc123"),
      method: z.enum(HTTP_METHODS),
      path: z.string().describe("URL path in kebab-case, e.g. /user-profiles/{id}"),
      summary: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      tags: z.array(z.string()).nullable().optional(),
      parameters: z.array(ParameterSchema).nullable().optional(),
      requestBody: RequestBodySchema.nullable().optional(),
      responses: z.array(ResponseSchema),
      deprecated: z.boolean().nullable().optional(),
      requiresAuth: z.boolean().nullable().optional(),
    }),
  }),

  removeEndpoint: tool({
    description: "Remove an endpoint from the spec by its id.",
    inputSchema: z.object({
      id: z.string(),
    }),
  }),

  updateEndpoint: tool({
    description: "Update properties of an existing endpoint (partial update).",
    inputSchema: z.object({
      id: z.string(),
      updates: z.object({
        method: z.enum(HTTP_METHODS).optional(),
        path: z.string().optional(),
        summary: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        tags: z.array(z.string()).nullable().optional(),
        deprecated: z.boolean().nullable().optional(),
        requiresAuth: z.boolean().nullable().optional(),
      }),
    }),
  }),

  reorderEndpoints: tool({
    description: "Reorder endpoints by providing the full ordered list of endpoint IDs.",
    inputSchema: z.object({
      orderedIds: z.array(z.string()).describe("All endpoint IDs in the desired order"),
    }),
  }),

  setRequestBody: tool({
    description: "Set or replace the request body for an endpoint.",
    inputSchema: z.object({
      id: z.string().describe("Endpoint id"),
      schemaRef: z.string().describe("Name of the schema component to reference"),
      contentType: z.string().default("application/json").optional(),
      description: z.string().nullable().optional(),
    }),
  }),

  addSchemaObject: tool({
    description:
      "Add a reusable schema component. Properties are type strings: string, number, integer, boolean, or another schema name.",
    inputSchema: SchemaObjectSchema,
  }),

  updateSchemaObject: tool({
    description: "Update an existing schema component by name.",
    inputSchema: z.object({
      name: z.string().describe("Name of the schema to update"),
      description: z.string().nullable().optional(),
      properties: z.record(z.string(), z.string()).optional(),
      required: z.array(z.string()).nullable().optional(),
    }),
  }),

  removeSchemaObject: tool({
    description: "Remove a schema component by name.",
    inputSchema: z.object({
      name: z.string().describe("Schema name to remove"),
    }),
  }),

  addTag: tool({
    description: "Add a tag definition to the spec.",
    inputSchema: z.object({
      name: z.string().describe("Tag name used in endpoints"),
      description: z.string().nullable().optional(),
    }),
  }),

  removeTag: tool({
    description: "Remove a tag definition from the spec.",
    inputSchema: z.object({
      name: z.string(),
    }),
  }),

  generateMockData: tool({
    description: "Generate example mock data for a specific endpoint based on its response schema.",
    inputSchema: z.object({
      id: z.string().describe("Endpoint id"),
    }),
  }),

  generateMockServer: tool({
    description:
      "Generate a runnable Express/Hono mock server file with static fixture responses for all defined endpoints. Returns the full TypeScript source.",
    inputSchema: z.object({}),
  }),

  checkBreakingChanges: tool({
    description:
      "Compare the current spec against a provided previous spec DSL and list any breaking changes: removed endpoints, removed required fields, changed response schemas, renamed paths.",
    inputSchema: z.object({
      previousDsl: z
        .string()
        .describe("The previous spec DSL string to compare against the current state"),
    }),
  }),

  addRateLimiting: tool({
    description:
      "Add rate limiting response headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After) and a 429 Too Many Requests response to the specified endpoints.",
    inputSchema: z.object({
      endpointIds: z
        .array(z.string())
        .describe("List of endpoint IDs to add rate limiting to. Empty array = apply to all."),
      limitPerMinute: z
        .number()
        .int()
        .positive()
        .default(60)
        .describe("Requests allowed per minute"),
    }),
  }),

  generateContractTest: tool({
    description:
      "Generate a Pact consumer contract JSON file for the current spec, suitable for consumer-driven contract testing.",
    inputSchema: z.object({
      consumerName: z.string().describe("Name of the consuming service, e.g. 'web-frontend'"),
      providerName: z.string().describe("Name of the API provider service, e.g. 'users-api'"),
    }),
  }),

  addWebhookEndpoint: tool({
    description:
      "Add a webhook subscription endpoint pair: POST /webhooks (subscribe) and DELETE /webhooks/{id} (unsubscribe), with HMAC-SHA256 signature header in the response schema.",
    inputSchema: z.object({
      resource: z.string().describe("Resource the webhook fires on, e.g. 'order', 'payment'"),
      events: z
        .array(z.string())
        .describe("Event types to expose, e.g. ['created', 'updated', 'deleted']"),
    }),
  }),

  generatePostmanCollection: tool({
    description:
      "Export the current OpenAPI spec as a Postman Collection v2.1 JSON, ready to import into Postman or Newman for automated testing.",
    inputSchema: z.object({}),
  }),

  addPagination: tool({
    description:
      "Add pagination query parameters and response envelope to a list endpoint. Supports cursor-based or offset/limit pagination.",
    inputSchema: z.object({
      endpointId: z.string().describe("ID of the list endpoint to paginate"),
      strategy: z
        .enum(["cursor", "offset"])
        .default("cursor")
        .describe("Pagination strategy: cursor uses next_cursor token, offset uses page+limit"),
      pageSize: z.number().int().positive().default(20).describe("Default page size"),
    }),
  }),

  addSchemaEnum: tool({
    description:
      "Add a reusable enum schema component (string with allowed values) that endpoints can reference in parameters or response bodies.",
    inputSchema: z.object({
      name: z
        .string()
        .regex(/^[A-Za-z][A-Za-z0-9_]*$/)
        .describe("PascalCase enum name, e.g. 'OrderStatus'"),
      values: z.array(z.string()).min(1).describe("Allowed string values, e.g. ['pending','paid']"),
      description: z.string().nullable().optional(),
    }),
  }),

  generateSDK: tool({
    description:
      "Generate a typed TypeScript fetch client (SDK) from the current spec. Each endpoint becomes a typed async function with request/response types inferred from the schema.",
    inputSchema: z.object({
      clientName: z
        .string()
        .default("ApiClient")
        .describe("Class name for the generated SDK, e.g. 'ApiClient'"),
    }),
  }),

  duplicateEndpoint: tool({
    description:
      "Clone an existing endpoint with a new unique ID and optionally a new HTTP method or path. Useful for creating similar endpoints with minor variations.",
    inputSchema: z.object({
      sourceId: z.string().describe("ID of the endpoint to duplicate"),
      newId: z.string().describe("New unique endpoint ID"),
      newPath: z.string().optional().describe("Override path for the duplicate"),
      newMethod: z.enum(HTTP_METHODS).optional().describe("Override HTTP method"),
    }),
  }),

  setSecurityRequirement: tool({
    description:
      "Set or override the security requirement on specific endpoints, allowing individual endpoints to opt out of global security or require a specific scheme.",
    inputSchema: z.object({
      endpointIds: z
        .array(z.string())
        .describe("List of endpoint IDs to update. Empty = apply to all."),
      requiresAuth: z.boolean().describe("True = require authentication; false = public endpoint"),
    }),
  }),

  retrieveDocs: tool({
    description:
      "Search documentation for REST best practices, OpenAPI patterns, and HTTP status codes.",
    inputSchema: z.object({
      query: z.string(),
    }),
  }),
};
