import { describe, it, expect } from "vitest";
import { diffFormSchemas, formatFormDiffSummary } from "../schema-diff";
import type { FormSchema, FormField } from "@ai-builder/schemas";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeField(overrides: Partial<FormField> & { id: string; name: string }): FormField {
  return {
    type: "text",
    label: overrides.name,
    placeholder: null,
    defaultValue: null,
    options: null,
    validation: null,
    className: null,
    helpText: null,
    disabled: null,
    hidden: null,
    ...overrides,
  };
}

function makeSchema(fields: FormField[], overrides: Partial<FormSchema> = {}): FormSchema {
  return {
    id: "form_1",
    title: "Test Form",
    description: null,
    submitLabel: "Submit",
    layout: "single-column",
    fields,
    ...overrides,
  };
}

const fieldA = makeField({ id: "f_aaa111", name: "firstName", label: "First name" });
const fieldB = makeField({ id: "f_bbb222", name: "email", label: "Email" });
const fieldC = makeField({ id: "f_ccc333", name: "phone", label: "Phone" });

describe("diffFormSchemas", () => {
  it("returns no changes for identical schemas", () => {
    const schema = makeSchema([fieldA, fieldB]);
    const diff = diffFormSchemas(schema, schema);
    expect(diff.hasChanges).toBe(false);
    expect(diff.addedCount).toBe(0);
    expect(diff.removedCount).toBe(0);
    expect(diff.modifiedCount).toBe(0);
    expect(diff.fieldDiffs).toHaveLength(0);
  });

  it("detects added fields", () => {
    const prev = makeSchema([fieldA]);
    const next = makeSchema([fieldA, fieldB]);
    const diff = diffFormSchemas(prev, next);
    expect(diff.addedCount).toBe(1);
    expect(diff.removedCount).toBe(0);
    expect(diff.hasChanges).toBe(true);
    const added = diff.fieldDiffs.filter((d) => d.op === "added");
    expect(added[0]?.field.id).toBe("f_bbb222");
  });

  it("detects removed fields", () => {
    const prev = makeSchema([fieldA, fieldB]);
    const next = makeSchema([fieldA]);
    const diff = diffFormSchemas(prev, next);
    expect(diff.removedCount).toBe(1);
    expect(diff.addedCount).toBe(0);
    const removed = diff.fieldDiffs.filter((d) => d.op === "removed");
    expect(removed[0]?.field.id).toBe("f_bbb222");
  });

  it("detects modified fields and provides before snapshot", () => {
    const prev = makeSchema([fieldA]);
    const modified = { ...fieldA, label: "Full Name" };
    const next = makeSchema([modified]);
    const diff = diffFormSchemas(prev, next);
    expect(diff.modifiedCount).toBe(1);
    const mod = diff.fieldDiffs.find((d) => d.op === "modified");
    expect(mod?.field.label).toBe("Full Name");
    expect(mod?.before?.label).toBe("First name");
  });

  it("handles add + remove + modify simultaneously", () => {
    const modifiedA = { ...fieldA, label: "Given Name" };
    const prev = makeSchema([fieldA, fieldB]);
    const next = makeSchema([modifiedA, fieldC]);
    const diff = diffFormSchemas(prev, next);
    expect(diff.addedCount).toBe(1); // fieldC
    expect(diff.removedCount).toBe(1); // fieldB
    expect(diff.modifiedCount).toBe(1); // fieldA label
    expect(diff.hasChanges).toBe(true);
  });

  it("detects title change", () => {
    const prev = makeSchema([], { title: "Old Title" });
    const next = makeSchema([], { title: "New Title" });
    const diff = diffFormSchemas(prev, next);
    expect(diff.titleChanged).toBe(true);
    expect(diff.hasChanges).toBe(true);
  });

  it("detects layout change", () => {
    const prev = makeSchema([], { layout: "single-column" });
    const next = makeSchema([], { layout: "two-column" });
    const diff = diffFormSchemas(prev, next);
    expect(diff.layoutChanged).toBe(true);
    expect(diff.hasChanges).toBe(true);
  });

  it("does not count reordering as a modification when fields are identical", () => {
    const prev = makeSchema([fieldA, fieldB]);
    const next = makeSchema([fieldB, fieldA]);
    const diff = diffFormSchemas(prev, next);
    // Reordering alone doesn't touch the field objects themselves
    expect(diff.modifiedCount).toBe(0);
    expect(diff.addedCount).toBe(0);
    expect(diff.removedCount).toBe(0);
  });
});

describe("formatFormDiffSummary", () => {
  it("returns 'no changes' for an empty diff", () => {
    const schema = makeSchema([fieldA]);
    const diff = diffFormSchemas(schema, schema);
    expect(formatFormDiffSummary(diff)).toBe("no changes");
  });

  it("includes +N fields for additions", () => {
    const diff = diffFormSchemas(makeSchema([fieldA]), makeSchema([fieldA, fieldB]));
    expect(formatFormDiffSummary(diff)).toContain("+1 field");
  });

  it("includes -N fields for removals", () => {
    const diff = diffFormSchemas(makeSchema([fieldA, fieldB]), makeSchema([fieldA]));
    expect(formatFormDiffSummary(diff)).toContain("-1 field");
  });

  it("includes ~N changed for modifications", () => {
    const prev = makeSchema([fieldA]);
    const next = makeSchema([{ ...fieldA, label: "Updated" }]);
    const diff = diffFormSchemas(prev, next);
    expect(formatFormDiffSummary(diff)).toContain("~1 changed");
  });

  it("uses plural 'fields' for counts > 1", () => {
    const diff = diffFormSchemas(makeSchema([]), makeSchema([fieldA, fieldB]));
    expect(formatFormDiffSummary(diff)).toContain("+2 fields");
  });

  it("combines multiple change types with ·", () => {
    const prev = makeSchema([fieldA, fieldB]);
    const next = makeSchema([{ ...fieldA, label: "X" }, fieldC]);
    const diff = diffFormSchemas(prev, next);
    const summary = formatFormDiffSummary(diff);
    expect(summary).toContain("·");
  });
});
