import { useCallback, useState } from "react";
import {
  Mail,
  Undo2,
  Redo2,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEmailBuilderContext } from "@/context/emailBuilder/EmailBuilderContext";
import { useEmailTools } from "./hooks/useEmailTools";
import { SectionList } from "./SectionList";
import { SectionEditor } from "./SectionEditor";
import { SpamChecker } from "./SpamChecker";
import { PresetsPanel } from "./PresetsPanel";
import { ExportPanel } from "./ExportPanel";
import { useRegisterToolDispatch } from "@/context/toolDispatch";
import { buildPresetSections } from "@ai-builder/serializers";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";
import type { PresetName } from "@ai-builder/serializers";

const SUBJECT_WARN = 50;
const SUBJECT_MAX = 60;

export function EmailBuilderPanel() {
  const { template, setTemplate, undo, redo, canUndo, canRedo, resetTemplate, setClientMode } =
    useEmailBuilderContext();

  const tools = useEmailTools(template, setTemplate, setClientMode);

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [presetToast, setPresetToast] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showSpam, setShowSpam] = useState(false);

  // ─── Tool dispatch ────────────────────────────────────────────────────────

  const handleToolCall = useCallback(
    async (call: ToolCall): Promise<ToolResult> => {
      const toolName = call.toolName as keyof typeof tools;
      const handler = tools[toolName];
      if (typeof handler === "function") {
        const result = await (handler as (args: unknown) => Promise<ToolResult>)(call.args);
        // Show toast when preset loads
        if (call.toolName === "loadPreset") {
          const name = (call.args as { name?: string }).name ?? "preset";
          showPresetToast(name);
        }
        return result;
      }
      return Promise.resolve({ error: `Unknown tool: ${call.toolName}` });
    },
    [tools]
  );

  useRegisterToolDispatch(handleToolCall);

  // ─── Preset actions ───────────────────────────────────────────────────────

  function showPresetToast(name: string) {
    setPresetToast(name);
    setTimeout(() => {
      setPresetToast(null);
    }, 2500);
  }

  function handleLoadPreset(name: PresetName) {
    const sections = buildPresetSections(name);
    setTemplate((prev) => ({ ...prev, sections }));
    setSelectedSectionId(null);
    setShowPresets(false);
    showPresetToast(name);
  }

  // ─── Section actions ──────────────────────────────────────────────────────

  function handleDelete(id: string) {
    setPendingDeleteId(id);
  }

  function confirmDelete() {
    if (!pendingDeleteId) return;
    setTemplate((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== pendingDeleteId),
    }));
    if (selectedSectionId === pendingDeleteId) setSelectedSectionId(null);
    setPendingDeleteId(null);
  }

  function handleDuplicate(id: string) {
    void tools.duplicateSection({ id });
  }

  function handleReorder(orderedIds: string[]) {
    void tools.reorderSections({ orderedIds });
  }

  function handleSectionEdit(id: string, updates: Record<string, unknown>) {
    tools.applySectionEdit(id, updates);
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  const selectedSection =
    selectedSectionId != null
      ? (template.sections.find((s) => s.id === selectedSectionId) ?? null)
      : null;

  const subjectLen = template.subject.length;
  const subjectOverWarn = subjectLen >= SUBJECT_WARN;
  const subjectOverMax = subjectLen > SUBJECT_MAX;

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Mail className="text-muted-foreground h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-sm font-semibold">{template.subject}</h2>
            <span
              className={[
                "shrink-0 font-mono text-[10px]",
                subjectOverMax
                  ? "text-red-600"
                  : subjectOverWarn
                    ? "text-amber-600"
                    : "text-muted-foreground",
              ].join(" ")}
            >
              {subjectLen}/{SUBJECT_MAX}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            {template.sections.length} section{template.sections.length !== 1 ? "s" : ""} ·{" "}
            {template.type}
          </p>
        </div>

        {/* Undo / Redo / Reset toolbar */}
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
            onClick={resetTemplate}
            title="Reset to empty"
            aria-label="Reset template"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Preset loaded toast */}
      {presetToast && (
        <div className="bg-muted text-muted-foreground flex items-center gap-1.5 rounded-md px-3 py-2 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          Preset "{presetToast}" loaded
        </div>
      )}

      {/* Spam checker toggle */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => {
          setShowSpam((v) => !v);
        }}
      >
        <ShieldAlert className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-xs font-medium">Spam / deliverability</span>
        {showSpam ? (
          <ChevronUp className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        )}
      </button>
      {showSpam && <SpamChecker template={template} />}

      <Separator />

      {/* Presets toggle */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => {
          setShowPresets((v) => !v);
        }}
      >
        <span className="text-muted-foreground text-xs font-medium">Presets</span>
        {showPresets ? (
          <ChevronUp className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        )}
      </button>
      {showPresets && <PresetsPanel onLoad={handleLoadPreset} />}

      <Separator />

      {/* Section list */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <SectionList
          sections={template.sections}
          selectedId={selectedSectionId}
          onSelect={(id) => {
            setSelectedSectionId((prev) => (prev === id ? null : id));
          }}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onReorder={handleReorder}
        />
      </div>

      {/* Inline section editor */}
      {selectedSection && (
        <>
          <Separator />
          <div className="shrink-0 overflow-y-auto" style={{ maxHeight: "280px" }}>
            <SectionEditor section={selectedSection} onUpdate={handleSectionEdit} />
          </div>
        </>
      )}

      <Separator />

      {/* Export */}
      <div className="shrink-0">
        <ExportPanel template={template} />
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete section?</DialogTitle>
            <DialogDescription>
              This will permanently remove the section from your template. This action can be undone
              with Undo.
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
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
