import { useCallback, useState } from "react";
import { Mail, Monitor, Smartphone, AppWindow } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useEmailState } from "./hooks/useEmailState";
import { useEmailTools } from "./hooks/useEmailTools";
import { SectionList } from "./SectionList";
import { ExportPanel } from "./ExportPanel";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

type ClientMode = "desktop" | "mobile" | "outlook";

interface EmailBuilderPanelProps {
  onToolCall?: (call: ToolCall) => Promise<ToolResult>;
  onClientModeChange?: (mode: ClientMode) => void;
}

export function EmailBuilderPanel({
  onToolCall: _onToolCall,
  onClientModeChange,
}: EmailBuilderPanelProps) {
  const { template, setTemplate } = useEmailState();
  const tools = useEmailTools(template, setTemplate);
  const [clientMode, setClientMode] = useState<ClientMode>("desktop");

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

  function switchMode(mode: ClientMode) {
    setClientMode(mode);
    onClientModeChange?.(mode);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Mail className="text-muted-foreground h-4 w-4" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold">{template.subject}</h2>
          <p className="text-muted-foreground text-xs">
            {template.sections.length} section{template.sections.length !== 1 ? "s" : ""} ·{" "}
            {template.type}
          </p>
        </div>
      </div>

      {/* Client mode switcher */}
      <div className="flex gap-1">
        <Button
          variant={clientMode === "desktop" ? "default" : "outline"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => {
            switchMode("desktop");
          }}
          aria-pressed={clientMode === "desktop"}
        >
          <Monitor className="mr-1 h-3 w-3" /> Desktop
        </Button>
        <Button
          variant={clientMode === "mobile" ? "default" : "outline"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => {
            switchMode("mobile");
          }}
          aria-pressed={clientMode === "mobile"}
        >
          <Smartphone className="mr-1 h-3 w-3" /> Mobile
        </Button>
        <Button
          variant={clientMode === "outlook" ? "default" : "outline"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => {
            switchMode("outlook");
          }}
          aria-pressed={clientMode === "outlook"}
        >
          <AppWindow className="mr-1 h-3 w-3" /> Outlook
        </Button>
      </div>

      <Separator />

      <div className="flex-1 overflow-hidden">
        <SectionList
          sections={template.sections}
          onDelete={(id) => {
            setTemplate((prev) => ({
              ...prev,
              sections: prev.sections.filter((s) => s.id !== id),
            }));
          }}
        />
      </div>

      <Separator />

      <div className="shrink-0">
        <ExportPanel template={template} />
      </div>
    </div>
  );
}
