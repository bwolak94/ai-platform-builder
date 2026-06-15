import { useCallback } from "react";
import { Network } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useApiState } from "./hooks/useApiState";
import { useApiTools } from "./hooks/useApiTools";
import { EndpointList } from "./EndpointList";
import { ExportPanel } from "./ExportPanel";
import { useRegisterToolDispatch } from "@/context/toolDispatch";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

export function ApiSchemaBuilderPanel() {
  const { spec, setSpec } = useApiState();
  const tools = useApiTools(spec, setSpec);

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

  function handleDeleteEndpoint(id: string) {
    setSpec((prev) => ({ ...prev, endpoints: prev.endpoints.filter((e) => e.id !== id) }));
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Network className="text-muted-foreground h-4 w-4" />
        <div>
          <h2 className="text-sm font-semibold">
            {spec.title} v{spec.version}
          </h2>
          <p className="text-muted-foreground text-xs">
            {spec.endpoints.length} endpoint{spec.endpoints.length !== 1 ? "s" : ""}
            {spec.securityScheme ? " · " + spec.securityScheme : ""}
          </p>
        </div>
      </div>

      <Separator />

      <div className="flex-1 overflow-hidden">
        <EndpointList endpoints={spec.endpoints} onDelete={handleDeleteEndpoint} />
      </div>

      <Separator />

      <div className="shrink-0">
        <ExportPanel spec={spec} />
      </div>
    </div>
  );
}
