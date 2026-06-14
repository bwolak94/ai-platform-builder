import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useFormState } from "./hooks/useFormState";
import { useFormTools } from "./hooks/useFormTools";
import { FieldList } from "./FieldList";
import { FieldEditor } from "./FieldEditor";
import { ExportPanel } from "./ExportPanel";
import type { FormField } from "@ai-builder/schemas";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

interface FormBuilderPanelProps {
  onToolCall?: (call: ToolCall) => Promise<ToolResult>;
}

export function FormBuilderPanel({ onToolCall: _onToolCall }: FormBuilderPanelProps) {
  const { formSchema, setFormSchema } = useFormState();
  const tools = useFormTools(formSchema, setFormSchema);
  const [editingField, setEditingField] = useState<FormField | null>(null);

  const handleToolCall = useCallback(
    async (call: ToolCall): Promise<ToolResult> => {
      const toolName = call.toolName as keyof typeof tools;
      const handler = tools[toolName];
      if (typeof handler === "function") {
        // Dynamic dispatch — each handler validates its own args internally
        return (handler as (args: unknown) => Promise<ToolResult>)(call.args);
      }
      return Promise.resolve({ error: `Unknown tool: ${call.toolName}` });
    },
    [tools]
  );

  // Expose handleToolCall upward via prop (parent wires this into useBuilderAgent)
  void handleToolCall;

  function handleAddField() {
    const id = `f_${nanoid(6).toLowerCase()}`;
    const newField: FormField = {
      id,
      type: "text",
      name: `field_${id.slice(2)}`,
      label: "New field",
      placeholder: null,
      defaultValue: null,
      options: null,
      validation: null,
      className: null,
      helpText: null,
      disabled: null,
      hidden: null,
    };
    setFormSchema((prev) => ({ ...prev, fields: [...prev.fields, newField] }));
  }

  function handleReorder(orderedIds: string[]) {
    setFormSchema((prev) => {
      const map = Object.fromEntries(prev.fields.map((f) => [f.id, f]));
      const fields = orderedIds.map((id) => map[id]).filter((f): f is FormField => f !== undefined);
      return { ...prev, fields };
    });
  }

  function handleDelete(fieldId: string) {
    setFormSchema((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.id !== fieldId) }));
  }

  function handleSave(updates: Partial<FormField>) {
    if (!editingField) return;
    setFormSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === editingField.id ? { ...f, ...updates } : f)),
    }));
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">{formSchema.title}</h2>
          <p className="text-muted-foreground text-xs">
            {formSchema.fields.length} field{formSchema.fields.length !== 1 ? "s" : ""}
            {" · "}
            {formSchema.layout ?? "single-column"}
          </p>
        </div>
        <Button size="sm" onClick={handleAddField}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add field
        </Button>
      </div>

      <Separator />

      {/* Field list */}
      <div className="flex-1 overflow-y-auto">
        <FieldList
          schema={formSchema}
          onReorder={handleReorder}
          onEdit={setEditingField}
          onDelete={handleDelete}
        />
      </div>

      <Separator />

      {/* Export */}
      <ExportPanel schema={formSchema} />

      {/* Field editor slide-over */}
      <FieldEditor
        field={editingField}
        onSave={handleSave}
        onClose={() => {
          setEditingField(null);
        }}
      />
    </div>
  );
}
