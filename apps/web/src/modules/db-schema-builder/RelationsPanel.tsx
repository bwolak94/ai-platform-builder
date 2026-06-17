import { Link2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DbSchema, Relation } from "@ai-builder/schemas";

interface RelationsPanelProps {
  schema: DbSchema;
  onRemove: (from: string, to: string) => void;
}

const RELATION_LABELS: Record<Relation["type"], string> = {
  "one-to-one": "1:1",
  "one-to-many": "1:N",
  "many-to-many": "M:N",
};

export function RelationsPanel({ schema, onRemove }: RelationsPanelProps) {
  const relations = schema.relations ?? [];

  if (relations.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-xs">
        No relations yet. Ask the agent to define them.
      </p>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1.5">
        {relations.map((rel) => (
          <div
            key={rel.from + "->" + rel.to}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
          >
            <Link2 className="text-muted-foreground h-3 w-3 shrink-0" />
            <span className="font-mono">{rel.from}</span>
            <span className="text-muted-foreground">→</span>
            <span className="flex-1 font-mono">{rel.to}</span>
            <Badge variant="secondary" className="shrink-0 text-[9px]">
              {RELATION_LABELS[rel.type]}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-5 w-5 shrink-0"
              onClick={() => {
                onRemove(rel.from, rel.to);
              }}
              aria-label={"Remove relation " + rel.from + " -> " + rel.to}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
