import { useCallback, useState } from "react";
import {
  BookOpen,
  Undo2,
  Redo2,
  RotateCcw,
  Upload,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStoryState, createDefaultStoryFile } from "./hooks/useStoryState";
import { useStoryTools } from "./hooks/useStoryTools";
import { useStoryImport } from "./hooks/useStoryImport";
import { VariantList } from "./VariantList";
import { ExportPanel } from "./ExportPanel";
import { ArgTypeListSection } from "./ArgTypeList";
import { PresetsPanel } from "./PresetsPanel";
import { ControlsPanel } from "./ControlsPanel";
import { DecoratorsPanel } from "./DecoratorsPanel";
import { StoryFileManager } from "./StoryFileManager";
import { StoryCodePreview } from "./StoryCodePreview";
import { StoryPreview } from "./StoryPreview";
import { useRegisterToolDispatch } from "@/context/toolDispatch";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";
import type { StoryFile } from "@ai-builder/schemas";

const QUICK_PROMPTS = [
  "Add Primary, Secondary, Disabled variants",
  "Add autodocs tag and controls",
  "Add responsive viewport variants",
];

export function ComponentStoryBuilderPanel() {
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
  } = useStoryState();

  const tools = useStoryTools(activeFile, setActiveFile, managerState, setManagerState);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showDecorators, setShowDecorators] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // ── Import ──────────────────────────────────────────────────────────────────

  const { openPicker } = useStoryImport({
    onImport: (file: StoryFile) => {
      setActiveFile(file);
      setSelectedVariantId(null);
      setImportSuccess(file.componentName + ".stories.tsx imported");
      setTimeout(() => {
        setImportSuccess(null);
      }, 2500);
    },
    onError: (msg: string) => {
      setImportError(msg);
      setTimeout(() => {
        setImportError(null);
      }, 4000);
    },
  });

  // ── Tool dispatch ───────────────────────────────────────────────────────────

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

  // ── Multi-file actions ──────────────────────────────────────────────────────

  function handleAddFile() {
    const file = createDefaultStoryFile();
    setManagerState((state) => ({
      files: [...state.files, file],
      activeFileId: file.id,
    }));
    setSelectedVariantId(null);
  }

  function handleSwitchFile(fileId: string) {
    setManagerState((state) => ({ ...state, activeFileId: fileId }));
    setSelectedVariantId(null);
  }

  function handleRemoveFile(fileId: string) {
    setManagerState((state) => {
      if (state.files.length <= 1) return state;
      const remaining = state.files.filter((f) => f.id !== fileId);
      const newActiveId =
        state.activeFileId === fileId ? (remaining[0]?.id ?? "") : state.activeFileId;
      return { files: remaining, activeFileId: newActiveId };
    });
    setSelectedVariantId(null);
  }

  // ── Variant actions ─────────────────────────────────────────────────────────

  function handleDeleteVariant(id: string) {
    setActiveFile((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => v.id !== id),
    }));
    if (selectedVariantId === id) setSelectedVariantId(null);
  }

  function handleUpdateVariantArgs(variantId: string, args: Record<string, unknown>) {
    setActiveFile((prev) => ({
      ...prev,
      variants: prev.variants.map((v) => (v.id === variantId ? { ...v, args } : v)),
    }));
  }

  // ── Decorator actions ───────────────────────────────────────────────────────

  function handleAddDecorator(decorator: string) {
    setActiveFile((prev) => ({
      ...prev,
      decorators: [...(prev.decorators ?? []), decorator],
    }));
  }

  function handleRemoveDecorator(decorator: string) {
    setActiveFile((prev) => ({
      ...prev,
      decorators: (prev.decorators ?? []).filter((d) => d !== decorator),
    }));
  }

  // ── ArgType deletion ────────────────────────────────────────────────────────

  function handleDeleteArgType(name: string) {
    setActiveFile((prev) => ({
      ...prev,
      argTypes: (prev.argTypes ?? []).filter((a) => a.name !== name),
    }));
  }

  // ── Preset load ─────────────────────────────────────────────────────────────

  function handleLoadPreset(partial: Partial<StoryFile> & { variants: StoryFile["variants"] }) {
    setActiveFile((prev) => ({ ...prev, ...partial }));
    setShowPresets(false);
    setSelectedVariantId(null);
  }

  // ── Quick prompt injection ──────────────────────────────────────────────────

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

  // Derived
  const variantCount = activeFile.variants.length;
  const hasArgTypes = (activeFile.argTypes?.length ?? 0) > 0;
  const hasTags = (activeFile.tags?.length ?? 0) > 0;

  return (
    <div className="flex h-full flex-col gap-2.5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <BookOpen className="text-muted-foreground h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{activeFile.componentName}</h2>
          <p className="text-muted-foreground text-xs">
            {variantCount} variant{variantCount !== 1 ? "s" : ""}
            {hasArgTypes ? ` · ${String(activeFile.argTypes?.length ?? 0)} controls` : ""}
            {hasTags ? ` · ${activeFile.tags?.join(", ") ?? ""}` : ""}
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
            aria-label="Reset story file"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={openPicker}
            title="Import .stories.tsx"
            aria-label="Import existing story file"
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Multi-file tab bar ─────────────────────────────────────────────── */}
      <StoryFileManager
        managerState={managerState}
        onSwitch={handleSwitchFile}
        onRemove={handleRemoveFile}
        onAdd={handleAddFile}
      />

      {/* ── Import feedback ────────────────────────────────────────────────── */}
      {importSuccess && (
        <div className="bg-muted flex items-center gap-1.5 rounded-md px-3 py-2 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          {importSuccess}
        </div>
      )}
      {importError && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {importError}
        </div>
      )}

      {/* ── Path ──────────────────────────────────────────────────────────── */}
      <div className="bg-muted/40 rounded-md border px-3 py-1.5">
        <p className="text-muted-foreground text-[10px]">import from</p>
        <p className="truncate font-mono text-xs">{activeFile.componentPath}</p>
      </div>

      {/* ── Tags ──────────────────────────────────────────────────────────── */}
      {hasTags && (
        <div className="flex flex-wrap gap-1">
          {(activeFile.tags ?? []).map((tag) => (
            <Badge key={tag} variant="outline" className="gap-1 text-[10px]">
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

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
      {variantCount === 0 && !showPresets && (
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
        <Tabs defaultValue="variants" className="flex h-full flex-col">
          <TabsList className="mb-1 h-7 shrink-0">
            <TabsTrigger value="variants" className="h-6 px-2 text-[11px]">
              Variants
              {variantCount > 0 && (
                <span className="text-muted-foreground ml-1">({variantCount})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="controls" className="h-6 px-2 text-[11px]">
              Controls
            </TabsTrigger>
            <TabsTrigger value="preview" className="h-6 px-2 text-[11px]">
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="h-6 px-2 text-[11px]">
              Code
            </TabsTrigger>
          </TabsList>

          {/* Variants tab */}
          <TabsContent value="variants" className="mt-0 min-h-0 flex-1 overflow-hidden">
            <div className="flex h-full flex-col gap-2">
              <VariantList
                variants={activeFile.variants}
                selectedId={selectedVariantId}
                onSelect={setSelectedVariantId}
                onDelete={handleDeleteVariant}
              />
              {hasArgTypes && (
                <>
                  <Separator />
                  <div className="shrink-0">
                    <ArgTypeListSection
                      argTypes={activeFile.argTypes}
                      onDelete={handleDeleteArgType}
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Controls tab */}
          <TabsContent value="controls" className="mt-0 min-h-0 flex-1 overflow-auto">
            <ControlsPanel
              file={activeFile}
              selectedVariantId={selectedVariantId}
              onUpdateVariantArgs={handleUpdateVariantArgs}
            />
          </TabsContent>

          {/* Preview tab */}
          <TabsContent value="preview" className="mt-0 min-h-0 flex-1 overflow-hidden">
            <StoryPreview file={activeFile} />
          </TabsContent>

          {/* Code tab */}
          <TabsContent value="code" className="mt-0 min-h-0 flex-1 overflow-hidden">
            <StoryCodePreview storyFile={activeFile} />
          </TabsContent>
        </Tabs>
      </div>

      <Separator />

      {/* ── Decorators toggle ─────────────────────────────────────────────── */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => {
          setShowDecorators((v) => !v);
        }}
      >
        <span className="text-muted-foreground text-xs font-medium">
          Decorators
          {(activeFile.decorators?.length ?? 0) > 0 && (
            <span className="text-muted-foreground ml-1">
              ({activeFile.decorators?.length ?? 0})
            </span>
          )}
        </span>
        {showDecorators ? (
          <ChevronUp className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="text-muted-foreground ml-auto h-3.5 w-3.5" />
        )}
      </button>
      {showDecorators && (
        <div className="shrink-0">
          <DecoratorsPanel
            decorators={activeFile.decorators}
            onAdd={handleAddDecorator}
            onRemove={handleRemoveDecorator}
          />
        </div>
      )}

      <Separator />

      {/* ── Export ────────────────────────────────────────────────────────── */}
      <div className="shrink-0">
        <ExportPanel storyFile={activeFile} managerState={managerState} />
      </div>

      {/* ── Reset confirmation ─────────────────────────────────────────────── */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset story file?</DialogTitle>
            <DialogDescription>
              Reset <strong>{activeFile.componentName}</strong> to a blank state. This can be undone
              with Undo.
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
                setSelectedVariantId(null);
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
