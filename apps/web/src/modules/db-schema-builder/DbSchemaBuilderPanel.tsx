import { useCallback } from "react";
import { Database } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useDbState } from "./hooks/useDbState";
import { useDbTools } from "./hooks/useDbTools";
import { TableList } from "./TableList";
import { ExportPanel } from "./ExportPanel";
import { useRegisterToolDispatch } from "@/context/toolDispatch";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

export function DbSchemaBuilderPanel() {
  const { schema, setSchema } = useDbState();
  const tools = useDbTools(schema, setSchema);

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

  const totalColumns = schema.tables.reduce((acc, t) => acc + t.columns.length, 0);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Database className="text-muted-foreground h-4 w-4" />
        <div>
          <h2 className="text-sm font-semibold">{schema.name}</h2>
          <p className="text-muted-foreground text-xs">
            {schema.tables.length} table{schema.tables.length !== 1 ? "s" : ""} · {totalColumns}{" "}
            columns · {schema.dialect}
          </p>
        </div>
      </div>

      <Separator />

      <div className="flex-1 overflow-hidden">
        <TableList
          schema={schema}
          onDeleteTable={(name) => {
            setSchema((prev) => ({ ...prev, tables: prev.tables.filter((t) => t.name !== name) }));
          }}
        />
      </div>

      <Separator />

      <div className="shrink-0">
        <ExportPanel schema={schema} />
      </div>
    </div>
  );
}
