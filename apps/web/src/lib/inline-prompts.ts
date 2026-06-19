import type { FormField } from "@ai-builder/schemas";

export type InlineAction =
  | "make-required"
  | "add-validation"
  | "duplicate"
  | "add-help-text"
  | "explain";

export interface InlineActionConfig {
  id: InlineAction;
  label: string;
  icon: string;
}

export const INLINE_ACTIONS: InlineActionConfig[] = [
  { id: "make-required", label: "Required", icon: "*" },
  { id: "add-validation", label: "Validate", icon: "✓" },
  { id: "duplicate", label: "Duplicate", icon: "⎘" },
  { id: "add-help-text", label: "Help text", icon: "?" },
];

export function buildInlinePrompt(field: FormField, action: InlineAction): string {
  const ref = `the "${field.label}" field (ID: ${field.id}, type: ${field.type})`;

  switch (action) {
    case "make-required":
      return `Make ${ref} required by adding a required validation rule with an appropriate error message.`;

    case "add-validation":
      return `Add appropriate validation rules to ${ref}. Based on the field type (${field.type}), add format validation (e.g., email format for email fields), reasonable length limits, and a required rule if the field is essential.`;

    case "duplicate":
      return `Duplicate ${ref}. Create an identical copy with a new unique ID and append "(copy)" to its label, inserting it immediately after the original.`;

    case "add-help-text":
      return `Add concise, user-friendly help text to ${ref} that explains what the user should enter and any formatting requirements. Keep it under 80 characters.`;

    case "explain":
      return `Explain the purpose of ${ref} and suggest any improvements: better label wording, additional validation, accessibility improvements, or UX enhancements.`;
  }
}
