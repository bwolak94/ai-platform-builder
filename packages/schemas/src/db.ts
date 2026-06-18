import { z } from "zod";

export const ColumnTypeSchema = z.enum([
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
]);

export const ForeignKeySchema = z.object({
  table: z.string().min(1),
  column: z.string().min(1),
  onDelete: z.enum(["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"]).nullable(),
});

export const IndexSchema = z.object({
  name: z.string().nullable(),
  columns: z.array(z.string().min(1)).min(1),
  unique: z.boolean(),
});

export const ColumnSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, "Must be a valid column name"),
  type: ColumnTypeSchema,
  primaryKey: z.boolean().nullable(),
  nullable: z.boolean().nullable(),
  unique: z.boolean().nullable(),
  default: z.string().nullable(),
  foreignKey: ForeignKeySchema.nullable(),
});

export const TableSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, "Must be a valid table name"),
  columns: z.array(ColumnSchema).min(1),
  indexes: z.array(IndexSchema).nullable(),
});

export const RelationSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
});

export const DbSchemaSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  dialect: z.enum(["postgresql", "mysql", "sqlite"]),
  tables: z.array(TableSchema),
  relations: z.array(RelationSchema).nullable(),
});

export type ColumnType = z.infer<typeof ColumnTypeSchema>;
export type ForeignKey = z.infer<typeof ForeignKeySchema>;
export type Index = z.infer<typeof IndexSchema>;
export type Column = z.infer<typeof ColumnSchema>;
export type Table = z.infer<typeof TableSchema>;
export type Relation = z.infer<typeof RelationSchema>;
export type DbSchema = z.infer<typeof DbSchemaSchema>;
