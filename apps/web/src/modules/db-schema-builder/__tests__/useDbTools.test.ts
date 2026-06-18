import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDbState } from "../hooks/useDbState";
import { useDbTools } from "../hooks/useDbTools";

// ─── localStorage stub ─────────────────────────────────────────────────────────

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

const usersTable = {
  name: "users",
  columns: [
    {
      name: "id",
      type: "uuid",
      primaryKey: true,
      nullable: false,
      unique: null,
      default: "gen_random_uuid()",
      foreignKey: null,
    },
    {
      name: "email",
      type: "text",
      primaryKey: null,
      nullable: false,
      unique: true,
      default: null,
      foreignKey: null,
    },
  ],
  indexes: null,
};

const postsTable = {
  name: "posts",
  columns: [
    {
      name: "id",
      type: "uuid",
      primaryKey: true,
      nullable: false,
      unique: null,
      default: "gen_random_uuid()",
      foreignKey: null,
    },
    {
      name: "user_id",
      type: "uuid",
      primaryKey: null,
      nullable: false,
      unique: null,
      default: null,
      foreignKey: { table: "users", column: "id", onDelete: "CASCADE" },
    },
  ],
  indexes: null,
};

// ─── Subject hook ─────────────────────────────────────────────────────────────

function useSubject() {
  const state = useDbState();
  const tools = useDbTools(state.schema, state.setSchema);
  return { ...state, tools };
}

// ─── querySchema ──────────────────────────────────────────────────────────────

describe("querySchema", () => {
  it("returns a non-empty dsl string", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.querySchema();
    expect(typeof response.dsl).toBe("string");
    expect(response.dsl.length).toBeGreaterThan(0);
  });

  it("dsl includes the db name", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.querySchema();
    expect(response.dsl).toContain("my_database");
  });
});

// ─── addTable ─────────────────────────────────────────────────────────────────

describe("addTable", () => {
  it("appends a valid table", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
    });
    expect(result.current.schema.tables).toHaveLength(1);
    expect(result.current.schema.tables[0]?.name).toBe("users");
  });

  it("returns success with tableName", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Record<string, unknown> | undefined;
    await act(async () => {
      response = await result.current.tools.addTable(usersTable);
    });
    expect(response).toMatchObject({ success: true, tableName: "users" });
  });

  it("returns error for invalid table shape", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addTable({ invalid: true });
    expect(response).toMatchObject({ error: expect.any(String) });
    expect(result.current.schema.tables).toHaveLength(0);
  });

  it("normalizes uppercase column types", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable({
        name: "products",
        columns: [{ name: "id", type: "UUID", primaryKey: true }],
        indexes: null,
      });
    });
    const col = result.current.schema.tables[0]?.columns[0];
    expect(col?.type).toBe("uuid");
  });
});

// ─── removeTable ──────────────────────────────────────────────────────────────

describe("removeTable", () => {
  it("removes a table by name", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
      await result.current.tools.removeTable({ name: "users" });
    });
    expect(result.current.schema.tables).toHaveLength(0);
  });

  it("also removes relations referencing the removed table", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
      await result.current.tools.addTable(postsTable);
      await result.current.tools.addRelation({
        fromTable: "posts",
        fromColumn: "user_id",
        toTable: "users",
        toColumn: "id",
        type: "one-to-many",
      });
      await result.current.tools.removeTable({ name: "users" });
    });
    expect(result.current.schema.relations ?? []).toHaveLength(0);
  });
});

// ─── updateTable ──────────────────────────────────────────────────────────────

describe("updateTable", () => {
  it("renames a table", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
      await result.current.tools.updateTable({ name: "users", newName: "members" });
    });
    expect(result.current.schema.tables[0]?.name).toBe("members");
  });

  it("updates the dialect", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.updateTable({ name: "irrelevant", dialect: "sqlite" });
    });
    expect(result.current.schema.dialect).toBe("sqlite");
  });
});

// ─── addColumn ────────────────────────────────────────────────────────────────

describe("addColumn", () => {
  it("adds a column to an existing table", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
      await result.current.tools.addColumn({
        tableName: "users",
        column: {
          name: "name",
          type: "text",
          nullable: true,
          primaryKey: null,
          unique: null,
          default: null,
          foreignKey: null,
        },
      });
    });
    const table = result.current.schema.tables.find((t) => t.name === "users");
    const col = table?.columns.find((c) => c.name === "name");
    expect(col).toBeDefined();
  });

  it("returns error for invalid column shape", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
    });
    const response = await result.current.tools.addColumn({
      tableName: "users",
      column: { invalid: true },
    });
    expect(response).toMatchObject({ error: expect.any(String) });
  });
});

// ─── removeColumn ─────────────────────────────────────────────────────────────

describe("removeColumn", () => {
  it("removes a column from a table", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
      await result.current.tools.removeColumn({ tableName: "users", columnName: "email" });
    });
    const table = result.current.schema.tables.find((t) => t.name === "users");
    expect(table?.columns.find((c) => c.name === "email")).toBeUndefined();
  });

  it("does not remove other columns", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
      await result.current.tools.removeColumn({ tableName: "users", columnName: "email" });
    });
    const table = result.current.schema.tables.find((t) => t.name === "users");
    expect(table?.columns.find((c) => c.name === "id")).toBeDefined();
  });
});

// ─── addRelation ──────────────────────────────────────────────────────────────

describe("addRelation", () => {
  it("adds a relation using flat worker format", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
      await result.current.tools.addTable(postsTable);
      await result.current.tools.addRelation({
        fromTable: "posts",
        fromColumn: "user_id",
        toTable: "users",
        toColumn: "id",
        type: "one-to-many",
      });
    });
    expect(result.current.schema.relations).toHaveLength(1);
    expect(result.current.schema.relations?.[0]?.from).toBe("posts.user_id");
    expect(result.current.schema.relations?.[0]?.to).toBe("users.id");
  });

  it("adds a relation using { relation } wrapper format", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addRelation({
        relation: { from: "posts.user_id", to: "users.id", type: "many-to-many" },
      });
    });
    expect(result.current.schema.relations).toHaveLength(1);
  });

  it("returns error for invalid relation args", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addRelation({ invalid: true });
    expect(response).toMatchObject({ error: expect.any(String) });
  });
});

// ─── removeRelation ───────────────────────────────────────────────────────────

describe("removeRelation", () => {
  it("removes a relation by from/to", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addRelation({
        fromTable: "posts",
        fromColumn: "user_id",
        toTable: "users",
        toColumn: "id",
        type: "one-to-many",
      });
      await result.current.tools.removeRelation({ from: "posts.user_id", to: "users.id" });
    });
    expect(result.current.schema.relations ?? []).toHaveLength(0);
  });
});

// ─── addIndex ─────────────────────────────────────────────────────────────────

describe("addIndex", () => {
  it("adds an index to a table using flat format", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
      await result.current.tools.addIndex({
        tableName: "users",
        columns: ["email"],
        unique: true,
        name: "idx_users_email",
      });
    });
    const table = result.current.schema.tables.find((t) => t.name === "users");
    expect(table?.indexes).toHaveLength(1);
    expect(table?.indexes?.[0]?.name).toBe("idx_users_email");
  });

  it("returns error for invalid index shape", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
    });
    const response = await result.current.tools.addIndex({
      tableName: "users",
      index: { invalid: true },
    });
    expect(response).toMatchObject({ error: expect.any(String) });
  });
});

// ─── removeIndex ──────────────────────────────────────────────────────────────

describe("removeIndex", () => {
  it("removes an index by name", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
      await result.current.tools.addIndex({
        tableName: "users",
        columns: ["email"],
        unique: true,
        name: "idx_users_email",
      });
      await result.current.tools.removeIndex({ tableName: "users", indexName: "idx_users_email" });
    });
    const table = result.current.schema.tables.find((t) => t.name === "users");
    expect(table?.indexes ?? []).toHaveLength(0);
  });
});

// ─── updateSchema ─────────────────────────────────────────────────────────────

describe("updateSchema", () => {
  it("updates the schema name", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.updateSchema({ name: "production_db" });
    });
    expect(result.current.schema.name).toBe("production_db");
  });

  it("updates the dialect", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.updateSchema({ dialect: "mysql" });
    });
    expect(result.current.schema.dialect).toBe("mysql");
  });

  it("returns error for invalid args", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.updateSchema({ dialect: "oracle" });
    expect(response).toMatchObject({ error: expect.any(String) });
  });
});

// ─── generateMigration ────────────────────────────────────────────────────────

describe("generateMigration", () => {
  it("returns sql containing CREATE TABLE", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
    });
    const response = await result.current.tools.generateMigration();
    expect(response.sql).toContain("CREATE TABLE");
    expect(response.sql).toContain("users");
  });
});

// ─── generateTypeScriptTypes ─────────────────────────────────────────────────

describe("generateTypeScriptTypes", () => {
  it("returns TypeScript interface declarations", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
    });
    const response = await result.current.tools.generateTypeScriptTypes();
    expect(response.types).toContain("interface");
    expect(response.types).toContain("Users");
  });
});

// ─── generateDrizzleSchema ────────────────────────────────────────────────────

describe("generateDrizzleSchema", () => {
  it("returns drizzle schema with pgTable", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(usersTable);
    });
    const response = await result.current.tools.generateDrizzleSchema();
    expect(response.drizzle).toContain("pgTable");
  });
});

// ─── analyzeQueryPerformance ─────────────────────────────────────────────────

describe("analyzeQueryPerformance", () => {
  it("returns findings array", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.analyzeQueryPerformance();
    expect(Array.isArray(response.findings)).toBe(true);
  });

  it("flags FK columns without an index", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(postsTable);
    });
    const response = await result.current.tools.analyzeQueryPerformance();
    const findings = response.findings as string[];
    expect(findings.some((f) => f.includes("user_id"))).toBe(true);
  });

  it("does not flag FK columns that have an index", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addTable(postsTable);
      await result.current.tools.addIndex({
        tableName: "posts",
        columns: ["user_id"],
        unique: false,
        name: "idx_posts_user_id",
      });
    });
    const response = await result.current.tools.analyzeQueryPerformance();
    const findings = response.findings as string[];
    expect(findings.some((f) => f.includes("user_id"))).toBe(false);
  });
});

// ─── passthrough and dsl tools ────────────────────────────────────────────────

describe("passthrough and dsl tools", () => {
  it("generateSeedData returns dsl", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateSeedData({});
    expect(response).toHaveProperty("dsl");
  });

  it("generateGraphQLSchema returns dsl", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateGraphQLSchema();
    expect(response).toHaveProperty("dsl");
  });

  it("generatePrismaSchema returns dsl", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generatePrismaSchema();
    expect(response).toHaveProperty("dsl");
  });

  it("generateRLSPolicies returns dsl", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateRLSPolicies({
      tableName: "users",
      ownerColumn: "user_id",
      allowPublicRead: false,
    });
    expect(response).toHaveProperty("dsl");
  });

  it("analyzeNormalization returns dsl", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.analyzeNormalization();
    expect(response).toHaveProperty("dsl");
  });

  it("generateERDMermaid returns dsl", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.generateERDMermaid();
    expect(response).toHaveProperty("dsl");
  });

  it("addCheckConstraint returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addCheckConstraint({
      tableName: "products",
      columnName: "price",
      expression: "price > 0",
    });
    expect(response).toMatchObject({ success: true });
  });

  it("addEnum returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addEnum({
      name: "user_role",
      values: ["admin", "editor", "viewer"],
    });
    expect(response).toMatchObject({ success: true });
  });

  it("addTableComment returns success", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addTableComment({
      tableName: "users",
      comment: "Stores registered user accounts",
    });
    expect(response).toMatchObject({ success: true });
  });
});
