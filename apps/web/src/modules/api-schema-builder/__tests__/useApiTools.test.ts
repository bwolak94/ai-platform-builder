import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useApiState } from "../hooks/useApiState";
import { useApiTools } from "../hooks/useApiTools";
import type { ApiEndpoint, ApiSchemaObject } from "@ai-builder/schemas";

// ─── localStorage stub ────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      store = Object.fromEntries(Object.entries(store).filter(([k]) => k !== key));
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const listEndpoint: ApiEndpoint = {
  id: "ep_001",
  method: "GET",
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

const createEndpoint: ApiEndpoint = {
  id: "ep_002",
  method: "POST",
  path: "/users",
  summary: "Create user",
  description: null,
  parameters: null,
  requestBody: { contentType: "application/json", schemaRef: "CreateUserInput", description: null },
  responses: [
    { status: 201, description: "Created", schema: "User" },
    { status: 400, description: "Bad Request", schema: null },
  ],
  tags: null,
  deprecated: null,
  requiresAuth: true,
};

const userSchema: ApiSchemaObject = {
  name: "User",
  description: "A user record",
  properties: { id: "string", name: "string", email: "string" },
  required: ["id", "name", "email"],
};

function useSubject() {
  const state = useApiState();
  const tools = useApiTools(state.spec, state.setSpec);
  return { ...state, tools };
}

// ─── querySpec ────────────────────────────────────────────────────────────────

describe("querySpec", () => {
  it("returns a DSL string containing the API title", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.querySpec();
    expect(response).toMatchObject({ dsl: expect.stringContaining("My API") });
  });

  it("DSL contains endpoint after it is added", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addEndpoint(listEndpoint);
    });
    const response = await result.current.tools.querySpec();
    expect(response.dsl).toContain("GET");
    expect(response.dsl).toContain("/users");
  });
});

// ─── updateSpec ───────────────────────────────────────────────────────────────

describe("updateSpec", () => {
  it("updates the title", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.updateSpec({ title: "Product API" });
    });
    expect(result.current.spec.title).toBe("Product API");
  });

  it("updates baseUrl and securityScheme together", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.updateSpec({
        baseUrl: "https://api.example.com",
        securityScheme: "BearerJWT",
      });
    });
    expect(result.current.spec.baseUrl).toBe("https://api.example.com");
    expect(result.current.spec.securityScheme).toBe("BearerJWT");
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Awaited<ReturnType<typeof result.current.tools.updateSpec>> | undefined;
    await act(async () => {
      response = await result.current.tools.updateSpec({ version: "2.0.0" });
    });
    expect(response).toMatchObject({ success: true });
  });
});

// ─── addEndpoint ──────────────────────────────────────────────────────────────

describe("addEndpoint", () => {
  it("appends a valid endpoint", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addEndpoint(listEndpoint);
    });
    expect(result.current.spec.endpoints).toHaveLength(1);
    expect(result.current.spec.endpoints[0]?.id).toBe("ep_001");
  });

  it("returns success with endpointId", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Awaited<ReturnType<typeof result.current.tools.addEndpoint>> | undefined;
    await act(async () => {
      response = await result.current.tools.addEndpoint(listEndpoint);
    });
    expect(response).toMatchObject({ success: true, endpointId: "ep_001" });
  });

  it("returns error for invalid endpoint shape", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addEndpoint({ method: "GET" });
    expect(response).toMatchObject({ error: expect.any(String) });
    expect(result.current.spec.endpoints).toHaveLength(0);
  });

  it("coerces omitted nullable fields to null", async () => {
    const { result } = renderHook(() => useSubject());
    const minimal = {
      id: "ep_min",
      method: "GET",
      path: "/ping",
      responses: [{ status: 200, description: "OK" }],
    };
    await act(async () => {
      await result.current.tools.addEndpoint(minimal);
    });
    const ep = result.current.spec.endpoints[0];
    expect(ep?.summary).toBeNull();
    expect(ep?.parameters).toBeNull();
    expect(ep?.requestBody).toBeNull();
  });

  it("adds multiple endpoints", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addEndpoint(listEndpoint);
      await result.current.tools.addEndpoint(createEndpoint);
    });
    expect(result.current.spec.endpoints).toHaveLength(2);
  });
});

// ─── removeEndpoint ───────────────────────────────────────────────────────────

describe("removeEndpoint", () => {
  it("removes endpoint by id", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addEndpoint(listEndpoint);
      await result.current.tools.addEndpoint(createEndpoint);
      await result.current.tools.removeEndpoint({ id: "ep_001" });
    });
    expect(result.current.spec.endpoints).toHaveLength(1);
    expect(result.current.spec.endpoints[0]?.id).toBe("ep_002");
  });

  it("is a no-op for unknown id", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addEndpoint(listEndpoint);
      await result.current.tools.removeEndpoint({ id: "not_exist" });
    });
    expect(result.current.spec.endpoints).toHaveLength(1);
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Awaited<ReturnType<typeof result.current.tools.removeEndpoint>> | undefined;
    await act(async () => {
      response = await result.current.tools.removeEndpoint({ id: "ep_001" });
    });
    expect(response).toMatchObject({ success: true });
  });
});

// ─── updateEndpoint ───────────────────────────────────────────────────────────

describe("updateEndpoint", () => {
  it("updates summary on matching endpoint", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addEndpoint(listEndpoint);
      await result.current.tools.updateEndpoint({
        id: "ep_001",
        updates: { summary: "Get all users" },
      });
    });
    expect(result.current.spec.endpoints[0]?.summary).toBe("Get all users");
  });

  it("does not touch other endpoints", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addEndpoint(listEndpoint);
      await result.current.tools.addEndpoint(createEndpoint);
      await result.current.tools.updateEndpoint({ id: "ep_001", updates: { deprecated: true } });
    });
    expect(result.current.spec.endpoints[0]?.deprecated).toBe(true);
    expect(result.current.spec.endpoints[1]?.deprecated).toBeNull();
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Awaited<ReturnType<typeof result.current.tools.updateEndpoint>> | undefined;
    await act(async () => {
      response = await result.current.tools.updateEndpoint({ id: "ep_001", updates: {} });
    });
    expect(response).toMatchObject({ success: true });
  });
});

// ─── reorderEndpoints ─────────────────────────────────────────────────────────

describe("reorderEndpoints", () => {
  it("reorders by provided id array", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addEndpoint(listEndpoint);
      await result.current.tools.addEndpoint(createEndpoint);
      await result.current.tools.reorderEndpoints({ orderedIds: ["ep_002", "ep_001"] });
    });
    expect(result.current.spec.endpoints[0]?.id).toBe("ep_002");
    expect(result.current.spec.endpoints[1]?.id).toBe("ep_001");
  });

  it("excludes ids that do not exist in the spec", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addEndpoint(listEndpoint);
      await result.current.tools.reorderEndpoints({ orderedIds: ["ghost", "ep_001"] });
    });
    expect(result.current.spec.endpoints).toHaveLength(1);
    expect(result.current.spec.endpoints[0]?.id).toBe("ep_001");
  });
});

// ─── setRequestBody ───────────────────────────────────────────────────────────

describe("setRequestBody", () => {
  it("sets request body on endpoint", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addEndpoint(listEndpoint);
      await result.current.tools.setRequestBody({ id: "ep_001", schemaRef: "CreateUserInput" });
    });
    const ep = result.current.spec.endpoints[0];
    expect(ep?.requestBody?.schemaRef).toBe("CreateUserInput");
    expect(ep?.requestBody?.contentType).toBe("application/json");
  });

  it("respects custom contentType", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addEndpoint(listEndpoint);
      await result.current.tools.setRequestBody({
        id: "ep_001",
        schemaRef: "FileUpload",
        contentType: "multipart/form-data",
      });
    });
    expect(result.current.spec.endpoints[0]?.requestBody?.contentType).toBe("multipart/form-data");
  });
});

// ─── addSchemaObject ──────────────────────────────────────────────────────────

describe("addSchemaObject", () => {
  it("appends a valid schema", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSchemaObject(userSchema);
    });
    expect(result.current.spec.schemas).toHaveLength(1);
    expect(result.current.spec.schemas[0]?.name).toBe("User");
  });

  it("returns success with schemaName", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Awaited<ReturnType<typeof result.current.tools.addSchemaObject>> | undefined;
    await act(async () => {
      response = await result.current.tools.addSchemaObject(userSchema);
    });
    expect(response).toMatchObject({ success: true, schemaName: "User" });
  });

  it("returns error for invalid schema", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addSchemaObject({ name: "123invalid" });
    expect(response).toMatchObject({ error: expect.any(String) });
    expect(result.current.spec.schemas).toHaveLength(0);
  });
});

// ─── updateSchemaObject ───────────────────────────────────────────────────────

describe("updateSchemaObject", () => {
  it("updates properties on matching schema", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSchemaObject(userSchema);
      await result.current.tools.updateSchemaObject({
        name: "User",
        properties: { id: "string", name: "string", email: "string", role: "string" },
      });
    });
    expect(result.current.spec.schemas[0]?.properties).toHaveProperty("role");
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Awaited<ReturnType<typeof result.current.tools.updateSchemaObject>> | undefined;
    await act(async () => {
      response = await result.current.tools.updateSchemaObject({ name: "User" });
    });
    expect(response).toMatchObject({ success: true });
  });
});

// ─── removeSchemaObject ───────────────────────────────────────────────────────

describe("removeSchemaObject", () => {
  it("removes schema by name", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSchemaObject(userSchema);
      await result.current.tools.removeSchemaObject({ name: "User" });
    });
    expect(result.current.spec.schemas).toHaveLength(0);
  });

  it("is a no-op for unknown name", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addSchemaObject(userSchema);
      await result.current.tools.removeSchemaObject({ name: "Ghost" });
    });
    expect(result.current.spec.schemas).toHaveLength(1);
  });
});

// ─── addTag / removeTag ───────────────────────────────────────────────────────

describe("addTag", () => {
  it("adds a tag with description", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTag({ name: "users", description: "User operations" });
    });
    const tags = result.current.spec.tagDefinitions ?? [];
    expect(tags).toHaveLength(1);
    expect(tags[0]?.name).toBe("users");
    expect(tags[0]?.description).toBe("User operations");
  });

  it("deduplicates: re-adding an existing tag replaces it", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTag({ name: "users", description: "Old" });
      await result.current.tools.addTag({ name: "users", description: "New" });
    });
    const tags = result.current.spec.tagDefinitions ?? [];
    expect(tags).toHaveLength(1);
    expect(tags[0]?.description).toBe("New");
  });
});

describe("removeTag", () => {
  it("removes a tag by name", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTag({ name: "users" });
      await result.current.tools.addTag({ name: "products" });
      await result.current.tools.removeTag({ name: "users" });
    });
    const tags = result.current.spec.tagDefinitions ?? [];
    expect(tags).toHaveLength(1);
    expect(tags[0]?.name).toBe("products");
  });
});

// ─── generateMockData ─────────────────────────────────────────────────────────

describe("generateMockData", () => {
  it("returns mock for a known endpoint id", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addEndpoint(listEndpoint);
    });
    const response = await result.current.tools.generateMockData({ id: "ep_001" });
    expect(response).toMatchObject({ success: true });
    expect(response).toHaveProperty("mock");
  });
});

// ─── retrieveDocs ─────────────────────────────────────────────────────────────

describe("retrieveDocs", () => {
  it("returns success (client passthrough)", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.retrieveDocs({ query: "REST best practices" });
    expect(response).toMatchObject({ success: true });
  });
});
