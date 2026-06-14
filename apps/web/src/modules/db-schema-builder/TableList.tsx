import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DbSchema, Table } from "@ai-builder/schemas";

interface TableListProps {
  schema: DbSchema;
  onDeleteTable: (name: string) => void;
}

function TableRow({ table, onDelete }: { table: Table; onDelete: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          className="text-muted-foreground"
          onClick={() => {
            setExpanded((v) => !v);
          }}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <span className="flex-1 font-mono text-sm font-medium">{table.name}</span>
        <Badge variant="secondary" className="text-[10px]">
          {table.columns.length} cols
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive h-5 w-5"
          onClick={() => {
            onDelete(table.name);
          }}
          aria-label={"Delete table " + table.name}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {expanded && (
        <div className="border-t px-3 pb-2 pt-1">
          {table.columns.map((col) => (
            <div key={col.name} className="flex items-center gap-2 py-0.5 text-xs">
              <span className="text-foreground w-32 truncate font-mono">{col.name}</span>
              <span className="text-muted-foreground font-mono">{col.type}</span>
              <div className="flex gap-1">
                {col.primaryKey && <Badge className="h-3.5 px-1 text-[9px]">PK</Badge>}
                {col.foreignKey && (
                  <Badge variant="outline" className="h-3.5 px-1 text-[9px]">
                    FK
                  </Badge>
                )}
                {col.unique && (
                  <Badge variant="secondary" className="h-3.5 px-1 text-[9px]">
                    UQ
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TableList({ schema, onDeleteTable }: TableListProps) {
  if (schema.tables.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-xs">
        No tables yet. Ask the agent to create some.
      </p>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1.5">
        {schema.tables.map((table) => (
          <TableRow key={table.name} table={table} onDelete={onDeleteTable} />
        ))}
      </div>
    </ScrollArea>
  );
}
