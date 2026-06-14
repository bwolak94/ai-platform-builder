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
      const parsed = FormFieldSchema.safeParse(field);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
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
  };
}

export type FormTools = ReturnType<typeof useFormTools>;
