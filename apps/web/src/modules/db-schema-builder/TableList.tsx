import { Trash2, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DbSchema, Table } from "@ai-builder/schemas";

interface TableListProps {
  schema: DbSchema;
  onDeleteTable: (name: string) => void;
}

function TableRow({ table, onDelete }: { table: Table; onDelete: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const indexes = table.indexes ?? [];

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
          {table.columns.length}c
        </Badge>
        {indexes.length > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {indexes.length}i
          </Badge>
        )}
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
        <div className="space-y-0.5 border-t px-3 pb-2 pt-1">
          {table.columns.map((col) => (
            <div key={col.name} className="flex items-start gap-2 py-0.5 text-xs">
              <span className="text-foreground w-28 shrink-0 truncate font-mono">{col.name}</span>
              <span className="text-muted-foreground w-24 shrink-0 font-mono">{col.type}</span>
              <div className="flex flex-wrap gap-0.5">
                {col.primaryKey && <Badge className="h-3.5 px-1 text-[9px]">PK</Badge>}
                {col.unique && (
                  <Badge variant="secondary" className="h-3.5 px-1 text-[9px]">
                    UQ
                  </Badge>
                )}
                {col.nullable === false && (
                  <Badge variant="outline" className="h-3.5 px-1 text-[9px]">
                    NN
                  </Badge>
                )}
                {col.foreignKey && (
                  <Badge variant="outline" className="h-3.5 px-1 font-mono text-[9px]">
                    FK→{col.foreignKey.table}.{col.foreignKey.column}
                  </Badge>
                )}
                {col.default && (
                  <Badge variant="secondary" className="h-3.5 px-1 font-mono text-[9px]">
                    ={col.default}
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {indexes.length > 0 && (
            <div className="mt-1.5 border-t pt-1.5">
              {indexes.map((idx, i) => (
                <div
                  key={i}
                  className="text-muted-foreground flex items-center gap-1.5 text-[10px]"
                >
                  <span className="font-mono">IDX</span>
                  <span>{idx.columns.join(", ")}</span>
                  {idx.unique && (
                    <Badge variant="outline" className="h-3 px-1 text-[8px]">
                      UNIQUE
                    </Badge>
                  )}
                  {idx.name && <span className="opacity-60">({idx.name})</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TableList({ schema, onDeleteTable }: TableListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return schema.tables;
    const q = search.toLowerCase();
    return schema.tables.filter(
      (t) => t.name.includes(q) || t.columns.some((c) => c.name.includes(q) || c.type.includes(q))
    );
  }, [schema.tables, search]);

  if (schema.tables.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-xs">
        No tables yet. Ask the agent to create some.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="relative">
        <Search className="text-muted-foreground absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          placeholder="Search tables or columns..."
          className="h-7 pl-7 text-xs"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1.5">
          {filtered.map((table) => (
            <TableRow key={table.name} table={table} onDelete={onDeleteTable} />
          ))}
          {filtered.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-xs">
              No tables match "{search}".
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
