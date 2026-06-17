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

    // Handled server-side via RAG retrieval; client passthrough
    retrieveDocs: (_args: { query: string }): Promise<ToolResult> => {
      return Promise.resolve({ success: true });
    },
  };
}

export type ApiTools = ReturnType<typeof useApiTools>;
