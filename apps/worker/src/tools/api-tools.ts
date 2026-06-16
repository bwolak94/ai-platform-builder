import { tool } from "ai";
import { z } from "zod";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

const ResponseSchema = z.object({
  status: z.number().int(),
  description: z.string(),
  schemaRef: z.string().nullable().optional().describe("$ref to a schema component"),
});

const ParameterSchema = z.object({
  name: z.string(),
  in: z.enum(["path", "query", "header", "cookie"]),
  required: z.boolean(),
  description: z.string().optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
});

export const apiTools = {
  querySpec: tool({
    description: "Get the current OpenAPI spec including all endpoints and schema components.",
    inputSchema: z.object({}),
  }),

  addEndpoint: tool({
    description: "Add a new REST endpoint to the OpenAPI spec.",
    inputSchema: z.object({
      id: z.string().describe("Unique identifier for this endpoint"),
      method: z.enum(HTTP_METHODS),
      path: z.string().describe("URL path, kebab-case, e.g. /user-profiles/{id}"),
      summary: z.string(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      parameters: z.array(ParameterSchema).optional(),
      requestBodyRef: z.string().nullable().optional().describe("$ref to request body schema"),
      responses: z.array(ResponseSchema),
      requiresAuth: z.boolean().optional(),
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
        summary: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        requiresAuth: z.boolean().optional(),
      }),
    }),
  }),

  addSchemaObject: tool({
    description: "Add a reusable schema component to the OpenAPI components section.",
    inputSchema: z.object({
      name: z.string().describe("PascalCase schema name"),
      schema: z.record(z.string(), z.unknown()).describe("JSON Schema object"),
    }),
  }),

  generateMockData: tool({
    description: "Generate example mock data for a specific endpoint.",
    inputSchema: z.object({
      endpointId: z.string(),
    }),
  }),

  retrieveDocs: tool({
    description: "Search docs for REST best practices and OpenAPI patterns.",
    inputSchema: z.object({
      query: z.string(),
    }),
  }),
};
