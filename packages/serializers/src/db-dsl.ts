// DSL format:
// DB: blog_db | dialect:postgresql
//
// TABLE users
//   id          uuid         PK DEFAULT gen_random_uuid()
//   email       text         UNIQUE NOT NULL
//   user_id     uuid         FK→posts.id CASCADE
//
// RELATION users.id -> posts.user_id | one-to-many

import { nanoid } from "nanoid";
import type { DbSchema, Table, Column } from "@ai-builder/schemas";

// ─── TypeScript types generation ─────────────────────────────────────────────

const TS_TYPE_MAP: Record<string, string> = {
  uuid: "string",
  text: "string",
  varchar: "string",
  integer: "number",
  bigint: "bigint",
  boolean: "boolean",
  timestamptz: "Date",
  jsonb: "unknown",
  decimal: "number",
  float: "number",
  serial: "number",
  bigserial: "bigint",
};

function toPascalCase(name: string): string {
  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function generateTypeScriptTypes(schema: DbSchema): string {
  const interfaces = schema.tables.map((table) => {
    const fields = table.columns.map((col) => {
      const tsType = TS_TYPE_MAP[col.type] ?? "unknown";
      const optional = col.nullable !== false ? "?" : "";
      return `  ${col.name}${optional}: ${tsType};`;
    });
    return `export interface ${toPascalCase(table.name)} {\n${fields.join("\n")}\n}`;
  });

  return (
    `// Generated TypeScript interfaces\n// Schema: ${schema.name} (${schema.dialect})\n\n` +
    interfaces.join("\n\n")
  );
}

// ─── Drizzle ORM schema generation ───────────────────────────────────────────

const DRIZZLE_PG_TYPE_MAP: Record<string, string> = {
  uuid: "uuid",
  text: "text",
  varchar: "varchar",
  integer: "integer",
  bigint: "bigint",
  boolean: "boolean",
  timestamptz: "timestamp",
  jsonb: "jsonb",
  decimal: "decimal",
  float: "doublePrecision",
  serial: "serial",
  bigserial: "bigserial",
};

export function generateDrizzleSchema(schema: DbSchema): string {
  const usedTypes = new Set<string>();

  const tableBlocks = schema.tables.map((table) => {
    const cols = table.columns.map((col) => {
      const drizzleType = DRIZZLE_PG_TYPE_MAP[col.type] ?? "text";
      usedTypes.add(drizzleType);
      let def = `  ${col.name}: ${drizzleType}("${col.name}")`;
      if (col.primaryKey) def += ".primaryKey()";
      if (col.default) def += `.default(${col.default})`;
      if (col.unique) def += ".unique()";
      if (col.nullable === false) def += ".notNull()";
      return def;
    });
    return `export const ${table.name} = pgTable("${table.name}", {\n${cols.join(",\n")},\n});`;
  });

  const importList = ["pgTable", ...Array.from(usedTypes)].join(", ");
  const imports = `import { ${importList} } from "drizzle-orm/pg-core";`;

  return (
    `// Generated Drizzle ORM schema\n// Schema: ${schema.name} (${schema.dialect})\n\n` +
    imports +
    "\n\n" +
    tableBlocks.join("\n\n")
  );
}

// ─── Schema diff ──────────────────────────────────────────────────────────────

export interface SchemaDiff {
  addedTables: string[];
  removedTables: string[];
  modifiedTables: {
    name: string;
    addedColumns: string[];
    removedColumns: string[];
  }[];
}

export function diffDbSchemas(before: DbSchema, after: DbSchema): SchemaDiff {
  const beforeMap = new Map(before.tables.map((t) => [t.name, t]));
  const afterMap = new Map(after.tables.map((t) => [t.name, t]));

  const addedTables = after.tables.filter((t) => !beforeMap.has(t.name)).map((t) => t.name);
  const removedTables = before.tables.filter((t) => !afterMap.has(t.name)).map((t) => t.name);

  const modifiedTables: SchemaDiff["modifiedTables"] = [];
  for (const [name, afterTable] of afterMap) {
    const beforeTable = beforeMap.get(name);
    if (!beforeTable) continue;
    const beforeCols = new Set(beforeTable.columns.map((c) => c.name));
    const afterCols = new Set(afterTable.columns.map((c) => c.name));
    const addedColumns = afterTable.columns
      .filter((c) => !beforeCols.has(c.name))
      .map((c) => c.name);
    const removedColumns = beforeTable.columns
      .filter((c) => !afterCols.has(c.name))
      .map((c) => c.name);
    if (addedColumns.length > 0 || removedColumns.length > 0) {
      modifiedTables.push({ name, addedColumns, removedColumns });
    }
  }

  return { addedTables, removedTables, modifiedTables };
}

// ─── Serialize ────────────────────────────────────────────────────────────────

function serializeColumn(col: Column): string {
  const parts = ["  " + col.name.padEnd(18) + col.type.padEnd(14)];
  if (col.primaryKey) parts.push("PK");
  if (col.unique) parts.push("UNIQUE");
  if (col.nullable === false) parts.push("NOT NULL");
  if (col.default) parts.push("DEFAULT " + col.default);
  if (col.foreignKey) {
    const fk = col.foreignKey;
    const onDelete = fk.onDelete ? " " + fk.onDelete : "";
    parts.push("FK\u2192" + fk.table + "." + fk.column + onDelete);
  }
  return parts.join(" ");
}

function serializeTable(table: Table): string {
  const cols = table.columns.map(serializeColumn).join("\n");
  const indexes = (table.indexes ?? [])
    .map((idx) => "  IDX: " + idx.columns.join(",") + (idx.unique ? "(unique)" : ""))
    .join("\n");
  return "TABLE " + table.name + "\n" + cols + (indexes ? "\n" + indexes : "");
}

export function serializeDbDSL(schema: DbSchema): string {
  const header = "DB: " + schema.name + " | dialect:" + schema.dialect;
  const tables = schema.tables.map(serializeTable).join("\n\n");
  const relations = (schema.relations ?? [])
    .map((r) => "RELATION " + r.from + " -> " + r.to + " | " + r.type)
    .join("\n");
  return header + "\n\n" + tables + (relations ? "\n\n" + relations : "");
}

// ─── Deserialize ─────────────────────────────────────────────────────────────

export function deserializeDbDSL(dsl: string): DbSchema {
  const lines = dsl.split("\n");
  const firstLine = lines[0] ?? "";

  const nameMatch = /DB:\s*([^\s|]+)/.exec(firstLine);
  const dialectMatch = /dialect:(postgresql|mysql|sqlite)/.exec(firstLine);

  const tables: Table[] = [];
  let currentTable: Table | null = null;

  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("TABLE ")) {
      if (currentTable) tables.push(currentTable);
      currentTable = { name: trimmed.slice(6).trim(), columns: [], indexes: null };
      continue;
    }

    if (!currentTable) continue;

    if (trimmed.startsWith("IDX:")) {
      const idxPart = trimmed.slice(4).trim();
      const unique = idxPart.includes("(unique)");
      const colStr = idxPart.replace("(unique)", "").trim();
      const columns = colStr
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      currentTable.indexes = [...(currentTable.indexes ?? []), { name: null, columns, unique }];
      continue;
    }

    const parts = trimmed.split(/\s+/);
    const colName = parts[0];
    const colType = parts[1];
    if (!colName || !colType) continue;

    const rest = parts.slice(2).join(" ");
    const fkMatch = /FK[→>]([a-z_]+)\.([a-z_]+)(?:\s+(CASCADE|SET NULL|RESTRICT|NO ACTION))?/.exec(
      rest
    );

    const col: Column = {
      name: colName,
      type: colType as Column["type"],
      primaryKey: rest.includes("PK") ? true : null,
      nullable: rest.includes("NOT NULL") ? false : null,
      unique: rest.includes("UNIQUE") ? true : null,
      default: /DEFAULT\s+(\S+)/.exec(rest)?.[1] ?? null,
      foreignKey: fkMatch
        ? {
            table: fkMatch[1] ?? "",
            column: fkMatch[2] ?? "",
            onDelete:
              (fkMatch[3] as "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION" | undefined) ?? null,
          }
        : null,
    };
    currentTable.columns.push(col);
  }

  if (currentTable) tables.push(currentTable);

  return {
    id: "db_" + nanoid(6),
    name: nameMatch?.[1] ?? "database",
    dialect: (dialectMatch?.[1] ?? "postgresql") as DbSchema["dialect"],
    tables,
    relations: null,
  };
}

// ─── SQL generation ───────────────────────────────────────────────────────────

export function generateSqlMigration(schema: DbSchema): string {
  const statements = schema.tables.map((table) => {
    const cols = table.columns.map((col) => {
      const parts = ["  " + col.name + " " + col.type.toUpperCase()];
      if (col.primaryKey) parts.push("PRIMARY KEY");
      if (col.unique) parts.push("UNIQUE");
      if (col.nullable === false) parts.push("NOT NULL");
      if (col.default) parts.push("DEFAULT " + col.default);
      return parts.join(" ");
    });
    const fkConstraints = table.columns
      .filter((col) => col.foreignKey)
      .map((col) => {
        const fk = col.foreignKey;
        if (!fk) return null;
        return (
          "  FOREIGN KEY (" +
          col.name +
          ") REFERENCES " +
          fk.table +
          "(" +
          fk.column +
          ")" +
          (fk.onDelete ? " ON DELETE " + fk.onDelete : "")
        );
      })
      .filter((s): s is string => s !== null);
    const body = [...cols, ...fkConstraints].join(",\n");
    return "CREATE TABLE IF NOT EXISTS " + table.name + " (\n" + body + "\n);";
  });
  return "-- Generated SQL migration\n" + statements.join("\n\n");
}

// ─── Mermaid ERD generation ───────────────────────────────────────────────────

export function generateMermaidErd(schema: DbSchema): string {
  const entities = schema.tables.map((table) => {
    const cols = table.columns.map((col) => {
      const pk = col.primaryKey ? " PK" : "";
      const fk = col.foreignKey ? " FK" : "";
      return "    " + col.type + " " + col.name + pk + fk;
    });
    return "  " + table.name + " {\n" + cols.join("\n") + "\n  }";
  });

  const relations: string[] = [];
  for (const table of schema.tables) {
    for (const col of table.columns) {
      if (col.foreignKey) {
        relations.push(
          "  " + table.name + " }o--|| " + col.foreignKey.table + ' : "' + col.name + '"'
        );
      }
    }
  }

  return (
    "erDiagram\n" + entities.join("\n") + (relations.length ? "\n" + relations.join("\n") : "")
  );
}

// ─── Prisma schema generation ─────────────────────────────────────────────────

export function generatePrismaSchema(schema: DbSchema): string {
  const typeMap: Record<string, string> = {
    uuid: "String @db.Uuid",
    text: "String",
    varchar: "String",
    integer: "Int",
    bigint: "BigInt",
    boolean: "Boolean",
    timestamptz: "DateTime @db.Timestamptz",
    jsonb: "Json",
    decimal: "Decimal",
    float: "Float",
    serial: "Int @default(autoincrement())",
    bigserial: "BigInt @default(autoincrement())",
  };

  const provider =
    schema.dialect === "postgresql"
      ? "postgresql"
      : schema.dialect === "mysql"
        ? "mysql"
        : "sqlite";

  const datasource = `datasource db {\n  provider = "${provider}"\n  url      = env("DATABASE_URL")\n}`;
  const generator = `generator client {\n  provider = "prisma-client-js"\n}`;

  const models = schema.tables.map((table) => {
    const fields = table.columns.map((col) => {
      const prismaType = typeMap[col.type] ?? "String";
      const optional = col.nullable !== false ? "?" : "";
      const parts = ["  " + col.name, prismaType + optional];
      if (col.default === "gen_random_uuid()") parts.push("@default(uuid())");
      if (col.default === "now()") parts.push("@default(now())");
      if (col.unique) parts.push("@unique");
      return parts.join(" ");
    });
    return "model " + table.name + " {\n" + fields.join("\n") + "\n}";
  });

  return [datasource, generator, ...models].join("\n\n");
}
