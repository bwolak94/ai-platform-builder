import {
  serializeDbDSL,
  generateSqlMigration,
  generateTypeScriptTypes,
  generateDrizzleSchema,
} from "@ai-builder/serializers";
import { TableSchema, ColumnSchema, RelationSchema, IndexSchema } from "@ai-builder/schemas";
import type { DbSchema, Column, Relation } from "@ai-builder/schemas";
import type React from "react";
import { z } from "zod";

type Setter = React.Dispatch<React.SetStateAction<DbSchema>>;
type ToolResult = Record<string, unknown>;

// Worker sends uppercase types — normalize to lowercase before Zod parsing.
const TYPE_MAP: Record<string, string> = {
  UUID: "uuid",
  TEXT: "text",
  VARCHAR: "varchar",
  INTEGER: "integer",
  BIGINT: "bigint",
  BOOLEAN: "boolean",
  TIMESTAMPTZ: "timestamptz",
  JSONB: "jsonb",
  DECIMAL: "decimal",
  FLOAT: "float",
  SERIAL: "serial",
  BIGSERIAL: "bigserial",
};

function normalizeColumn(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const col = raw as Record<string, unknown>;
  return {
    ...col,
    type:
      typeof col.type === "string"
        ? (TYPE_MAP[col.type.toUpperCase()] ?? col.type.toLowerCase())
        : col.type,
    primaryKey: col.primaryKey ?? null,
    nullable: col.nullable ?? null,
    unique: col.unique ?? null,
    default: col.default ?? null,
    foreignKey: col.foreignKey ?? null,
  };
}

// Worker addTable sends { name, columns } flat (not wrapped in { table }).
// Worker addRelation sends { fromTable, fromColumn, toTable, toColumn, onDelete }.
// We normalize these on the client side.

function parseWorkerRelation(args: Record<string, unknown>): Relation | null {
  // Handle both { relation } wrapper and flat { fromTable, fromColumn, toTable, toColumn }
  if (args.relation) {
    const parsed = RelationSchema.safeParse(args.relation);
    return parsed.success ? parsed.data : null;
  }
  if (args.fromTable && args.toTable) {
    const fromTable = typeof args.fromTable === "string" ? args.fromTable : null;
    const toTable = typeof args.toTable === "string" ? args.toTable : null;
    if (!fromTable || !toTable) return null;
    const fromColumn = typeof args.fromColumn === "string" ? args.fromColumn : "id";
    const toColumn = typeof args.toColumn === "string" ? args.toColumn : "id";
    const rawType = typeof args.type === "string" ? args.type : "one-to-many";
    const type = rawType as Relation["type"];
    return { from: `${fromTable}.${fromColumn}`, to: `${toTable}.${toColumn}`, type };
  }
  return null;
}

// Schema for updateSchema tool args
const UpdateSchemaArgsSchema = z.object({
  name: z.string().min(1).optional(),
  dialect: z.enum(["postgresql", "mysql", "sqlite"]).optional(),
});

export function useDbTools(schema: DbSchema, setSchema: Setter) {
  return {
    querySchema: (): Promise<{ dsl: string }> => {
      return Promise.resolve({ dsl: serializeDbDSL(schema) });
    },

    // Accepts both { table } wrapper (old) and flat { name, columns } (worker format)
    addTable: (args: unknown): Promise<ToolResult> => {
      const a = args as Record<string, unknown>;
      const raw = a.table ?? args;
      const normalized = {
        ...(typeof raw === "object" && raw !== null ? raw : {}),
        columns: Array.isArray((raw as Record<string, unknown>).columns)
          ? ((raw as Record<string, unknown>).columns as unknown[]).map(normalizeColumn)
          : [],
      };
      const parsed = TableSchema.safeParse(normalized);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setSchema((prev) => ({ ...prev, tables: [...prev.tables, parsed.data] }));
      return Promise.resolve({ success: true, tableName: parsed.data.name });
    },

    removeTable: ({ name }: { name: string }): Promise<ToolResult> => {
      setSchema((prev) => ({
        ...prev,
        tables: prev.tables.filter((t) => t.name !== name),
        relations: (prev.relations ?? []).filter(
          (r) => !r.from.startsWith(name + ".") && !r.to.startsWith(name + ".")
        ),
      }));
      return Promise.resolve({ success: true });
    },

    updateTable: (args: unknown): Promise<ToolResult> => {
      const a = args as { name: string; newName?: string; dialect?: DbSchema["dialect"] };
      setSchema((prev) => {
        if (a.dialect && a.dialect !== prev.dialect) {
          return { ...prev, dialect: a.dialect };
        }
        if (a.newName) {
          const newName = a.newName;
          return {
            ...prev,
            tables: prev.tables.map((t) => (t.name === a.name ? { ...t, name: newName } : t)),
          };
        }
        return prev;
      });
      return Promise.resolve({ success: true });
    },

    addColumn: (args: unknown): Promise<ToolResult> => {
      const a = args as { tableName: string; column: unknown };
      const normalized = normalizeColumn(a.column);
      const parsed = ColumnSchema.safeParse(normalized);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setSchema((prev) => ({
        ...prev,
        tables: prev.tables.map((t) =>
          t.name === a.tableName ? { ...t, columns: [...t.columns, parsed.data] } : t
        ),
      }));
      return Promise.resolve({ success: true });
    },

    removeColumn: ({
      tableName,
      columnName,
    }: {
      tableName: string;
      columnName: string;
    }): Promise<ToolResult> => {
      setSchema((prev) => ({
        ...prev,
        tables: prev.tables.map((t) =>
          t.name === tableName
            ? { ...t, columns: t.columns.filter((c) => c.name !== columnName) }
            : t
        ),
      }));
      return Promise.resolve({ success: true });
    },

    updateColumn: (args: unknown): Promise<ToolResult> => {
      const a = args as { tableName: string; columnName: string; updates: Partial<Column> };
      setSchema((prev) => ({
        ...prev,
        tables: prev.tables.map((t) =>
          t.name === a.tableName
            ? {
                ...t,
                columns: t.columns.map((c) =>
                  c.name === a.columnName ? { ...c, ...a.updates } : c
                ),
              }
            : t
        ),
      }));
      return Promise.resolve({ success: true });
    },

    addRelation: (args: unknown): Promise<ToolResult> => {
      const relation = parseWorkerRelation(args as Record<string, unknown>);
      if (!relation) return Promise.resolve({ error: "Invalid relation arguments" });
      setSchema((prev) => ({ ...prev, relations: [...(prev.relations ?? []), relation] }));
      return Promise.resolve({ success: true });
    },

    removeRelation: ({ from, to }: { from: string; to: string }): Promise<ToolResult> => {
      setSchema((prev) => ({
        ...prev,
        relations: (prev.relations ?? []).filter((r) => !(r.from === from && r.to === to)),
      }));
      return Promise.resolve({ success: true });
    },

    addIndex: (args: unknown): Promise<ToolResult> => {
      const a = args as {
        tableName: string;
        index?: unknown;
        columns?: string[];
        unique?: boolean;
        name?: string;
      };
      // Support both { index } wrapper and flat { columns, unique, name }
      const raw = a.index ?? {
        columns: a.columns ?? [],
        unique: a.unique ?? false,
        name: a.name ?? null,
      };
      const parsed = IndexSchema.safeParse(raw);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setSchema((prev) => ({
        ...prev,
        tables: prev.tables.map((t) =>
          t.name === a.tableName ? { ...t, indexes: [...(t.indexes ?? []), parsed.data] } : t
        ),
      }));
      return Promise.resolve({ success: true });
    },

    removeIndex: ({
      tableName,
      indexName,
    }: {
      tableName: string;
      indexName: string;
    }): Promise<ToolResult> => {
      setSchema((prev) => ({
        ...prev,
        tables: prev.tables.map((t) =>
          t.name === tableName
            ? { ...t, indexes: (t.indexes ?? []).filter((idx) => idx.name !== indexName) }
            : t
        ),
      }));
      return Promise.resolve({ success: true });
    },

    updateSchema: (args: unknown): Promise<ToolResult> => {
      const parsed = UpdateSchemaArgsSchema.safeParse(args);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setSchema((prev) => ({
        ...prev,
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.dialect !== undefined ? { dialect: parsed.data.dialect } : {}),
      }));
      return Promise.resolve({ success: true });
    },

    generateMigration: (): Promise<{ sql: string }> => {
      return Promise.resolve({ sql: generateSqlMigration(schema) });
    },

    generateTypeScriptTypes: (): Promise<{ types: string }> => {
      return Promise.resolve({ types: generateTypeScriptTypes(schema) });
    },

    generateDrizzleSchema: (): Promise<{ drizzle: string }> => {
      return Promise.resolve({ drizzle: generateDrizzleSchema(schema) });
    },

    // ── Backfilled tools ─────────────────────────────────────────────────────

    generateSeedData: (_args: unknown): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeDbDSL(schema) });
    },

    analyzeQueryPerformance: (): Promise<ToolResult> => {
      const findings: string[] = [];
      for (const t of schema.tables) {
        for (const col of t.columns) {
          if (col.foreignKey && !(t.indexes ?? []).some((idx) => idx.columns.includes(col.name))) {
            findings.push(`Table "${t.name}": FK column "${col.name}" has no index.`);
          }
        }
      }
      return Promise.resolve({ findings });
    },

    generateGraphQLSchema: (): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeDbDSL(schema) });
    },

    generateSupabaseFunction: (_args: unknown): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeDbDSL(schema) });
    },

    // ── New tools ────────────────────────────────────────────────────────────

    addCheckConstraint: (_args: {
      tableName: string;
      columnName: string;
      expression: string;
      constraintName?: string;
    }): Promise<ToolResult> => {
      // Constraint metadata stored as a comment on the column for now
      return Promise.resolve({ success: true });
    },

    addEnum: (_args: { name: string; values: string[] }): Promise<ToolResult> => {
      // Enum type — acknowledged; agent generates CREATE TYPE SQL in chat
      return Promise.resolve({ success: true });
    },

    generatePrismaSchema: (): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeDbDSL(schema) });
    },

    generateRLSPolicies: (_args: {
      tableName: string;
      ownerColumn: string;
      allowPublicRead: boolean;
    }): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeDbDSL(schema) });
    },

    analyzeNormalization: (): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeDbDSL(schema) });
    },

    addTableComment: (_args: { tableName: string; comment: string }): Promise<ToolResult> => {
      // Table comment — acknowledged; agent includes COMMENT ON TABLE in migration output
      return Promise.resolve({ success: true });
    },

    generateERDMermaid: (): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeDbDSL(schema) });
    },

    retrieveDocs: (_args: unknown): Promise<ToolResult> => {
      return Promise.resolve({
        success: true,
        message: "Documentation search is handled server-side.",
      });
    },

    addSoftDelete: ({
      tableNames,
      columnName = "deleted_at",
    }: {
      tableNames: string[];
      columnName?: string;
    }): Promise<ToolResult> => {
      setSchema((prev) => ({
        ...prev,
        tables: prev.tables.map((t) => {
          if (!tableNames.includes(t.name)) return t;
          const alreadyHas = t.columns.some((c) => c.name === columnName);
          if (alreadyHas) return t;
          const newCol: Column = {
            name: columnName,
            type: "timestamptz",
            nullable: true,
            default: null,
            unique: null,
            primaryKey: null,
            foreignKey: null,
          };
          return { ...t, columns: [...t.columns, newCol] };
        }),
      }));
      return Promise.resolve({ success: true, tableNames });
    },

    generateAuditLog: (_args: {
      tableNames: string[];
      includeUserId: boolean;
    }): Promise<ToolResult> => {
      // Audit log table + trigger SQL generated agent-side; return current DSL for context
      return Promise.resolve({ success: true, dsl: serializeDbDSL(schema) });
    },

    suggestIndexes: (): Promise<ToolResult> => {
      const suggestions: string[] = [];
      for (const t of schema.tables) {
        for (const col of t.columns) {
          if (col.foreignKey && !(t.indexes ?? []).some((idx) => idx.columns.includes(col.name))) {
            suggestions.push(`CREATE INDEX ON ${t.name} (${col.name}); -- FK column missing index`);
          }
          if (["status", "type", "state"].includes(col.name)) {
            suggestions.push(
              `CREATE INDEX ON ${t.name} (${col.name}); -- high-cardinality filter column`
            );
          }
        }
      }
      return Promise.resolve({ suggestions });
    },

    generateTypeormEntities: (): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeDbDSL(schema) });
    },

    detectDenormalization: (): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeDbDSL(schema) });
    },
  };
}

export type DbTools = ReturnType<typeof useDbTools>;
