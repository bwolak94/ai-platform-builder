import { serializeDbDSL, generateSqlMigration } from "@ai-builder/serializers";
import { TableSchema, ColumnSchema, RelationSchema, IndexSchema } from "@ai-builder/schemas";
import type { DbSchema } from "@ai-builder/schemas";
import type React from "react";

type Setter = React.Dispatch<React.SetStateAction<DbSchema>>;
type ToolResult = Record<string, unknown>;

export function useDbTools(schema: DbSchema, setSchema: Setter) {
  return {
    addTable: ({ table }: { table: unknown }): Promise<ToolResult> => {
      const parsed = TableSchema.safeParse(table);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setSchema((prev) => ({ ...prev, tables: [...prev.tables, parsed.data] }));
      return Promise.resolve({ success: true, tableName: parsed.data.name });
    },

    addColumn: ({
      tableName,
      column,
    }: {
      tableName: string;
      column: unknown;
    }): Promise<ToolResult> => {
      const parsed = ColumnSchema.safeParse(column);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setSchema((prev) => ({
        ...prev,
        tables: prev.tables.map((t) =>
          t.name === tableName ? { ...t, columns: [...t.columns, parsed.data] } : t
        ),
      }));
      return Promise.resolve({ success: true });
    },

    addRelation: ({ relation }: { relation: unknown }): Promise<ToolResult> => {
      const parsed = RelationSchema.safeParse(relation);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setSchema((prev) => ({ ...prev, relations: [...(prev.relations ?? []), parsed.data] }));
      return Promise.resolve({ success: true });
    },

    addIndex: ({
      tableName,
      index,
    }: {
      tableName: string;
      index: unknown;
    }): Promise<ToolResult> => {
      const parsed = IndexSchema.safeParse(index);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setSchema((prev) => ({
        ...prev,
        tables: prev.tables.map((t) =>
          t.name === tableName ? { ...t, indexes: [...(t.indexes ?? []), parsed.data] } : t
        ),
      }));
      return Promise.resolve({ success: true });
    },

    querySchema: (): Promise<{ dsl: string }> => {
      return Promise.resolve({ dsl: serializeDbDSL(schema) });
    },

    generateMigration: (): Promise<{ sql: string }> => {
      return Promise.resolve({ sql: generateSqlMigration(schema) });
    },
  };
}

export type DbTools = ReturnType<typeof useDbTools>;
