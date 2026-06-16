import { useState, useRef } from "react";
import { Trash2, GripVertical, Copy, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EmailSection } from "@ai-builder/schemas";

interface SectionListProps {
  sections: EmailSection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

const SECTION_LABELS: Record<EmailSection["type"], string> = {
  header: "Header",
  hero: "Hero",
  text: "Text",
  cta: "CTA",
  footer: "Footer",
  columns: "Columns",
};

const SECTION_COLORS: Record<EmailSection["type"], string> = {
  header: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  hero: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  text: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  cta: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  footer: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  columns: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

function getSectionSummary(section: EmailSection): string {
  switch (section.type) {
    case "header":
      return section.title ?? (section.logoUrl ? "Logo" : null) ?? section.logoAlt ?? "Header";
    case "hero":
      return section.heading;
    case "text":
      return section.content.length > 45 ? section.content.slice(0, 45) + "…" : section.content;
    case "cta":
      return `${section.cta.label} → ${section.cta.url}`;
    case "footer":
      return [section.companyName, section.address].filter(Boolean).join(" · ") || "Footer";
    case "columns":
      return `${String(section.columns.length)} columns`;
  }
}

export function SectionList({
  sections,
  selectedId,
  onSelect,
  onDelete,
  onDuplicate,
  onReorder,
}: SectionListProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  function handleDragStart(id: string) {
    dragIdRef.current = id;
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (dragIdRef.current !== id) setDragOverId(id);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const sourceId = dragIdRef.current;
    dragIdRef.current = null;
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) return;

    const ids = sections.map((s) => s.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;

    const reordered = [...ids];
    reordered.splice(from, 1);
    reordered.splice(to, 0, sourceId);
    onReorder(reordered);
  }

  function handleDragEnd() {
    dragIdRef.current = null;
    setDragOverId(null);
  }

  if (sections.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-xs">
        No sections yet. Ask the agent to add some, or load a preset.
      </p>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1">
        {sections.map((section) => {
          const isSelected = selectedId === section.id;
          const isDragTarget = dragOverId === section.id;

          return (
            <div
              key={section.id}
              draggable
              onDragStart={() => {
                handleDragStart(section.id);
              }}
              onDragOver={(e) => {
                handleDragOver(e, section.id);
              }}
              onDrop={(e) => {
                handleDrop(e, section.id);
              }}
              onDragEnd={handleDragEnd}
              className={[
                "group flex cursor-pointer select-none items-center gap-1.5 rounded-md border px-2 py-1.5 transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/40",
                isDragTarget ? "border-primary bg-primary/5 border-dashed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                onSelect(section.id);
              }}
              role="button"
              aria-pressed={isSelected}
              aria-label={`${SECTION_LABELS[section.type]} section: ${getSectionSummary(section)}`}
            >
              {/* Drag handle */}
              <GripVertical className="text-muted-foreground h-3.5 w-3.5 shrink-0 cursor-grab active:cursor-grabbing" />

              {/* Type badge */}
              <span
                className={
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium " +
                  SECTION_COLORS[section.type]
                }
              >
                {SECTION_LABELS[section.type]}
              </span>

              {/* Summary */}
              <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                {getSectionSummary(section)}
              </span>

              {/* Color swatch */}
              {section.bgColor && (
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border"
                  style={{ backgroundColor: section.bgColor }}
                  title={`Background: ${section.bgColor}`}
                  aria-label={`Background color ${section.bgColor}`}
                />
              )}

              {/* Selected indicator */}
              {isSelected && <ChevronRight className="text-primary h-3 w-3 shrink-0" />}

              {/* Action buttons — always visible, slightly muted when unselected */}
              <div
                className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 aria-pressed:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => {
                    onDuplicate(section.id);
                  }}
                  aria-label={`Duplicate ${section.type} section`}
                  title="Duplicate"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive h-5 w-5"
                  onClick={() => {
                    onDelete(section.id);
                  }}
                  aria-label={`Delete ${section.type} section`}
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
