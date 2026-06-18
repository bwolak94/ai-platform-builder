import { serializeFormDSL } from "@ai-builder/serializers";
import { FormFieldSchema } from "@ai-builder/schemas";
import type { FormSchema, FormField } from "@ai-builder/schemas";

type Setter = React.Dispatch<React.SetStateAction<FormSchema>>;

interface AddFieldArgs {
  field: unknown;
  afterFieldId?: string | null;
}

interface UpdateFieldArgs {
  fieldId: string;
  updates: Partial<FormField>;
}

interface ReorderFieldsArgs {
  orderedIds: string[];
}

type AddFieldResult = { error: string } | { success: true; fieldId: string };
interface SimpleResult {
  success: true;
}
interface QuerySchemaResult {
  schema: string;
}

function stripNulls<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)
  ) as Partial<T>;
}

function insertField(
  schema: FormSchema,
  field: FormField,
  afterFieldId?: string | null
): FormSchema {
  if (!afterFieldId) {
    return { ...schema, fields: [...schema.fields, field] };
  }
  const idx = schema.fields.findIndex((f) => f.id === afterFieldId);
  if (idx === -1) return { ...schema, fields: [...schema.fields, field] };
  const fields = [...schema.fields];
  fields.splice(idx + 1, 0, field);
  return { ...schema, fields };
}

export function useFormTools(formSchema: FormSchema, setFormSchema: Setter) {
  return {
    addField: ({ field, afterFieldId }: AddFieldArgs): Promise<AddFieldResult> => {
      console.log("[useFormTools.addField] received:", JSON.stringify(field));
      const parsed = FormFieldSchema.safeParse(field);
      if (!parsed.success) {
        console.error("[useFormTools.addField] safeParse FAILED:", parsed.error.message);
        return Promise.resolve({ error: parsed.error.message });
      }
      console.log("[useFormTools.addField] safeParse OK, calling setFormSchema");
      setFormSchema((prev) => insertField(prev, parsed.data, afterFieldId));
      return Promise.resolve({ success: true, fieldId: parsed.data.id });
    },

    removeField: ({ fieldId }: { fieldId: string }): Promise<SimpleResult> => {
      setFormSchema((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.id !== fieldId) }));
      return Promise.resolve({ success: true });
    },

    updateField: ({ fieldId, updates }: UpdateFieldArgs): Promise<SimpleResult> => {
      setFormSchema((prev) => ({
        ...prev,
        fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, ...stripNulls(updates) } : f)),
      }));
      return Promise.resolve({ success: true });
    },

    reorderFields: ({ orderedIds }: ReorderFieldsArgs): Promise<SimpleResult> => {
      setFormSchema((prev) => {
        const map = Object.fromEntries(prev.fields.map((f) => [f.id, f]));
        const fields = orderedIds
          .map((id) => map[id])
          .filter((f): f is FormField => f !== undefined);
        return { ...prev, fields };
      });
      return Promise.resolve({ success: true });
    },

    querySchema: (): Promise<QuerySchemaResult> => {
      return Promise.resolve({ schema: serializeFormDSL(formSchema) });
    },

    // ── Backfilled tools (worker-defined, client executes) ──────────────────

    applyFormTemplate: (_args: { template: string }): Promise<SimpleResult> => {
      // Template application is driven by the agent via addField calls after this acknowledgement
      return Promise.resolve({ success: true });
    },

    addConditionalRule: (_args: {
      fieldId: string;
      dependsOnFieldId: string;
      operator: string;
      value: string | null;
      action: "show" | "hide";
    }): Promise<SimpleResult> => {
      // Conditional rule metadata — acknowledged; agent renders rule in chat
      return Promise.resolve({ success: true });
    },

    addFieldGroup: (_args: {
      groupId: string;
      legend: string;
      fieldIds: string[];
    }): Promise<SimpleResult> => {
      // Group metadata — acknowledged; agent explains grouping in chat
      return Promise.resolve({ success: true });
    },

    exportToReactHookForm: (): Promise<{ tsx: string }> => {
      // Code generation is handled agent-side; return DSL for agent to use
      return Promise.resolve({ tsx: serializeFormDSL(formSchema) });
    },

    auditFormAccessibility: (): Promise<{ issues: string[] }> => {
      const issues: string[] = [];
      for (const f of formSchema.fields) {
        if (!f.label) issues.push(`Field "${f.id}" is missing a label.`);
        if (f.type === "text" && f.id.toLowerCase().includes("email")) {
          issues.push(`Field "${f.id}" looks like an email field but uses type "text".`);
        }
      }
      return Promise.resolve({ issues });
    },

    // ── New tools ────────────────────────────────────────────────────────────

    createFormWizard: (_args: {
      steps: { title: string; fieldIds: string[] }[];
    }): Promise<SimpleResult> => {
      // Wizard config — acknowledged; agent generates wizard code in chat
      return Promise.resolve({ success: true });
    },

    getConditionalGraph: (): Promise<{ mermaid: string }> => {
      // Graph generation is handled agent-side based on querySchema output
      return Promise.resolve({ mermaid: "flowchart TD\n  %% No conditional rules defined" });
    },

    importJsonSchema: (args: {
      schema: Record<string, unknown>;
      overwrite: boolean;
    }): Promise<SimpleResult> => {
      // Agent drives addField calls; client acknowledges
      void args;
      return Promise.resolve({ success: true });
    },

    exportZodSchema: (): Promise<{ zod: string }> => {
      const lines = formSchema.fields.map((f) => {
        const hasRequired = f.validation?.some((v) => v.type === "required");
        const base = hasRequired ? `z.string().min(1)` : `z.string().optional()`;
        return `  ${f.name}: ${base},`;
      });
      return Promise.resolve({ zod: `z.object({\n${lines.join("\n")}\n})` });
    },

    previewField: (_args: { fieldId: string }): Promise<SimpleResult> => {
      // Preview scrolling is handled by the preview iframe consumer
      return Promise.resolve({ success: true });
    },

    duplicateField: (args: { fieldId: string; newId: string }): Promise<SimpleResult> => {
      setFormSchema((prev) => {
        const idx = prev.fields.findIndex((f) => f.id === args.fieldId);
        if (idx === -1) return prev;
        const original = prev.fields[idx];
        if (!original) return prev;
        const rawLabel = original.label + " copy";
        const copy: FormField = {
          ...original,
          id: args.newId,
          name: original.name + "_copy",
          label: rawLabel.length <= 60 ? rawLabel : rawLabel.slice(0, 57) + "...",
        };
        const fields = [...prev.fields];
        fields.splice(idx + 1, 0, copy);
        return { ...prev, fields };
      });
      return Promise.resolve({ success: true });
    },

    addComputedField: (args: {
      id: string;
      label: string;
      formula: string;
      dependsOn: string[];
    }): Promise<SimpleResult> => {
      const computedField: FormField = {
        id: args.id,
        type: "text",
        name: args.id,
        label: args.label.length <= 60 ? args.label : args.label.slice(0, 57) + "...",
        placeholder: `= ${args.formula}`,
        helpText: `Computed: ${args.formula}. Depends on: ${args.dependsOn.join(", ")}`,
        defaultValue: null,
        options: null,
        validation: null,
        className: null,
        disabled: true,
        hidden: null,
      };
      setFormSchema((prev) => ({ ...prev, fields: [...prev.fields, computedField] }));
      return Promise.resolve({ success: true });
    },

    retrieveDocs: (_args: { query: string }): Promise<SimpleResult> => {
      return Promise.resolve({ success: true });
    },
  };
}

export type FormTools = ReturnType<typeof useFormTools>;
