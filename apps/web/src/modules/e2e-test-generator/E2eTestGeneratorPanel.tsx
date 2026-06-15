import { useCallback } from "react";
import { TestTube2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useE2eState } from "./hooks/useE2eState";
import { useE2eTools } from "./hooks/useE2eTools";
import { TestCaseList } from "./TestCaseList";
import { ExportPanel } from "./ExportPanel";
import { useRegisterToolDispatch } from "@/context/toolDispatch";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

export function E2eTestGeneratorPanel() {
  const { testFile, setTestFile } = useE2eState();
  const tools = useE2eTools(testFile, setTestFile);

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

  const totalSteps = testFile.testCases.reduce((sum, tc) => sum + tc.steps.length, 0);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <TestTube2 className="text-muted-foreground h-4 w-4" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold">{testFile.filename}</h2>
          <p className="text-muted-foreground text-xs">
            {testFile.testCases.length} test{testFile.testCases.length !== 1 ? "s" : ""} ·{" "}
            {totalSteps} step{totalSteps !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="bg-muted/40 rounded-md border px-3 py-2">
        <p className="text-muted-foreground text-[10px]">Base URL</p>
        <p className="truncate font-mono text-xs">{testFile.baseUrl}</p>
      </div>

      <Separator />

      <div className="flex-1 overflow-hidden">
        <TestCaseList
          testCases={testFile.testCases}
          onDelete={(id) => {
            setTestFile((prev) => ({
              ...prev,
              testCases: prev.testCases.filter((tc) => tc.id !== id),
            }));
          }}
        />
      </div>

      <Separator />

      <div className="shrink-0">
        <ExportPanel testFile={testFile} />
      </div>
    </div>
  );
}
