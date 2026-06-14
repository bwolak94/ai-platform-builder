// Compact DSL format:
// FORM: {title} | layout:{layout}
// {id} {type}:{name} "{label}" [{validation,validation}]
//
// Example:
// FORM: Contact Form | layout:single-column
// f_abc123 text:firstName "First name" [required,minLength:2]
// f_def456 email:email "Email address" [required]

import type { FormSchema, FormField, ValidationRule } from "@ai-builder/schemas";

// ─── Serialize ───────────────────────────────────────────────────────────────

function serializeValidation(rules: ValidationRule[] | null): string {
  if (!rules || rules.length === 0) return "";
  const parts = rules.map((r) => {
    if (r.value === null || r.value === true) return r.type;
    return `${r.type}:${String(r.value)}`;
  });
  return `[${parts.join(",")}]`;
}

export function serializeFormDSL(schema: FormSchema): string {
  const layout = schema.layout ?? "single-column";
  const header = `FORM: ${schema.title} | layout:${layout}`;

  const fieldLines = schema.fields.map((f) => {
    const validation = serializeValidation(f.validation);
    const parts = [f.id, f.type + ":" + f.name, `"${f.label}"`];
    if (validation) parts.push(validation);
    return parts.join(" ");
  });

  return [header, ...fieldLines].join("\n");
}

// ─── Deserialize ─────────────────────────────────────────────────────────────

function parseValidation(raw: string): ValidationRule[] {
  // raw = "required,minLength:2,pattern:^[a-z]+$"
  const content = raw.replace(/^\[|\]$/g, "");
  if (!content) return [];

  return content.split(",").map((part) => {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) {
      return {
        type: part as ValidationRule["type"],
        value: true,
        message: `${part} validation failed`,
      };
    }
    const type = part.slice(0, colonIdx) as ValidationRule["type"];
    const rawVal = part.slice(colonIdx + 1);
    const numVal = Number(rawVal);
    const value = isNaN(numVal) ? rawVal : numVal;
    return { type, value, message: `${type} validation failed` };
  });
}

function parseFieldLine(line: string): FormField | null {
  // {id} {type}:{name} "{label}" [{validation}]
  const match = /^(f_[a-z0-9]{6})\s+(\w+):(\w+)\s+"([^"]+)"(?:\s+(\[.*\]))?$/.exec(line.trim());
  if (!match) return null;

  const [, id, type, name, label, validationRaw] = match;

  return {
    id: id ?? "",
    type: (type ?? "text") as FormField["type"],
    name: name ?? "",
    label: label ?? "",
    placeholder: null,
    defaultValue: null,
    options: null,
    validation: validationRaw ? parseValidation(validationRaw) : null,
    className: null,
    helpText: null,
    disabled: null,
    hidden: null,
  };
}

export function deserializeFormDSL(dsl: string): FormSchema {
  const lines = dsl.trim().split("\n").filter(Boolean);
  const headerLine = lines[0] ?? "";

  // Parse header: "FORM: Contact Form | layout:single-column"
  const headerMatch = /^FORM:\s*(.+?)\s*\|\s*layout:(\S+)$/.exec(headerLine);
  const title = headerMatch?.[1] ?? "Untitled Form";
  const layout = (headerMatch?.[2] ?? "single-column") as FormSchema["layout"];

  const fields = lines
    .slice(1)
    .map(parseFieldLine)
    .filter((f): f is FormField => f !== null);

  return {
    id: "form_" + String(Date.now()),
    title,
    description: null,
    submitLabel: null,
    fields,
    layout,
  };
}
