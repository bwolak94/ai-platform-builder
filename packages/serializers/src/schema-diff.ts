import type { FormSchema, FormField } from "@ai-builder/schemas";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FormFieldDiff {
  op: "added" | "removed" | "modified";
  field: FormField;
  before?: FormField;
}

export interface FormSchemaDiff {
  titleChanged: boolean;
  layoutChanged: boolean;
  fieldDiffs: FormFieldDiff[];
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  hasChanges: boolean;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export function diffFormSchemas(prev: FormSchema, next: FormSchema): FormSchemaDiff {
  const prevMap = new Map<string, FormField>(prev.fields.map((f) => [f.id, f]));
  const nextMap = new Map<string, FormField>(next.fields.map((f) => [f.id, f]));

  const fieldDiffs: FormFieldDiff[] = [];

  // Added fields
  for (const [id, field] of nextMap) {
    if (!prevMap.has(id)) {
      fieldDiffs.push({ op: "added", field });
    }
  }

  // Removed fields
  for (const [id, field] of prevMap) {
    if (!nextMap.has(id)) {
      fieldDiffs.push({ op: "removed", field });
    }
  }

  // Modified fields
  for (const [id, nextField] of nextMap) {
    const prevField = prevMap.get(id);
    if (prevField && JSON.stringify(prevField) !== JSON.stringify(nextField)) {
      fieldDiffs.push({ op: "modified", field: nextField, before: prevField });
    }
  }

  const addedCount = fieldDiffs.filter((d) => d.op === "added").length;
  const removedCount = fieldDiffs.filter((d) => d.op === "removed").length;
  const modifiedCount = fieldDiffs.filter((d) => d.op === "modified").length;
  const titleChanged = prev.title !== next.title;
  const layoutChanged = prev.layout !== next.layout;

  return {
    titleChanged,
    layoutChanged,
    fieldDiffs,
    addedCount,
    removedCount,
    modifiedCount,
    hasChanges: addedCount + removedCount + modifiedCount > 0 || titleChanged || layoutChanged,
  };
}

/** Compact summary string for display in snapshot timeline entries */
export function formatFormDiffSummary(diff: FormSchemaDiff): string {
  const parts: string[] = [];
  if (diff.addedCount > 0)
    parts.push(`+${String(diff.addedCount)} field${diff.addedCount !== 1 ? "s" : ""}`);
  if (diff.removedCount > 0)
    parts.push(`-${String(diff.removedCount)} field${diff.removedCount !== 1 ? "s" : ""}`);
  if (diff.modifiedCount > 0) parts.push(`~${String(diff.modifiedCount)} changed`);
  if (diff.titleChanged) parts.push("title");
  if (diff.layoutChanged) parts.push("layout");
  return parts.length > 0 ? parts.join(" · ") : "no changes";
}
