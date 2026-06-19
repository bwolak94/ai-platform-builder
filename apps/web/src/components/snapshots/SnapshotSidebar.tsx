import { useState, useCallback } from "react";
import { History, Save, Trash2, RotateCcw, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils";
import { useSnapshotContext } from "@/context/snapshots/SnapshotContext";
import type { SnapshotEntry, SnapshotContext as SnapshotContextData } from "@/lib/snapshots-api";

interface SnapshotSidebarProps {
  getCurrentContext: () => SnapshotContextData;
  onRestore: (context: SnapshotContextData) => void;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${String(mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${String(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return `${String(days)}d ago`;
}

function SnapshotItem({
  entry,
  onRestore,
  onDelete,
  isRestoring,
}: {
  entry: SnapshotEntry;
  onRestore: (entry: SnapshotEntry) => void;
  onDelete: (id: string) => void;
  isRestoring: boolean;
}) {
  const contextKeys = Object.entries(entry.context)
    .filter(([, v]) => v != null)
    .map(([k]) => k);

  return (
    <div className="hover:border-primary/40 hover:bg-accent/40 group rounded-md border p-3 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{entry.name}</p>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{formatRelativeTime(entry.createdAt)}</span>
          </div>
          {contextKeys.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {contextKeys.map((k) => (
                <Badge key={k} variant="secondary" className="text-[10px]">
                  {k
                    .replace(/([A-Z])/g, " $1")
                    .toLowerCase()
                    .trim()}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Restore this snapshot"
            disabled={isRestoring}
            onClick={() => {
              onRestore(entry);
            }}
          >
            {isRestoring ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-7 w-7"
            title="Delete snapshot"
            onClick={() => {
              onDelete(entry.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SnapshotSidebar({ getCurrentContext, onRestore }: SnapshotSidebarProps) {
  const { snapshots, isLoading, isSaving, save, remove } = useSnapshotContext();
  const [snapshotName, setSnapshotName] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    const name = snapshotName.trim() || `Snapshot ${new Date().toLocaleTimeString()}`;
    const context = getCurrentContext();
    await save(name, context);
    setSnapshotName("");
  }, [snapshotName, getCurrentContext, save]);

  const handleRestore = useCallback(
    (entry: SnapshotEntry) => {
      setRestoringId(entry.id);
      try {
        onRestore(entry.context);
      } finally {
        setRestoringId(null);
      }
    },
    [onRestore]
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Version history">
          <History className="h-4 w-4" />
        </Button>
      </SheetTrigger>

      <SheetContent className="w-80 p-0" side="right">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-sm">Version History</SheetTitle>
        </SheetHeader>

        {/* Save new snapshot */}
        <div className="border-b p-4">
          <p className="text-muted-foreground mb-2 text-xs font-medium">Save current state</p>
          <div className="flex gap-2">
            <Input
              value={snapshotName}
              onChange={(e) => {
                setSnapshotName(e.target.value);
              }}
              placeholder="Snapshot name…"
              className="h-8 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
              }}
            />
            <Button
              size="sm"
              className="h-8 shrink-0"
              disabled={isSaving}
              onClick={() => void handleSave()}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Snapshot list */}
        <ScrollArea className="h-[calc(100vh-160px)]">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            ) : snapshots.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">No snapshots yet.</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Save a snapshot to preserve the current state.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {snapshots.map((entry, index) => (
                  <div key={entry.id}>
                    <SnapshotItem
                      entry={entry}
                      onRestore={(e) => {
                        handleRestore(e);
                      }}
                      onDelete={(id) => {
                        void remove(id);
                      }}
                      isRestoring={restoringId === entry.id}
                    />
                    {index < snapshots.length - 1 && (
                      <div className={cn("bg-border ml-4 mt-1 h-3 w-px")} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
