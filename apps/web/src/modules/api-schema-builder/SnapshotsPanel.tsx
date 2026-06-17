import { useState } from "react";
import { Save, Trash2, RotateCcw, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OpenApiSpec } from "@ai-builder/schemas";
import type { ApiSnapshot } from "./hooks/useApiSnapshots";

interface SnapshotsPanelProps {
  spec: OpenApiSpec;
  snapshots: ApiSnapshot[];
  onSave: (spec: OpenApiSpec, name: string) => void;
  onRestore: (spec: OpenApiSpec) => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SnapshotsPanel({
  spec,
  snapshots,
  onSave,
  onRestore,
  onDelete,
}: SnapshotsPanelProps) {
  const [name, setName] = useState("");
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);

  function handleSave() {
    const trimmed = name.trim() || `${spec.title} ${spec.version}`;
    onSave(spec, trimmed);
    setName("");
  }

  function confirmRestore(snapshot: ApiSnapshot) {
    if (pendingRestoreId === snapshot.id) {
      onRestore(snapshot.spec);
      setPendingRestoreId(null);
    } else {
      setPendingRestoreId(snapshot.id);
    }
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      {/* Save new snapshot */}
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          placeholder={`${spec.title} ${spec.version}`}
          className="h-7 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
        <Button variant="outline" size="sm" className="h-7 shrink-0" onClick={handleSave}>
          <Camera className="mr-1 h-3 w-3" />
          Save
        </Button>
      </div>

      {snapshots.length === 0 ? (
        <p className="text-muted-foreground text-[11px]">No snapshots saved yet.</p>
      ) : (
        <ul className="space-y-1">
          {snapshots.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name}</p>
                <p className="text-muted-foreground text-[10px]">{formatDate(s.savedAt)}</p>
              </div>
              <Button
                variant={pendingRestoreId === s.id ? "destructive" : "ghost"}
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => {
                  confirmRestore(s);
                }}
                title={
                  pendingRestoreId === s.id
                    ? "Click again to confirm restore"
                    : "Restore this snapshot"
                }
                aria-label={`Restore snapshot: ${s.name}`}
              >
                {pendingRestoreId === s.id ? (
                  <Save className="h-3 w-3" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive h-6 w-6 shrink-0"
                onClick={() => {
                  onDelete(s.id);
                }}
                aria-label={`Delete snapshot: ${s.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground text-[10px]">
        Up to 5 snapshots stored locally. Restore replaces the current spec.
      </p>
    </div>
  );
}
