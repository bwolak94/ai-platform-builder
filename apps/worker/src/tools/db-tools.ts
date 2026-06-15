import { tool } from "ai";
import { z } from "zod";

const PG_TYPES = [
  "UUID",
  "TEXT",
  "INTEGER",
  "BIGINT",
  "BOOLEAN",
  "TIMESTAMPTZ",
  "JSONB",
  "DECIMAL",
  "SERIAL",
  "VARCHAR",
] as const;

const ON_DELETE = ["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"] as const;

const ColumnSchema = z.object({
  name: z.string().describe("snake_case column name"),
  type: z.enum(PG_TYPES),
  nullable: z.boolean(),
  default: z.string().nullable().optional().describe("SQL default expression"),
  unique: z.boolean().optional(),
  primaryKey: z.boolean().optional(),
  foreignKey: z
    .object({
      table: z.string(),
      column: z.string(),
      onDelete: z.enum(ON_DELETE),
    })
    .nullable()
    .optional(),
});

export const dbTools = {
  querySchema: tool({
    description: "Get the current database schema including all tables, columns, and relations.",
    parameters: z.object({}),
  }),

  addTable: tool({
    description: "Add a new table with initial columns. Always include an id primary key.",
    parameters: z.object({
      name: z.string().describe("snake_case table name"),
      columns: z.array(ColumnSchema).describe("Initial column definitions"),
    }),
  }),

  addColumn: tool({
    description: "Add a column to an existing table.",
    parameters: z.object({
      tableName: z.string(),
      column: ColumnSchema,
    }),
  }),

  addRelation: tool({
    description: "Define a foreign key relationship between two tables.",
    parameters: z.object({
      fromTable: z.string(),
      fromColumn: z.string(),
      toTable: z.string(),
      toColumn: z.string().default("id"),
      onDelete: z.enum(ON_DELETE),
    }),
  }),

  addIndex: tool({
    description: "Add an index to improve query performance on a column or set of columns.",
    parameters: z.object({
      tableName: z.string(),
      columns: z.array(z.string()),
      unique: z.boolean().optional(),
      name: z.string().optional().describe("Optional explicit index name"),
    }),
  }),

  generateMigration: tool({
    description: "Generate the SQL migration file for the current schema state.",
    parameters: z.object({}),
  }),

  retrieveDocs: tool({
    description: "Search docs for PostgreSQL patterns, normalization, and indexing strategies.",
    parameters: z.object({
      query: z.string(),
    }),
  }),
};
