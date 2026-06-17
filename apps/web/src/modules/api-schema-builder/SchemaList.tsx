import { useState } from "react";
import { Trash2, ChevronDown, ChevronRight, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ApiSchemaObject } from "@ai-builder/schemas";

interface SchemaListProps {
  schemas: ApiSchemaObject[];
  onDelete: (name: string) => void;
}

export function SchemaList({ schemas, onDelete }: SchemaListProps) {
  const [expandedName, setExpandedName] = useState<string | null>(null);

  if (schemas.length === 0) {
    return (
      <p className="text-muted-foreground py-2 text-center text-xs">
        No schema components. Ask the agent to add some.
      </p>
    );
  }

  return (
    <ScrollArea className="max-h-48">
      <div className="space-y-1">
        {schemas.map((s) => {
          const isExpanded = expandedName === s.name;
          const propCount = Object.keys(s.properties).length;
          return (
            <div key={s.name} className="overflow-hidden rounded-md border">
              <button
                type="button"
                className="hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                onClick={() => {
                  setExpandedName((prev) => (prev === s.name ? null : s.name));
                }}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="text-muted-foreground h-3 w-3 shrink-0" />
                ) : (
                  <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0" />
                )}
                <Database className="text-muted-foreground h-3 w-3 shrink-0" />
                <span className="flex-1 font-mono text-xs font-semibold">{s.name}</span>
                {s.description && (
                  <span className="text-muted-foreground hidden max-w-[120px] truncate text-[11px] sm:block">
                    {s.description}
                  </span>
                )}
                <Badge variant="outline" className="h-4 px-1 text-[10px]">
                  {propCount} prop{propCount !== 1 ? "s" : ""}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive h-5 w-5 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.name);
                  }}
                  aria-label={`Delete schema ${s.name}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </button>

              {isExpanded && (
                <div className="space-y-0.5 border-t px-3 py-2 text-xs">
                  {Object.entries(s.properties).map(([key, type]) => {
                    const isRequired = (s.required ?? []).includes(key);
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {key}
                          {isRequired && <span className="ml-0.5 text-red-500">*</span>}
                        </span>
                        <span className="text-muted-foreground font-mono text-[10px]">{type}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
