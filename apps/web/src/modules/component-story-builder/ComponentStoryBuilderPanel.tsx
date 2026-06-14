import { useCallback } from "react";
import { BookOpen } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useStoryState } from "./hooks/useStoryState";
import { useStoryTools } from "./hooks/useStoryTools";
import { VariantList } from "./VariantList";
import { ExportPanel } from "./ExportPanel";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

interface ComponentStoryBuilderPanelProps {
  onToolCall?: (call: ToolCall) => Promise<ToolResult>;
}

export function ComponentStoryBuilderPanel({
  onToolCall: _onToolCall,
}: ComponentStoryBuilderPanelProps) {
  const { storyFile, setStoryFile } = useStoryState();
  const tools = useStoryTools(storyFile, setStoryFile);

  const handleToolCall = useCallback(
    async (call: ToolCall): Promise<ToolResult> => {
      const toolName = call.toolName as keyof typeof tools;
      const handler = tools[toolName];
      if (typeof handler === "function") {
        return (handler as (args: unknown) => Promise<ToolResult>)(call.args);
      }
      return Promise.resolve({ error: "Unknown tool: " + call.toolName });
    },
    [tools]
  );

  void handleToolCall;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <BookOpen className="text-muted-foreground h-4 w-4" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold">{storyFile.componentName}</h2>
          <p className="text-muted-foreground text-xs">
            {storyFile.variants.length} variant{storyFile.variants.length !== 1 ? "s" : ""} ·{" "}
            {storyFile.title}
          </p>
        </div>
      </div>

      <div className="bg-muted/40 rounded-md border px-3 py-2">
        <p className="text-muted-foreground text-[10px]">Path</p>
        <p className="truncate font-mono text-xs">{storyFile.componentPath}</p>
      </div>

      <Separator />

      <div className="flex-1 overflow-hidden">
        <VariantList
          variants={storyFile.variants}
          onDelete={(id) => {
            setStoryFile((prev) => ({
              ...prev,
              variants: prev.variants.filter((v) => v.id !== id),
            }));
          }}
        />
      </div>

      <Separator />

      <div className="shrink-0">
        <ExportPanel storyFile={storyFile} />
      </div>
    </div>
  );
}
