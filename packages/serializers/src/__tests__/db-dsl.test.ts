import { describe, it, expect } from "vitest";
import {
  serializeDbDSL,
  deserializeDbDSL,
  generateSqlMigration,
  generateTypeScriptTypes,
  generateDrizzleSchema,
  generateMermaidErd,
} from "../db-dsl";
import type { DbSchema } from "@ai-builder/schemas";

const baseSchema: DbSchema = {
  id: "db_1",
  name: "blog_db",
  dialect: "postgresql",
  tables: [
    {
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
        {
          name: "created_at",
          type: "timestamptz",
          primaryKey: null,
          nullable: false,
          unique: null,
          default: "now()",
          foreignKey: null,
        },
      ],
      indexes: [{ name: "idx_users_email", columns: ["email"], unique: true }],
    },
    {
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
        {
          name: "title",
          type: "text",
          primaryKey: null,
          nullable: false,
          unique: null,
          default: null,
          foreignKey: null,
        },
      ],
      indexes: null,
    },
  ],
  relations: [{ from: "posts.user_id", to: "users.id", type: "one-to-many" }],
};

describe("serializeDbDSL", () => {
  it("includes the database name and dialect in the header", () => {
    const dsl = serializeDbDSL(baseSchema);
    expect(dsl).toContain("blog_db");
    expect(dsl).toContain("postgresql");
  });

  it("includes TABLE headers for all tables", () => {
    const dsl = serializeDbDSL(baseSchema);
    expect(dsl).toContain("TABLE users");
    expect(dsl).toContain("TABLE posts");
  });

  it("includes column names and types", () => {
    const dsl = serializeDbDSL(baseSchema);
    expect(dsl).toContain("email");
    expect(dsl).toContain("text");
    expect(dsl).toContain("uuid");
  });

  it("marks relations", () => {
    const dsl = serializeDbDSL(baseSchema);
    expect(dsl).toContain("RELATION");
    expect(dsl).toContain("posts");
    expect(dsl).toContain("users");
  });
});

describe("deserializeDbDSL", () => {
  it("round-trips the database name", () => {
    const dsl = serializeDbDSL(baseSchema);
    const restored = deserializeDbDSL(dsl);
    expect(restored.name).toBe("blog_db");
  });

  it("round-trips table count", () => {
    const dsl = serializeDbDSL(baseSchema);
    const restored = deserializeDbDSL(dsl);
    expect(restored.tables).toHaveLength(2);
  });

  it("round-trips column names in users table", () => {
    const dsl = serializeDbDSL(baseSchema);
    const restored = deserializeDbDSL(dsl);
    const users = restored.tables.find((t) => t.name === "users");
    expect(users).toBeDefined();
    const colNames = users?.columns.map((c) => c.name) ?? [];
    expect(colNames).toContain("email");
    expect(colNames).toContain("id");
  });
});

describe("generateSqlMigration", () => {
  it("produces CREATE TABLE statements", () => {
    const sql = generateSqlMigration(baseSchema);
    expect(sql).toContain("CREATE TABLE");
    expect(sql).toContain("users");
    expect(sql).toContain("posts");
  });

  it("includes column definitions", () => {
    const sql = generateSqlMigration(baseSchema);
    expect(sql).toContain("email");
    expect(sql).toContain("uuid");
  });

  it("includes PRIMARY KEY constraint", () => {
    const sql = generateSqlMigration(baseSchema);
    expect(sql).toMatch(/PRIMARY KEY/i);
  });
});

describe("generateTypeScriptTypes", () => {
  it("produces interface declarations", () => {
    const types = generateTypeScriptTypes(baseSchema);
    expect(types).toContain("interface");
    expect(types).toContain("Users");
    expect(types).toContain("Posts");
  });

  it("maps uuid to string", () => {
    const types = generateTypeScriptTypes(baseSchema);
    expect(types).toContain("string");
  });
});

describe("generateDrizzleSchema", () => {
  it("produces pgTable calls", () => {
    const drizzle = generateDrizzleSchema(baseSchema);
    expect(drizzle).toContain("pgTable");
  });

  it("includes table names", () => {
    const drizzle = generateDrizzleSchema(baseSchema);
    expect(drizzle).toContain("users");
    expect(drizzle).toContain("posts");
  });
});

describe("generateMermaidErd", () => {
  it("produces an erDiagram block", () => {
    const erd = generateMermaidErd(baseSchema);
    expect(erd).toContain("erDiagram");
  });

  it("includes table names in the diagram", () => {
    const erd = generateMermaidErd(baseSchema);
    expect(erd).toContain("users");
    expect(erd).toContain("posts");
  });
});
