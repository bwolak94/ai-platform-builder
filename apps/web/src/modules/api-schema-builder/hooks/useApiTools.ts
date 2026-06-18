import { serializeApiDSL, generateMockForEndpoint } from "@ai-builder/serializers";
import { ApiEndpointSchema, ApiSchemaObjectSchema } from "@ai-builder/schemas";
import type { OpenApiSpec, ApiEndpoint, SecurityScheme } from "@ai-builder/schemas";
import type React from "react";

type Setter = React.Dispatch<React.SetStateAction<OpenApiSpec>>;

type ToolResult = Record<string, unknown>;
interface SimpleResult {
  success: true;
}

interface UpdateSpecArgs {
  title?: string;
  version?: string;
  baseUrl?: string | null;
  description?: string | null;
  securityScheme?: SecurityScheme | null;
}

interface UpdateEndpointArgs {
  id: string;
  updates: Partial<Omit<ApiEndpoint, "id">>;
}

interface ReorderEndpointsArgs {
  orderedIds: string[];
}

interface SetRequestBodyArgs {
  id: string;
  schemaRef: string;
  contentType?: string;
  description?: string | null;
}

interface UpdateSchemaArgs {
  name: string;
  description?: string | null;
  properties?: Record<string, string>;
  required?: string[] | null;
}

interface RemoveSchemaArgs {
  name: string;
}

interface AddTagArgs {
  name: string;
  description?: string | null;
}

interface RemoveTagArgs {
  name: string;
}

interface GenerateMockArgs {
  id: string;
}

export function useApiTools(spec: OpenApiSpec, setSpec: Setter) {
  return {
    querySpec: (): Promise<{ dsl: string }> => {
      return Promise.resolve({ dsl: serializeApiDSL(spec) });
    },

    updateSpec: (args: UpdateSpecArgs): Promise<SimpleResult> => {
      setSpec((prev) => ({ ...prev, ...args }));
      return Promise.resolve({ success: true });
    },

    // Worker sends the full endpoint object as top-level keys — parse directly
    addEndpoint: (args: unknown): Promise<ToolResult> => {
      const parsed = ApiEndpointSchema.safeParse(args);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setSpec((prev) => ({ ...prev, endpoints: [...prev.endpoints, parsed.data] }));
      return Promise.resolve({ success: true, endpointId: parsed.data.id });
    },

    removeEndpoint: ({ id }: { id: string }): Promise<SimpleResult> => {
      setSpec((prev) => ({
        ...prev,
        endpoints: prev.endpoints.filter((e) => e.id !== id),
      }));
      return Promise.resolve({ success: true });
    },

    updateEndpoint: ({ id, updates }: UpdateEndpointArgs): Promise<SimpleResult> => {
      setSpec((prev) => ({
        ...prev,
        endpoints: prev.endpoints.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      }));
      return Promise.resolve({ success: true });
    },

    reorderEndpoints: ({ orderedIds }: ReorderEndpointsArgs): Promise<SimpleResult> => {
      setSpec((prev) => {
        const map = Object.fromEntries(prev.endpoints.map((e) => [e.id, e]));
        const endpoints = orderedIds
          .map((id) => map[id])
          .filter((e): e is ApiEndpoint => e !== undefined);
        return { ...prev, endpoints };
      });
      return Promise.resolve({ success: true });
    },

    setRequestBody: ({
      id,
      schemaRef,
      contentType,
      description,
    }: SetRequestBodyArgs): Promise<SimpleResult> => {
      setSpec((prev) => ({
        ...prev,
        endpoints: prev.endpoints.map((e) =>
          e.id === id
            ? {
                ...e,
                requestBody: {
                  contentType: contentType ?? "application/json",
                  schemaRef,
                  description: description ?? null,
                },
              }
            : e
        ),
      }));
      return Promise.resolve({ success: true });
    },

    // Worker sends schema fields as top-level keys — parse directly
    addSchemaObject: (args: unknown): Promise<ToolResult> => {
      const parsed = ApiSchemaObjectSchema.safeParse(args);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setSpec((prev) => ({ ...prev, schemas: [...prev.schemas, parsed.data] }));
      return Promise.resolve({ success: true, schemaName: parsed.data.name });
    },

    updateSchemaObject: ({ name, ...updates }: UpdateSchemaArgs): Promise<SimpleResult> => {
      setSpec((prev) => ({
        ...prev,
        schemas: prev.schemas.map((s) => (s.name === name ? { ...s, ...updates } : s)),
      }));
      return Promise.resolve({ success: true });
    },

    removeSchemaObject: ({ name }: RemoveSchemaArgs): Promise<SimpleResult> => {
      setSpec((prev) => ({
        ...prev,
        schemas: prev.schemas.filter((s) => s.name !== name),
      }));
      return Promise.resolve({ success: true });
    },

    addTag: ({ name, description }: AddTagArgs): Promise<SimpleResult> => {
      setSpec((prev) => ({
        ...prev,
        tagDefinitions: [
          ...(prev.tagDefinitions ?? []).filter((t) => t.name !== name),
          { name, description: description ?? null },
        ],
      }));
      return Promise.resolve({ success: true });
    },

    removeTag: ({ name }: RemoveTagArgs): Promise<SimpleResult> => {
      setSpec((prev) => ({
        ...prev,
        tagDefinitions: (prev.tagDefinitions ?? []).filter((t) => t.name !== name),
      }));
      return Promise.resolve({ success: true });
    },

    generateMockData: ({ id }: GenerateMockArgs): Promise<ToolResult> => {
      const mock = generateMockForEndpoint(spec, id);
      return Promise.resolve({ success: true, mock });
    },

    // ── Backfilled tools ─────────────────────────────────────────────────────

    generateMockServer: (): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeApiDSL(spec) });
    },

    checkBreakingChanges: (_args: { previousDsl: string }): Promise<ToolResult> => {
      return Promise.resolve({ success: true });
    },

    addRateLimiting: ({
      endpointIds,
      limitPerMinute,
    }: {
      endpointIds: string[];
      limitPerMinute: number;
    }): Promise<SimpleResult> => {
      const targetIds = endpointIds.length > 0 ? new Set(endpointIds) : null;
      setSpec((prev) => ({
        ...prev,
        endpoints: prev.endpoints.map((e) => {
          if (targetIds && !targetIds.has(e.id)) return e;
          const has429 = e.responses.some((r) => r.status === 429);
          return has429
            ? e
            : {
                ...e,
                responses: [
                  ...e.responses,
                  { status: 429, description: "Too Many Requests", schema: null },
                ],
              };
        }),
      }));
      void limitPerMinute;
      return Promise.resolve({ success: true });
    },

    generateContractTest: (_args: {
      consumerName: string;
      providerName: string;
    }): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeApiDSL(spec) });
    },

    // ── New tools ────────────────────────────────────────────────────────────

    addWebhookEndpoint: (_args: { resource: string; events: string[] }): Promise<ToolResult> => {
      return Promise.resolve({ success: true });
    },

    generatePostmanCollection: (): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeApiDSL(spec) });
    },

    addPagination: ({
      endpointId,
      strategy,
      pageSize,
    }: {
      endpointId: string;
      strategy: "cursor" | "offset";
      pageSize: number;
    }): Promise<SimpleResult> => {
      setSpec((prev) => ({
        ...prev,
        endpoints: prev.endpoints.map((e) => {
          if (e.id !== endpointId) return e;
          const params = e.parameters ?? [];
          const newParams =
            strategy === "cursor"
              ? [
                  {
                    name: "cursor",
                    in: "query" as const,
                    required: false,
                    description: "Pagination cursor",
                    schema: "string",
                  },
                  {
                    name: "limit",
                    in: "query" as const,
                    required: false,
                    description: `Max items (default ${String(pageSize)})`,
                    schema: "integer",
                  },
                ]
              : [
                  {
                    name: "page",
                    in: "query" as const,
                    required: false,
                    description: "Page number (1-indexed)",
                    schema: "integer",
                  },
                  {
                    name: "limit",
                    in: "query" as const,
                    required: false,
                    description: `Items per page (default ${String(pageSize)})`,
                    schema: "integer",
                  },
                ];
          return { ...e, parameters: [...params, ...newParams] };
        }),
      }));
      return Promise.resolve({ success: true });
    },

    addSchemaEnum: (args: {
      name: string;
      values: string[];
      description?: string | null;
    }): Promise<ToolResult> => {
      setSpec((prev) => ({
        ...prev,
        schemas: [
          ...prev.schemas,
          {
            name: args.name,
            description: args.description ?? null,
            properties: Object.fromEntries(args.values.map((v) => [v, "string"])),
            required: null,
          },
        ],
      }));
      return Promise.resolve({ success: true, schemaName: args.name });
    },

    generateSDK: (_args: { clientName: string }): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeApiDSL(spec) });
    },

    duplicateEndpoint: ({
      sourceId,
      newId,
      newPath,
      newMethod,
    }: {
      sourceId: string;
      newId: string;
      newPath?: string;
      newMethod?: string;
    }): Promise<ToolResult> => {
      const source = spec.endpoints.find((e) => e.id === sourceId);
      if (!source) return Promise.resolve({ error: `Endpoint ${sourceId} not found` });
      const copy = {
        ...source,
        id: newId,
        ...(newPath ? { path: newPath } : {}),
        ...(newMethod ? { method: newMethod as typeof source.method } : {}),
      };
      setSpec((prev) => ({ ...prev, endpoints: [...prev.endpoints, copy] }));
      return Promise.resolve({ success: true, endpointId: newId });
    },

    setSecurityRequirement: ({
      endpointIds,
      requiresAuth,
    }: {
      endpointIds: string[];
      requiresAuth: boolean;
    }): Promise<SimpleResult> => {
      const targetIds = endpointIds.length > 0 ? new Set(endpointIds) : null;
      setSpec((prev) => ({
        ...prev,
        endpoints: prev.endpoints.map((e) =>
          !targetIds || targetIds.has(e.id) ? { ...e, requiresAuth } : e
        ),
      }));
      return Promise.resolve({ success: true });
    },

    // Handled server-side via RAG retrieval; client passthrough
    retrieveDocs: (_args: { query: string }): Promise<ToolResult> => {
      return Promise.resolve({ success: true });
    },

    generateErrorCatalog: (_args: {
      errors: { code: string; message: string }[];
    }): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeApiDSL(spec) });
    },

    addVersioning: ({
      version,
      strategy,
      deprecateExisting,
    }: {
      version: string;
      strategy: "path" | "header";
      deprecateExisting: boolean;
    }): Promise<SimpleResult> => {
      if (strategy === "path") {
        setSpec((prev) => ({
          ...prev,
          endpoints: prev.endpoints.map((e) => ({
            ...e,
            path: e.path.startsWith(`/${version}/`) ? e.path : `/${version}${e.path}`,
            ...(deprecateExisting ? { deprecated: true } : {}),
          })),
        }));
      }
      return Promise.resolve({ success: true });
    },

    generateZodValidators: (_args: { outputFormat: string }): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeApiDSL(spec) });
    },

    detectCircularRefs: (): Promise<ToolResult> => {
      // Circular ref detection runs on full spec DSL; agent interprets the schema graph
      return Promise.resolve({ success: true, dsl: serializeApiDSL(spec) });
    },

    addCORSPolicy: (_args: {
      allowedOrigins: string[];
      allowedMethods: string[];
      allowCredentials: boolean;
    }): Promise<SimpleResult> => {
      // CORS documentation — acknowledged; agent adds OPTIONS endpoints and headers in chat
      return Promise.resolve({ success: true });
    },
  };
}

export type ApiTools = ReturnType<typeof useApiTools>;
