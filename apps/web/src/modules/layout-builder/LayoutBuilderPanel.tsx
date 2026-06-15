import { useCallback } from "react";
import { Layers } from "lucide-react";
import { removeNode, updateNodeClasses } from "@ai-builder/serializers";
import { Separator } from "@/components/ui/separator";
import { useLayoutState } from "./hooks/useLayoutState";
import { useSelectedNode } from "./hooks/useSelectedNode";
import { useLayoutTools } from "./hooks/useLayoutTools";
import { ComponentTree } from "./ComponentTree";
import { ClassEditor } from "./ClassEditor";
import { ExportPanel } from "./ExportPanel";
import { useRegisterToolDispatch } from "@/context/toolDispatch";
import type { LayoutNode } from "@ai-builder/schemas";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

function countNodes(node: LayoutNode): number {
  if ("children" in node && node.children) {
    return 1 + node.children.reduce((acc, child) => acc + countNodes(child), 0);
  }
  return 1;
}

function countContainers(node: LayoutNode): number {
  if ("children" in node) {
    return 1 + (node.children ?? []).reduce((acc, child) => acc + countContainers(child), 0);
  }
  return 0;
}

export function LayoutBuilderPanel() {
  const { layoutTree, setLayoutTree } = useLayoutState();
  const { selectedNode, setSelectedNode } = useSelectedNode();
  const tools = useLayoutTools(layoutTree, setLayoutTree);

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

  function handleDelete(nodeId: string) {
    setLayoutTree((prev) => removeNode(prev, nodeId));
    if (selectedNode?.id === nodeId) setSelectedNode(null);
  }

  function handleClassUpdate(classes: string[]) {
    if (!selectedNode) return;
    setLayoutTree((prev) => updateNodeClasses(prev, selectedNode.id, classes, "replace"));
    setSelectedNode((prev) => (prev ? { ...prev, classes } : prev));
  }

  const totalNodes = countNodes(layoutTree.root);
  const containerCount = countContainers(layoutTree.root);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layers className="text-muted-foreground h-4 w-4" />
        <div>
          <h2 className="text-sm font-semibold">Layout Tree</h2>
          <p className="text-muted-foreground text-xs">
            {totalNodes} node{totalNodes !== 1 ? "s" : ""} · {containerCount} container
            {containerCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Separator />

      {/* Component tree */}
      <div className="flex-1 overflow-hidden">
        <ComponentTree
          tree={layoutTree}
          selectedNode={selectedNode}
          onSelect={setSelectedNode}
          onDelete={handleDelete}
        />
      </div>

      <Separator />

      {/* Class editor — only shown when a node is selected */}
      {selectedNode !== null && (
        <>
          <div className="shrink-0 space-y-1">
            <p className="text-muted-foreground text-xs font-medium">
              Selected:{" "}
              <span className="text-foreground font-mono">
                {selectedNode.tag}#{selectedNode.id}
              </span>
            </p>
            <ClassEditor node={selectedNode} onUpdate={handleClassUpdate} />
          </div>
          <Separator />
        </>
      )}

      {/* Export */}
      <div className="shrink-0">
        <ExportPanel tree={layoutTree} />
      </div>
    </div>
  );
}
