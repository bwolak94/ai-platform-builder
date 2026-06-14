import { serializeApiDSL } from "@ai-builder/serializers";
import { ApiEndpointSchema, ApiSchemaObjectSchema } from "@ai-builder/schemas";
import type { OpenApiSpec, ApiEndpoint } from "@ai-builder/schemas";
import type React from "react";

type Setter = React.Dispatch<React.SetStateAction<OpenApiSpec>>;

interface AddEndpointArgs {
  endpoint: unknown;
}
interface RemoveEndpointArgs {
  endpointId: string;
}
interface UpdateEndpointArgs {
  endpointId: string;
  updates: Partial<ApiEndpoint>;
}
interface AddSchemaArgs {
  schema: unknown;
}
interface GenerateMockArgs {
  endpointId: string;
}

type ToolResult = Record<string, unknown>;

interface SimpleResult {
  success: true;
}

export function useApiTools(spec: OpenApiSpec, setSpec: Setter) {
  return {
    addEndpoint: ({ endpoint }: AddEndpointArgs): Promise<ToolResult> => {
      const parsed = ApiEndpointSchema.safeParse(endpoint);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setSpec((prev) => ({ ...prev, endpoints: [...prev.endpoints, parsed.data] }));
      return Promise.resolve({ success: true, endpointId: parsed.data.id });
    },

    removeEndpoint: ({ endpointId }: RemoveEndpointArgs): Promise<SimpleResult> => {
      setSpec((prev) => ({
        ...prev,
        endpoints: prev.endpoints.filter((e) => e.id !== endpointId),
      }));
      return Promise.resolve({ success: true });
    },

    updateEndpoint: ({ endpointId, updates }: UpdateEndpointArgs): Promise<SimpleResult> => {
      setSpec((prev) => ({
        ...prev,
        endpoints: prev.endpoints.map((e) => (e.id === endpointId ? { ...e, ...updates } : e)),
      }));
      return Promise.resolve({ success: true });
    },

    addSchemaObject: ({ schema }: AddSchemaArgs): Promise<ToolResult> => {
      const parsed = ApiSchemaObjectSchema.safeParse(schema);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setSpec((prev) => ({ ...prev, schemas: [...prev.schemas, parsed.data] }));
      return Promise.resolve({ success: true, schemaName: parsed.data.name });
    },

    querySpec: (): Promise<{ dsl: string }> => {
      return Promise.resolve({ dsl: serializeApiDSL(spec) });
    },

    generateMockData: ({ endpointId }: GenerateMockArgs): Promise<ToolResult> => {
      const ep = spec.endpoints.find((e) => e.id === endpointId);
      if (!ep) return Promise.resolve({ error: "Endpoint not found" });
      const mock = { id: "123", createdAt: new Date().toISOString() };
      return Promise.resolve({ success: true, mock });
    },
  };
}

export type ApiTools = ReturnType<typeof useApiTools>;
