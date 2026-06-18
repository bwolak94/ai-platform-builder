import { tool } from "ai";
import { z } from "zod";

const COLUMN_TYPES = [
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

const DIALECTS = ["postgresql", "mysql", "sqlite"] as const;
const ON_DELETE = ["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"] as const;
const RELATION_TYPES = ["one-to-one", "one-to-many", "many-to-many"] as const;

const ColumnSchema = z.object({
  name: z.string().describe("snake_case column name"),
  type: z.enum(COLUMN_TYPES).describe("Column data type (lowercase)"),
  nullable: z.boolean().nullable().default(null),
  default: z.string().nullable().default(null).describe("SQL default expression"),
  unique: z.boolean().nullable().default(null),
  primaryKey: z.boolean().nullable().default(null),
  foreignKey: z
    .object({
      table: z.string(),
      column: z.string(),
      onDelete: z.enum(ON_DELETE).nullable().default(null),
    })
    .nullable()
    .default(null),
});

export const dbTools = {
  querySchema: tool({
    description:
      "Get the current database schema as a compact DSL. ALWAYS call this first before making any modifications.",
    inputSchema: z.object({}),
  }),

  addTable: tool({
    description:
      "Add a new table with initial columns. Always include a uuid primary key and created_at/updated_at timestamps.",
    inputSchema: z.object({
      name: z.string().describe("snake_case table name"),
      columns: z.array(ColumnSchema).describe("Initial column definitions"),
    }),
  }),

  removeTable: tool({
    description: "Remove a table from the schema by name.",
    inputSchema: z.object({
      name: z.string().describe("Table name to remove"),
    }),
  }),

  updateTable: tool({
    description: "Rename a table or change the schema dialect.",
    inputSchema: z.object({
      name: z.string().describe("Current table name"),
      newName: z.string().optional().describe("New table name"),
      dialect: z.enum(DIALECTS).optional().describe("Change schema dialect"),
    }),
  }),

  addColumn: tool({
    description: "Add a column to an existing table.",
    inputSchema: z.object({
      tableName: z.string(),
      column: ColumnSchema,
    }),
  }),

  removeColumn: tool({
    description: "Remove a column from a table.",
    inputSchema: z.object({
      tableName: z.string(),
      columnName: z.string(),
    }),
  }),

  updateColumn: tool({
    description: "Update properties of an existing column.",
    inputSchema: z.object({
      tableName: z.string(),
      columnName: z.string(),
      updates: z.object({
        type: z.enum(COLUMN_TYPES).optional(),
        nullable: z.boolean().nullable().optional(),
        default: z.string().nullable().optional(),
        unique: z.boolean().nullable().optional(),
      }),
    }),
  }),

  addRelation: tool({
    description: "Define a semantic relationship between two tables.",
    inputSchema: z.object({
      fromTable: z.string().describe("Source table name"),
      fromColumn: z.string().describe("Source column (usually a FK column)"),
      toTable: z.string().describe("Target table name"),
      toColumn: z.string().default("id").describe("Target column (usually id)"),
      type: z.enum(RELATION_TYPES).default("one-to-many"),
      onDelete: z.enum(ON_DELETE).optional(),
    }),
  }),

  removeRelation: tool({
    description: "Remove a relation between two tables.",
    inputSchema: z.object({
      from: z.string().describe("Source as 'table.column'"),
      to: z.string().describe("Target as 'table.column'"),
    }),
  }),

  addIndex: tool({
    description: "Add an index to improve query performance on a column or set of columns.",
    inputSchema: z.object({
      tableName: z.string(),
      columns: z.array(z.string()),
      unique: z.boolean().optional().default(false),
      name: z.string().optional().describe("Optional explicit index name"),
    }),
  }),

  removeIndex: tool({
    description: "Remove a named index from a table.",
    inputSchema: z.object({
      tableName: z.string(),
      indexName: z.string(),
    }),
  }),

  updateSchema: tool({
    description: "Update top-level schema metadata such as name or dialect.",
    inputSchema: z.object({
      name: z.string().min(1).optional().describe("New database name"),
      dialect: z.enum(DIALECTS).optional().describe("Target SQL dialect"),
    }),
  }),

  generateMigration: tool({
    description: "Generate the SQL migration file for the current schema state.",
    inputSchema: z.object({}),
  }),

  generateTypeScriptTypes: tool({
    description: "Generate TypeScript interfaces for all tables in the schema.",
    inputSchema: z.object({}),
  }),

  generateDrizzleSchema: tool({
    description: "Generate a Drizzle ORM schema file for the current tables.",
    inputSchema: z.object({}),
  }),

  generateSeedData: tool({
    description:
      "Generate a seed data file (seed.sql or seed.ts for Prisma/Drizzle) with realistic deterministic fixture data for all tables.",
    inputSchema: z.object({
      format: z
        .enum(["sql", "prisma", "drizzle"])
        .default("sql")
        .describe("Output format for seed data"),
      rowsPerTable: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(5)
        .describe("Number of seed rows to generate per table"),
    }),
  }),

  analyzeQueryPerformance: tool({
    description:
      "Analyze the current schema for performance risks: missing indexes on FK columns, unindexed high-cardinality columns, N+1 relation patterns, and tables likely to need pagination. Returns a list of findings with suggested fixes.",
    inputSchema: z.object({}),
  }),

  generateGraphQLSchema: tool({
    description:
      "Generate a GraphQL SDL schema from the current relational schema, including input types, query/mutation outlines, and resolver stubs.",
    inputSchema: z.object({}),
  }),

  generateSupabaseFunction: tool({
    description:
      "Generate a typed Supabase Edge Function scaffold with CRUD handlers for a specific table, including RLS-aware queries.",
    inputSchema: z.object({
      tableName: z.string().describe("The table to generate the Edge Function for"),
      operations: z
        .array(z.enum(["list", "get", "create", "update", "delete"]))
        .describe("Which CRUD operations to include"),
    }),
  }),

  addCheckConstraint: tool({
    description:
      "Add a CHECK constraint to a column in a table (e.g. price > 0, status IN ('active','inactive')).",
    inputSchema: z.object({
      tableName: z.string(),
      columnName: z.string(),
      expression: z
        .string()
        .describe(
          "SQL CHECK expression, e.g. 'price > 0' or \"status IN ('active','inactive')\"\n"
        ),
      constraintName: z.string().optional().describe("Optional explicit constraint name"),
    }),
  }),

  addEnum: tool({
    description:
      "Add a custom PostgreSQL enum type that columns can reference. Generates CREATE TYPE … AS ENUM in the migration output.",
    inputSchema: z.object({
      name: z.string().describe("snake_case enum type name, e.g. 'user_role'"),
      values: z
        .array(z.string())
        .min(1)
        .describe("Allowed values, e.g. ['admin','editor','viewer']"),
    }),
  }),

  generatePrismaSchema: tool({
    description:
      "Generate a Prisma schema file (schema.prisma) from the current database schema, including model definitions, field types, relations, and @@index directives.",
    inputSchema: z.object({}),
  }),

  generateRLSPolicies: tool({
    description:
      "Generate Supabase Row Level Security (RLS) policy SQL for a table: one select policy, one insert policy, one update policy, and one delete policy using auth.uid().",
    inputSchema: z.object({
      tableName: z.string().describe("Table to generate RLS policies for"),
      ownerColumn: z
        .string()
        .default("user_id")
        .describe("Column that stores the owning user ID (compared against auth.uid())"),
      allowPublicRead: z
        .boolean()
        .default(false)
        .describe("If true, the select policy allows anon reads"),
    }),
  }),

  analyzeNormalization: tool({
    description:
      "Analyze the current schema for normalization violations: repeating groups, partial dependencies, transitive dependencies, and missing junction tables for many-to-many relations. Returns findings with suggested refactoring steps.",
    inputSchema: z.object({}),
  }),

  addTableComment: tool({
    description:
      "Add a documentation comment to a table. Appears as COMMENT ON TABLE in the migration output and as JSDoc in generated TypeScript types.",
    inputSchema: z.object({
      tableName: z.string(),
      comment: z.string().describe("Human-readable description of the table's purpose"),
    }),
  }),

  generateERDMermaid: tool({
    description:
      "Generate a Mermaid erDiagram block from the current schema, showing all tables, their columns, and relationships. Ready to paste into a Markdown file or Mermaid Live.",
    inputSchema: z.object({}),
  }),

  retrieveDocs: tool({
    description:
      "Search docs for PostgreSQL patterns, normalization, indexing strategies, and ORM usage.",
    inputSchema: z.object({
      query: z.string(),
    }),
  }),
};
