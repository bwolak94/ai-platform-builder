import { describe, it, expect } from "vitest";
import { ColumnSchema, TableSchema, RelationSchema, DbSchemaSchema, IndexSchema } from "../db";

const validColumn = {
  name: "user_id",
  type: "uuid" as const,
  primaryKey: true,
  nullable: false,
  unique: null,
  default: "gen_random_uuid()",
  foreignKey: null,
};

const validTable = {
  name: "users",
  columns: [validColumn],
  indexes: null,
};

const validDbSchema = {
  id: "db_1",
  name: "my_db",
  dialect: "postgresql" as const,
  tables: [validTable],
  relations: null,
};

describe("ColumnSchema", () => {
  it("accepts a valid column", () => {
    expect(ColumnSchema.safeParse(validColumn).success).toBe(true);
  });

  it("rejects column name starting with a digit", () => {
    const result = ColumnSchema.safeParse({ ...validColumn, name: "1user" });
    expect(result.success).toBe(false);
  });

  it("rejects column name with uppercase", () => {
    const result = ColumnSchema.safeParse({ ...validColumn, name: "UserID" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid column types", () => {
    const types = [
      "uuid",
      "text",
      "varchar",
      "integer",
      "bigint",
      "boolean",
      "timestamptz",
      "jsonb",
      "decimal",
      "float",
      "serial",
      "bigserial",
    ] as const;
    for (const type of types) {
      const result = ColumnSchema.safeParse({ ...validColumn, type });
      expect(result.success).toBe(true);
    }
  });

  it("accepts a column with a foreign key", () => {
    const result = ColumnSchema.safeParse({
      ...validColumn,
      name: "post_id",
      foreignKey: { table: "posts", column: "id", onDelete: "CASCADE" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid column type", () => {
    const result = ColumnSchema.safeParse({ ...validColumn, type: "char" });
    expect(result.success).toBe(false);
  });
});

describe("IndexSchema", () => {
  it("accepts a valid index", () => {
    const result = IndexSchema.safeParse({
      name: "idx_email",
      columns: ["email"],
      unique: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a null name", () => {
    const result = IndexSchema.safeParse({ name: null, columns: ["created_at"], unique: false });
    expect(result.success).toBe(true);
  });

  it("rejects empty columns array", () => {
    const result = IndexSchema.safeParse({ name: null, columns: [], unique: false });
    expect(result.success).toBe(false);
  });
});

describe("TableSchema", () => {
  it("accepts a valid table", () => {
    expect(TableSchema.safeParse(validTable).success).toBe(true);
  });

  it("rejects a table name with uppercase", () => {
    const result = TableSchema.safeParse({ ...validTable, name: "Users" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty columns array", () => {
    const result = TableSchema.safeParse({ ...validTable, columns: [] });
    expect(result.success).toBe(false);
  });

  it("accepts a table with indexes", () => {
    const result = TableSchema.safeParse({
      ...validTable,
      indexes: [{ name: "idx_pk", columns: ["user_id"], unique: true }],
    });
    expect(result.success).toBe(true);
  });
});

describe("RelationSchema", () => {
  it("accepts a valid one-to-many relation", () => {
    const result = RelationSchema.safeParse({
      from: "posts.user_id",
      to: "users.id",
      type: "one-to-many",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all relation types", () => {
    for (const type of ["one-to-one", "one-to-many", "many-to-many"] as const) {
      const result = RelationSchema.safeParse({ from: "a.id", to: "b.id", type });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an invalid relation type", () => {
    const result = RelationSchema.safeParse({ from: "a.id", to: "b.id", type: "many-to-one" });
    expect(result.success).toBe(false);
  });
});

describe("DbSchemaSchema", () => {
  it("accepts a valid schema", () => {
    expect(DbSchemaSchema.safeParse(validDbSchema).success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = DbSchemaSchema.safeParse({ ...validDbSchema, name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts all dialects", () => {
    for (const dialect of ["postgresql", "mysql", "sqlite"] as const) {
      const result = DbSchemaSchema.safeParse({ ...validDbSchema, dialect });
      expect(result.success).toBe(true);
    }
  });

  it("accepts schema with relations", () => {
    const result = DbSchemaSchema.safeParse({
      ...validDbSchema,
      relations: [{ from: "posts.user_id", to: "users.id", type: "one-to-many" }],
    });
    expect(result.success).toBe(true);
  });
});
