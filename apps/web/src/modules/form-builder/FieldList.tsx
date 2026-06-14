import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { FieldItem } from "./FieldItem";
import { EmptyState } from "@/ui";
import type { FormField, FormSchema } from "@ai-builder/schemas";

interface FieldListProps {
  schema: FormSchema;
  onReorder: (orderedIds: string[]) => void;
  onEdit: (field: FormField) => void;
  onDelete: (fieldId: string) => void;
}

export function FieldList({ schema, onReorder, onEdit, onDelete }: FieldListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = schema.fields.findIndex((f) => f.id === active.id);
    const newIndex = schema.fields.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(schema.fields, oldIndex, newIndex);
    onReorder(reordered.map((f) => f.id));
  }

  if (schema.fields.length === 0) {
    return (
      <EmptyState
        title="No fields yet"
        description='Ask the agent to "add a name field" or use the button below'
      />
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={schema.fields.map((f) => f.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {schema.fields.map((field) => (
            <FieldItem key={field.id} field={field} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
