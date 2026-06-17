import { Camera, Trash2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DbSnapshot } from "./hooks/useDbSnapshots";
import type { DbSchema } from "@ai-builder/schemas";

interface SnapshotsPanelProps {
  snapshots: DbSnapshot[];
  onSave: (name: string) => void;
  onRestore: (schema: DbSchema) => void;
  onDelete: (id: string) => void;
}

export function SnapshotsPanel({ snapshots, onSave, onRestore, onDelete }: SnapshotsPanelProps) {
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          placeholder="Snapshot name..."
          className="h-7 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              onSave(name.trim());
              setName("");
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 px-2"
          disabled={!name.trim()}
          onClick={() => {
            if (name.trim()) {
              onSave(name.trim());
              setName("");
            }
          }}
        >
          <Camera className="h-3.5 w-3.5" />
        </Button>
      </div>

      {snapshots.length === 0 ? (
        <p className="text-muted-foreground py-2 text-center text-xs">No snapshots saved yet.</p>
      ) : (
        <ScrollArea className="max-h-40">
          <div className="space-y-1">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{snap.name}</p>
                  <p className="text-muted-foreground">
                    {new Date(snap.createdAt).toLocaleString()} · {snap.schema.tables.length}T
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0"
                  onClick={() => {
                    onRestore(snap.schema);
                  }}
                  aria-label={"Restore snapshot " + snap.name}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive h-5 w-5 shrink-0"
                  onClick={() => {
                    onDelete(snap.id);
                  }}
                  aria-label={"Delete snapshot " + snap.name}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
