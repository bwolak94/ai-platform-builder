import { useCallback } from "react";
import { Languages, Undo2, Redo2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useI18nState } from "./hooks/useI18nState";
import { useI18nTools } from "./hooks/useI18nTools";
import { KeyList } from "./KeyList";
import { ExportPanel } from "./ExportPanel";
import { useRegisterToolDispatch } from "@/context/toolDispatch";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

export function I18nManagerPanel() {
  const { store, setStore, undo, redo, reset, canUndo, canRedo } = useI18nState();
  const tools = useI18nTools(store, setStore);

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

  const missingCount = store.keys.filter(
    (k) =>
      store.activeLanguages.filter((l) => l !== store.sourceLanguage && !k.translations[l]).length >
      0
  ).length;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Languages className="text-muted-foreground h-4 w-4" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold">i18n Manager</h2>
          <p className="text-muted-foreground text-xs">
            {store.keys.length} key{store.keys.length !== 1 ? "s" : ""} · source:{" "}
            {store.sourceLanguage}
          </p>
        </div>

        <div className="flex items-center gap-0.5">
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
            onClick={reset}
            title="Reset store"
            aria-label="Reset translation store to empty"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {missingCount > 0 && (
          <Badge variant="destructive" className="text-[10px]">
            {missingCount} missing
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {store.activeLanguages.map((lang) => (
          <Badge
            key={lang}
            variant={lang === store.sourceLanguage ? "default" : "outline"}
            className="text-[10px]"
          >
            {lang}
          </Badge>
        ))}
      </div>

      <Separator />

      <div className="flex-1 overflow-hidden">
        <KeyList
          keys={store.keys}
          activeLanguages={store.activeLanguages}
          sourceLanguage={store.sourceLanguage}
          onDelete={(id) => {
            setStore((prev) => ({ ...prev, keys: prev.keys.filter((k) => k.id !== id) }));
          }}
        />
      </div>

      <Separator />

      <div className="shrink-0">
        <ExportPanel store={store} />
      </div>
    </div>
  );
}
