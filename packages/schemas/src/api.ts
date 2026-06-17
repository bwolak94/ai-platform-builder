import { z } from "zod";

export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

export const ApiParameterSchema = z.object({
  name: z.string().min(1),
  in: z.enum(["path", "query", "header", "cookie"]),
  required: z.boolean(),
  // Agent may omit these — default to null instead of failing validation
  schema: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
});

export const ApiResponseSchema = z.object({
  status: z.number().int().min(100).max(599),
  description: z.string(),
  // Agent omits schema for void responses (204, etc.)
  schema: z.string().nullable().default(null),
});

export const ApiSchemaObjectSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/, "Must be a valid identifier"),
  description: z.string().nullable().default(null),
  properties: z.record(z.string(), z.string()),
  required: z.array(z.string()).nullable().default(null),
});

export const SecuritySchemeSchema = z.enum(["BearerJWT", "ApiKey", "OAuth2", "BasicAuth", "None"]);

export const ApiRequestBodySchema = z.object({
  contentType: z.string().default("application/json"),
  schemaRef: z.string(),
  description: z.string().nullable().default(null),
});

export const ApiTagDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().default(null),
});

export const ApiEndpointSchema = z.object({
  id: z.string(),
  method: HttpMethodSchema,
  path: z.string().min(1).startsWith("/"),
  // All nullable fields use .default(null) so the agent can omit them
  summary: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  parameters: z.array(ApiParameterSchema).nullable().default(null),
  requestBody: ApiRequestBodySchema.nullable().default(null),
  responses: z.array(ApiResponseSchema),
  tags: z.array(z.string()).nullable().default(null),
  deprecated: z.boolean().nullable().default(null),
  requiresAuth: z.boolean().nullable().default(null),
});

export const OpenApiSpecSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  version: z.string().min(1),
  baseUrl: z.string().nullable().default(null),
  securityScheme: SecuritySchemeSchema.nullable().default(null),
  description: z.string().nullable().default(null),
  tagDefinitions: z.array(ApiTagDefinitionSchema).nullable().default(null),
  endpoints: z.array(ApiEndpointSchema),
  schemas: z.array(ApiSchemaObjectSchema),
});

export type HttpMethod = z.infer<typeof HttpMethodSchema>;
export type ApiParameter = z.infer<typeof ApiParameterSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type ApiSchemaObject = z.infer<typeof ApiSchemaObjectSchema>;
export type SecurityScheme = z.infer<typeof SecuritySchemeSchema>;
export type ApiRequestBody = z.infer<typeof ApiRequestBodySchema>;
export type ApiTagDefinition = z.infer<typeof ApiTagDefinitionSchema>;
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;
export type OpenApiSpec = z.infer<typeof OpenApiSpecSchema>;
