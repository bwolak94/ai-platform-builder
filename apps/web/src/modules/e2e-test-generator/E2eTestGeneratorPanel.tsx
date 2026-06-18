import { useCallback, useState } from "react";
import { TestTube2, Undo2, Redo2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useE2eState, createDefaultTestFile } from "./hooks/useE2eState";
import { useE2eTools } from "./hooks/useE2eTools";
import { TestCaseList } from "./TestCaseList";
import { ExportPanel } from "./ExportPanel";
import { SpecPreview } from "./SpecPreview";
import { PresetsPanel } from "./PresetsPanel";
import { TestFileManager } from "./TestFileManager";
import { PlaywrightConfigPanel } from "./PlaywrightConfigPanel";
import { useRegisterToolDispatch } from "@/context/toolDispatch";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";
import type { TestFile } from "@ai-builder/schemas";

const QUICK_PROMPTS = [
  "Add a login and logout test",
  "Write a form submission test with validation",
  "Add an accessibility check for all pages",
];

export function E2eTestGeneratorPanel() {
  const {
    managerState,
    setManagerState,
    activeFile,
    setActiveFile,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  } = useE2eState();

  const tools = useE2eTools(activeFile, setActiveFile, managerState, setManagerState);

  const [showPresets, setShowPresets] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // ── Tool dispatch ────────────────────────────────────────────────────────────

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

  // ── Multi-file actions ───────────────────────────────────────────────────────

  function handleAddFile() {
    const file = createDefaultTestFile();
    setManagerState((state) => ({
      files: [...state.files, file],
      activeFileId: file.id,
    }));
  }

  function handleSwitchFile(fileId: string) {
    setManagerState((state) => ({ ...state, activeFileId: fileId }));
  }

  function handleRemoveFile(fileId: string) {
    setManagerState((state) => {
      if (state.files.length <= 1) return state;
      const remaining = state.files.filter((f) => f.id !== fileId);
      const newActiveId =
        state.activeFileId === fileId ? (remaining[0]?.id ?? "") : state.activeFileId;
      return { files: remaining, activeFileId: newActiveId };
    });
  }

  // ── Test case / step actions ─────────────────────────────────────────────────

  function handleDeleteTestCase(id: string) {
    setActiveFile((prev) => ({
      ...prev,
      testCases: prev.testCases.filter((tc) => tc.id !== id),
    }));
  }

  function handleDeleteStep(testCaseId: string, stepId: string) {
    setActiveFile((prev) => ({
      ...prev,
      testCases: prev.testCases.map((tc) =>
        tc.id === testCaseId ? { ...tc, steps: tc.steps.filter((s) => s.id !== stepId) } : tc
      ),
    }));
  }

  // ── Preset load ──────────────────────────────────────────────────────────────

  function handleLoadPreset(partial: Pick<TestFile, "filename" | "description" | "testCases">) {
    setActiveFile((prev) => ({ ...prev, ...partial }));
    setShowPresets(false);
  }

  // ── Quick prompt injection ───────────────────────────────────────────────────

  function injectPrompt(text: string) {
    const textarea =
      document.querySelector<HTMLTextAreaElement>('textarea[name="chat"]') ??
      document.querySelector<HTMLTextAreaElement>("textarea");
    if (!textarea) return;
    const nativeInput = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    nativeInput?.set?.call(textarea, text);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const totalSteps = activeFile.testCases.reduce((sum, tc) => sum + tc.steps.length, 0);
  const caseCount = activeFile.testCases.length;

  return (
    <div className="flex h-full flex-col gap-2.5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <TestTube2 className="text-muted-foreground h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{activeFile.filename}</h2>
          <p className="text-muted-foreground text-xs">
            {caseCount} test{caseCount !== 1 ? "s" : ""} · {totalSteps} step
            {totalSteps !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={undo}
            disabled={!canUndo}
            title="Undo"
            aria-label="Undo last change"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={redo}
            disabled={!canRedo}
            title="Redo"
            aria-label="Redo last change"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-6 w-6"
            onClick={() => {
              setShowResetDialog(true);
            }}
            title="Reset"
            aria-label="Reset test file"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Multi-file tab bar ─────────────────────────────────────────────── */}
      <TestFileManager
        managerState={managerState}
        onSwitch={handleSwitchFile}
        onRemove={handleRemoveFile}
        onAdd={handleAddFile}
      />

      {/* ── Base URL ───────────────────────────────────────────────────────── */}
      <div className="bg-muted/40 rounded-md border px-3 py-1.5">
        <p className="text-muted-foreground text-[10px]">Base URL</p>
        <p className="truncate font-mono text-xs">{activeFile.baseUrl}</p>
      </div>

      <Separator />

      {/* ── Presets toggle ─────────────────────────────────────────────────── */}
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
      {showPresets && (
        <div className="shrink-0">
          <PresetsPanel onLoad={handleLoadPreset} />
        </div>
      )}

      {/* ── Quick-start prompts (empty state) ─────────────────────────────── */}
      {caseCount === 0 && !showPresets && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Quick start
          </p>
          <div className="flex flex-wrap gap-1">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  injectPrompt(prompt);
                }}
                className="border-border hover:border-primary hover:bg-muted/50 rounded-full border px-2 py-0.5 text-[11px] transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* ── Main tabbed content ─────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <Tabs defaultValue="tests" className="flex h-full flex-col">
          <TabsList className="mb-1 h-7 shrink-0">
            <TabsTrigger value="tests" className="h-6 px-2 text-[11px]">
              Tests
              {caseCount > 0 && <span className="text-muted-foreground ml-1">({caseCount})</span>}
            </TabsTrigger>
            <TabsTrigger value="code" className="h-6 px-2 text-[11px]">
              Code
            </TabsTrigger>
            <TabsTrigger value="config" className="h-6 px-2 text-[11px]">
              Config
            </TabsTrigger>
          </TabsList>

          {/* Tests tab */}
          <TabsContent value="tests" className="mt-0 min-h-0 flex-1 overflow-hidden">
            <TestCaseList
              testCases={activeFile.testCases}
              onDelete={handleDeleteTestCase}
              onDeleteStep={handleDeleteStep}
            />
          </TabsContent>

          {/* Code tab */}
          <TabsContent value="code" className="mt-0 min-h-0 flex-1 overflow-hidden">
            <SpecPreview testFile={activeFile} />
          </TabsContent>

          {/* Config tab */}
          <TabsContent value="config" className="mt-0 min-h-0 flex-1 overflow-hidden">
            <PlaywrightConfigPanel testFile={activeFile} />
          </TabsContent>
        </Tabs>
      </div>

      <Separator />

      {/* ── Export ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0">
        <ExportPanel testFile={activeFile} />
      </div>

      {/* ── Reset confirmation ──────────────────────────────────────────────── */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset test file?</DialogTitle>
            <DialogDescription>
              Reset <strong>{activeFile.filename}</strong> to a blank state. This can be undone with
              Undo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResetDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                reset();
                setShowResetDialog(false);
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
