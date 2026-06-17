import type { DbSchema } from "@ai-builder/schemas";

export interface DbLintIssue {
  level: "error" | "warning" | "info";
  message: string;
  context?: string;
}

export function lintDbSchema(schema: DbSchema): DbLintIssue[] {
  const issues: DbLintIssue[] = [];

  if (schema.name === "my_database") {
    issues.push({
      level: "info",
      message: "Database has the default name 'my_database'. Consider a meaningful name.",
    });
  }

  if (schema.tables.length === 0) {
    issues.push({ level: "info", message: "No tables defined yet." });
    return issues;
  }

  const tableNames = new Set<string>();

  for (const table of schema.tables) {
    if (tableNames.has(table.name)) {
      issues.push({
        level: "error",
        message: `Duplicate table name: "${table.name}".`,
        context: table.name,
      });
    }
    tableNames.add(table.name);

    const hasPk = table.columns.some((c) => c.primaryKey);
    if (!hasPk) {
      issues.push({
        level: "error",
        message: `Table "${table.name}" has no primary key.`,
        context: table.name,
      });
    }

    const hasCreatedAt = table.columns.some((c) => c.name === "created_at");
    if (!hasCreatedAt) {
      issues.push({
        level: "info",
        message: `Table "${table.name}" is missing a created_at timestamp.`,
        context: table.name,
      });
    }

    const colNames = new Set<string>();
    for (const col of table.columns) {
      if (colNames.has(col.name)) {
        issues.push({
          level: "error",
          message: `Duplicate column "${col.name}" in table "${table.name}".`,
          context: table.name,
        });
      }
      colNames.add(col.name);

      if (col.foreignKey) {
        const indexes = table.indexes ?? [];
        const hasIndex = indexes.some((idx) => idx.columns.includes(col.name));
        if (!hasIndex) {
          issues.push({
            level: "warning",
            message: `Foreign key "${table.name}.${col.name}" has no index (query performance).`,
            context: table.name,
          });
        }
        if (!col.foreignKey.onDelete) {
          issues.push({
            level: "warning",
            message: `Foreign key "${table.name}.${col.name}" has no ON DELETE policy.`,
            context: table.name,
          });
        }
      }
    }
  }

  for (const rel of schema.relations ?? []) {
    const fromTable = rel.from.split(".")[0];
    const toTable = rel.to.split(".")[0];
    if (fromTable && !tableNames.has(fromTable)) {
      issues.push({
        level: "error",
        message: `Relation references non-existent table "${fromTable}".`,
      });
    }
    if (toTable && !tableNames.has(toTable)) {
      issues.push({
        level: "error",
        message: `Relation references non-existent table "${toTable}".`,
      });
    }
  }

  return issues;
}

export function lintSummary(issues: DbLintIssue[]): {
  errors: number;
  warnings: number;
  infos: number;
  score: number;
} {
  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.filter((i) => i.level === "warning").length;
  const infos = issues.filter((i) => i.level === "info").length;
  const score = Math.max(0, 100 - errors * 20 - warnings * 5 - infos * 1);
  return { errors, warnings, infos, score };
}
