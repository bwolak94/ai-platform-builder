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
  schema: z.string().nullable(),
  description: z.string().nullable(),
});

export const ApiResponseSchema = z.object({
  status: z.number().int().min(100).max(599),
  description: z.string(),
  schema: z.string().nullable(),
});

export const ApiSchemaObjectSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/, "Must be a valid identifier"),
  description: z.string().nullable(),
  properties: z.record(z.string(), z.string()),
  required: z.array(z.string()).nullable(),
});

export const SecuritySchemeSchema = z.enum(["BearerJWT", "ApiKey", "OAuth2", "BasicAuth", "None"]);

export const ApiEndpointSchema = z.object({
  id: z.string(),
  method: HttpMethodSchema,
  path: z.string().min(1).startsWith("/"),
  summary: z.string().nullable(),
  parameters: z.array(ApiParameterSchema).nullable(),
  responses: z.array(ApiResponseSchema),
  tags: z.array(z.string()).nullable(),
  deprecated: z.boolean().nullable(),
});

export const OpenApiSpecSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  version: z.string().min(1),
  baseUrl: z.string().nullable(),
  securityScheme: SecuritySchemeSchema.nullable(),
  description: z.string().nullable(),
  endpoints: z.array(ApiEndpointSchema),
  schemas: z.array(ApiSchemaObjectSchema),
});

export type HttpMethod = z.infer<typeof HttpMethodSchema>;
export type ApiParameter = z.infer<typeof ApiParameterSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type ApiSchemaObject = z.infer<typeof ApiSchemaObjectSchema>;
export type SecurityScheme = z.infer<typeof SecuritySchemeSchema>;
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;
export type OpenApiSpec = z.infer<typeof OpenApiSpecSchema>;
