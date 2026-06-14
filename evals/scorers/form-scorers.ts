import { FormSchemaSchema } from "@ai-builder/schemas";
import type { Scorer } from "./shared.js";

// Scorer 1: Does the output parse as a valid FormSchema?
export const validJsonSchemaScorer: Scorer = ({ output }) => {
  const result = FormSchemaSchema.safeParse(output.schema);
  if (result.success) return { score: 1 };
  return {
    score: 0,
    reason: result.error.issues.map((i) => i.message).join(", "),
  };
};

// Scorer 2: Do all fields have non-empty labels?
export const allFieldsHaveLabelsScorer: Scorer = ({ output }) => {
  const schema = FormSchemaSchema.safeParse(output.schema);
  if (!schema.success) return { score: 0, reason: "Invalid schema" };
  const fields = schema.data.fields;
  if (fields.length === 0) return { score: 0, reason: "No fields" };
  const withLabel = fields.filter((f) => f.label && f.label.trim().length > 0);
  return { score: withLabel.length / fields.length };
};

// Scorer 3: Are email-named fields typed as "email"?
export const semanticTypeScorer: Scorer = ({ output }) => {
  const schema = FormSchemaSchema.safeParse(output.schema);
  if (!schema.success) return { score: 0 };
  const fields = schema.data.fields;
  const emailFields = fields.filter((f) => f.name.toLowerCase().includes("email"));
  if (emailFields.length === 0) return { score: 1 }; // no email fields = not applicable
  const correctlyTyped = emailFields.filter((f) => f.type === "email");
  return { score: correctlyTyped.length / emailFields.length };
};

// Scorer 4: Do required fields have validation rules?
export const requiredFieldsHaveValidationScorer: Scorer = ({ output, expected }) => {
  const schema = FormSchemaSchema.safeParse(output.schema);
  if (!schema.success) return { score: 0 };
  const expectedRequiredFields = expected.mustHaveValidation ?? [];
  if (expectedRequiredFields.length === 0) return { score: 1 };
  const fields = schema.data.fields;
  const matches = expectedRequiredFields.filter((name) => {
    const field = fields.find((f) => f.name === name || f.name.toLowerCase().includes(name));
    return field?.validation?.some((v) => v.type === "required");
  });
  return { score: matches.length / expectedRequiredFields.length };
};

// Scorer 5: Does field count match expected range?
export const fieldCountScorer: Scorer = ({ output, expected }) => {
  const schema = FormSchemaSchema.safeParse(output.schema);
  if (!schema.success) return { score: 0 };
  const count = schema.data.fields.length;
  const range = expected.expectedFieldCount as { min: number; max: number } | undefined;
  if (!range) return { score: 1 };
  if (count >= range.min && count <= range.max) return { score: 1 };
  if (count < range.min) return { score: count / range.min };
  return { score: range.max / count };
};

export const FORM_SCORERS: Record<string, Scorer> = {
  validJsonSchema: validJsonSchemaScorer,
  allFieldsHaveLabels: allFieldsHaveLabelsScorer,
  semanticType: semanticTypeScorer,
  requiredFieldsHaveValidation: requiredFieldsHaveValidationScorer,
  fieldCount: fieldCountScorer,
};
