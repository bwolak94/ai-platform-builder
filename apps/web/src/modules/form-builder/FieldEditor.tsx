import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { FormField, FieldType, ValidationRule } from "@ai-builder/schemas";

const FIELD_TYPES: FieldType[] = [
  "text",
  "email",
  "password",
  "number",
  "tel",
  "textarea",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "date",
  "file",
  "hidden",
];

const VALIDATION_TYPES: ValidationRule["type"][] = [
  "required",
  "minLength",
  "maxLength",
  "pattern",
  "min",
  "max",
  "custom",
];

interface FieldEditorProps {
  field: FormField | null;
  onSave: (updates: Partial<FormField>) => void;
  onClose: () => void;
}

export function FieldEditor({ field, onSave, onClose }: FieldEditorProps) {
  const [draft, setDraft] = useState<Partial<FormField>>({});

  useEffect(() => {
    if (field) setDraft({ ...field });
  }, [field]);

  if (!field) return null;

  const merged = { ...field, ...draft };
  const validation = merged.validation ?? [];
  const options = merged.options ?? [];

  function updateDraft<K extends keyof FormField>(key: K, value: FormField[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function addValidationRule() {
    updateDraft("validation", [
      ...validation,
      { type: "required", value: true, message: "This field is required" },
    ]);
  }

  function updateValidationRule(i: number, partial: Partial<ValidationRule>) {
    const updated = validation.map((r, idx) => (idx === i ? { ...r, ...partial } : r));
    updateDraft("validation", updated);
  }

  function removeValidationRule(i: number) {
    updateDraft(
      "validation",
      validation.filter((_, idx) => idx !== i)
    );
  }

  function addOption() {
    updateDraft("options", [...options, { label: "", value: "" }]);
  }

  function updateOption(i: number, key: "label" | "value", val: string) {
    const updated = options.map((o, idx) => (idx === i ? { ...o, [key]: val } : o));
    updateDraft("options", updated);
  }

  function removeOption(i: number) {
    updateDraft(
      "options",
      options.filter((_, idx) => idx !== i)
    );
  }

  const hasOptions = ["select", "multiselect", "radio", "checkbox"].includes(merged.type);

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="flex w-[420px] flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Field</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 py-4">
          {/* Type */}
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select
              value={merged.type}
              onValueChange={(v) => {
                updateDraft("type", v as FieldType);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="grid gap-1.5">
            <Label>
              Name <span className="text-muted-foreground text-xs">(camelCase)</span>
            </Label>
            <Input
              value={merged.name}
              onChange={(e) => {
                updateDraft("name", e.target.value);
              }}
            />
          </div>

          {/* Label */}
          <div className="grid gap-1.5">
            <Label>Label</Label>
            <Input
              value={merged.label}
              onChange={(e) => {
                updateDraft("label", e.target.value);
              }}
            />
          </div>

          {/* Placeholder */}
          <div className="grid gap-1.5">
            <Label>Placeholder</Label>
            <Input
              value={merged.placeholder ?? ""}
              placeholder="Optional"
              onChange={(e) => {
                updateDraft("placeholder", e.target.value || null);
              }}
            />
          </div>

          {/* Help text */}
          <div className="grid gap-1.5">
            <Label>Help text</Label>
            <Input
              value={merged.helpText ?? ""}
              placeholder="Optional"
              onChange={(e) => {
                updateDraft("helpText", e.target.value || null);
              }}
            />
          </div>

          <Separator />

          {/* Options (for select/radio/checkbox) */}
          {hasOptions && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addOption}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Label"
                    value={opt.label}
                    onChange={(e) => {
                      updateOption(i, "label", e.target.value);
                    }}
                  />
                  <Input
                    placeholder="Value"
                    value={opt.value}
                    onChange={(e) => {
                      updateOption(i, "value", e.target.value);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      removeOption(i);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Validation rules */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Validation rules</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addValidationRule}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add rule
              </Button>
            </div>
            {validation.map((rule, i) => (
              <div key={i} className="grid gap-2">
                <div className="flex gap-2">
                  <Select
                    value={rule.type}
                    onValueChange={(v) => {
                      updateValidationRule(i, { type: v as ValidationRule["type"] });
                    }}
                  >
                    <SelectTrigger className="w-36 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VALIDATION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Value"
                    value={rule.value !== null && rule.value !== true ? String(rule.value) : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateValidationRule(i, { value: val === "" ? true : val });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      removeValidationRule(i);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input
                  placeholder="Error message"
                  value={rule.message}
                  onChange={(e) => {
                    updateValidationRule(i, { message: e.target.value });
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <SheetFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
