import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { InlineActionChips } from "@/components/inline-actions";
import type { FormField } from "@ai-builder/schemas";

interface FieldItemProps {
  field: FormField;
  onEdit: (field: FormField) => void;
  onDelete: (fieldId: string) => void;
}

const TYPE_ICONS: Record<string, string> = {
  text: "T",
  email: "@",
  password: "•",
  number: "#",
  tel: "☎",
  textarea: "¶",
  select: "▼",
  multiselect: "▼▼",
  checkbox: "☑",
  radio: "◉",
  date: "📅",
  file: "📎",
  hidden: "👁",
};

export function FieldItem({ field, onEdit, onDelete }: FieldItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <InlineActionChips field={field}>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "bg-card flex items-center gap-3 rounded-md border px-3 py-2",
          isDragging && "opacity-50 shadow-lg"
        )}
      >
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="text-muted-foreground cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="text-muted-foreground w-6 text-center font-mono text-xs">
          {TYPE_ICONS[field.type] ?? "?"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{field.label}</p>
          <p className="text-muted-foreground truncate font-mono text-xs">{field.name}</p>
        </div>

        <div className="flex flex-wrap gap-1">
          {(field.validation ?? []).map((rule, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {rule.type}
            </Badge>
          ))}
        </div>

        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              onEdit(field);
            }}
            aria-label={`Edit ${field.label}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-7 w-7"
            onClick={() => {
              onDelete(field.id);
            }}
            aria-label={`Delete ${field.label}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </InlineActionChips>
  );
}
