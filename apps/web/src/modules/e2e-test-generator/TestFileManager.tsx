import { useState } from "react";
import { Plus, X, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TestManagerState } from "@ai-builder/schemas";

interface TestFileManagerProps {
  managerState: TestManagerState;
  onSwitch: (fileId: string) => void;
  onRemove: (fileId: string) => void;
  onAdd: () => void;
}

export function TestFileManager({ managerState, onSwitch, onRemove, onAdd }: TestFileManagerProps) {
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const { files, activeFileId } = managerState;

  const pendingFile = pendingRemoveId ? files.find((f) => f.id === pendingRemoveId) : null;

  if (files.length <= 1) {
    return (
      <div className="flex items-center gap-1.5">
        <FileCode2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        <span className="text-muted-foreground truncate font-mono text-[11px]">
          {files[0]?.filename ?? "app.spec.ts"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-5 w-5 shrink-0"
          onClick={onAdd}
          title="Add test file"
          aria-label="Add new test file"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <ScrollArea className="flex-1">
          <div className="flex gap-0.5 pb-0.5">
            {files.map((file) => {
              const isActive = file.id === activeFileId;
              return (
                <div
                  key={file.id}
                  className={[
                    "flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-foreground cursor-pointer",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!isActive) onSwitch(file.id);
                    }}
                    className="max-w-[100px] truncate"
                    title={file.filename}
                  >
                    {file.filename.replace(".spec.ts", "")}
                  </button>
                  {files.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingRemoveId(file.id);
                      }}
                      className={[
                        "h-3.5 w-3.5 rounded-sm opacity-60 transition-opacity hover:opacity-100",
                        isActive ? "hover:text-primary-foreground" : "",
                      ].join(" ")}
                      aria-label={"Remove " + file.filename}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onAdd}
          title="Add test file"
          aria-label="Add new test file"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <Dialog
        open={pendingRemoveId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoveId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove test file?</DialogTitle>
            <DialogDescription>
              Remove <strong>{pendingFile?.filename ?? "this file"}</strong>? This can be undone
              with Undo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingRemoveId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingRemoveId) onRemove(pendingRemoveId);
                setPendingRemoveId(null);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
