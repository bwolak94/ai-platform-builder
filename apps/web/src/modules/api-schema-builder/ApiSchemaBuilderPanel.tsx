import { useCallback, useState } from "react";
import {
  Network,
  Undo2,
  Redo2,
  RotateCcw,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Camera,
  Tag,
  Database,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApiState } from "./hooks/useApiState";
import { useApiTools } from "./hooks/useApiTools";
import { useApiSnapshots } from "./hooks/useApiSnapshots";
import { EndpointList } from "./EndpointList";
import { SchemaList } from "./SchemaList";
import { LintPanel } from "./LintPanel";
import { SnapshotsPanel } from "./SnapshotsPanel";
import { ApiInfoSection } from "./ApiInfoSection";
import { ExportPanel } from "./ExportPanel";
import { useRegisterToolDispatch } from "@/context/toolDispatch";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

export function ApiSchemaBuilderPanel() {
  const { spec, setSpec, undo, redo, canUndo, canRedo, resetSpec } = useApiState();
  const tools = useApiTools(spec, setSpec);
  const { snapshots, saveSnapshot, deleteSnapshot } = useApiSnapshots();

  const [showLint, setShowLint] = useState(false);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showSchemas, setShowSchemas] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingResetOpen, setPendingResetOpen] = useState(false);

  // ─── Tool dispatch ────────────────────────────────────────────────────────

  const handleToolCall = useCallback(
    async (call: ToolCall): Promise<ToolResult> => {
      const toolName = call.toolName as keyof typeof tools;
      const handler = tools[toolName];
      if (typeof handler === "function") {
        return (handler as (args: unknown) => Promise<ToolResult>)(call.args);
      }
      return Promise.resolve({ error: `Unknown tool: ${call.toolName}` });
    },
    [tools]
  );

  useRegisterToolDispatch(handleToolCall);

  // ─── Actions ─────────────────────────────────────────────────────────────

  function handleDeleteEndpoint(id: string) {
    setPendingDeleteId(id);
  }

  function confirmDeleteEndpoint() {
    if (!pendingDeleteId) return;
    setSpec((prev) => ({
      ...prev,
      endpoints: prev.endpoints.filter((e) => e.id !== pendingDeleteId),
    }));
    setPendingDeleteId(null);
  }

  function handleDeleteSchema(name: string) {
    setSpec((prev) => ({
      ...prev,
      schemas: prev.schemas.filter((s) => s.name !== name),
    }));
  }

  function handleRestoreSnapshot(restoredSpec: typeof spec) {
    setSpec(restoredSpec);
  }

  function handleUpdateSpecInfo(
    updates: Partial<
      Pick<typeof spec, "title" | "version" | "baseUrl" | "description" | "securityScheme">
    >
  ) {
    setSpec((prev) => ({ ...prev, ...updates }));
  }

  // ─── Derived values ───────────────────────────────────────────────────────

  const tagDefs = spec.tagDefinitions ?? [];
  const endpointCount = spec.endpoints.length;
  const schemaCount = spec.schemas.length;

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Network className="text-muted-foreground h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">
            {spec.title}
            <span className="text-muted-foreground ml-1 font-normal">v{spec.version}</span>
          </h2>
          <p className="text-muted-foreground text-xs">
            {endpointCount} endpoint{endpointCount !== 1 ? "s" : ""}
            {schemaCount > 0 && ` · ${String(schemaCount)} schema${schemaCount !== 1 ? "s" : ""}`}
            {spec.securityScheme && spec.securityScheme !== "None" && ` · ${spec.securityScheme}`}
            {spec.baseUrl && (
              <span className="ml-1 truncate font-mono text-[10px]">{spec.baseUrl}</span>
            )}
          </p>
        </div>

        {/* Undo / Redo / Reset */}
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
            aria-label="Undo"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={redo}
            disabled={!canRedo}
            title="Redo"
            aria-label="Redo"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              setPendingResetOpen(true);
            }}
            title="Reset spec"
            aria-label="Reset spec"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Lint toggle */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => {
          setShowLint((v) => !v);
        }}
      >
        <ShieldAlert className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-xs font-medium">API Linter</span>
        {showLint ? (
          <ChevronUp className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        )}
      </button>
      {showLint && <LintPanel spec={spec} />}

      {/* Snapshots toggle */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => {
          setShowSnapshots((v) => !v);
        }}
      >
        <Camera className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-xs font-medium">
          Snapshots
          {snapshots.length > 0 && (
            <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px]">
              {snapshots.length}
            </Badge>
          )}
        </span>
        {showSnapshots ? (
          <ChevronUp className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        )}
      </button>
      {showSnapshots && (
        <SnapshotsPanel
          spec={spec}
          snapshots={snapshots}
          onSave={saveSnapshot}
          onRestore={handleRestoreSnapshot}
          onDelete={deleteSnapshot}
        />
      )}

      {/* API Info editor */}
      <ApiInfoSection spec={spec} onUpdate={handleUpdateSpecInfo} />

      <Separator />

      {/* Endpoints */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <EndpointList endpoints={spec.endpoints} onDelete={handleDeleteEndpoint} />
      </div>

      <Separator />

      {/* Schemas section */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => {
          setShowSchemas((v) => !v);
        }}
      >
        <Database className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-xs font-medium">
          Schemas
          {schemaCount > 0 && (
            <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px]">
              {schemaCount}
            </Badge>
          )}
        </span>
        {showSchemas ? (
          <ChevronUp className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        )}
      </button>
      {showSchemas && <SchemaList schemas={spec.schemas} onDelete={handleDeleteSchema} />}

      {/* Tags section */}
      {tagDefs.length > 0 && (
        <>
          <button
            type="button"
            className="flex w-full items-center gap-1.5 text-left"
            onClick={() => {
              setShowTags((v) => !v);
            }}
          >
            <Tag className="text-muted-foreground h-3.5 w-3.5" />
            <span className="text-muted-foreground text-xs font-medium">
              Tags
              <Badge variant="outline" className="ml-1.5 h-4 px-1 text-[10px]">
                {tagDefs.length}
              </Badge>
            </span>
            {showTags ? (
              <ChevronUp className="text-muted-foreground ml-auto h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="text-muted-foreground ml-auto h-3.5 w-3.5" />
            )}
          </button>
          {showTags && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {tagDefs.map((t) => (
                <div key={t.name} className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[11px]">
                    {t.name}
                  </Badge>
                  {t.description && (
                    <span className="text-muted-foreground text-[10px]">{t.description}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Separator />

      {/* Export */}
      <div className="shrink-0">
        <ExportPanel spec={spec} />
      </div>

      {/* Delete endpoint confirmation */}
      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete endpoint?</DialogTitle>
            <DialogDescription>
              {(() => {
                const ep = spec.endpoints.find((e) => e.id === pendingDeleteId);
                return ep
                  ? `Remove ${ep.method} ${ep.path} from the spec.`
                  : "Remove this endpoint from the spec.";
              })()}{" "}
              This can be undone with Undo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingDeleteId(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteEndpoint}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset confirmation */}
      <Dialog
        open={pendingResetOpen}
        onOpenChange={(open) => {
          if (!open) setPendingResetOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset spec?</DialogTitle>
            <DialogDescription>
              This will clear all endpoints, schemas, and tags. Consider saving a snapshot first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingResetOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetSpec();
                setPendingResetOpen(false);
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
