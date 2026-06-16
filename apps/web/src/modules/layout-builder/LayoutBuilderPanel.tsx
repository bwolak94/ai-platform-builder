import { useCallback, useMemo, useState } from "react";
import { Layers, Undo2, Redo2, RotateCcw, CheckCircle2 } from "lucide-react";
import { removeNode, updateNodeClasses, duplicateNode } from "@ai-builder/serializers";
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
import { useLayoutBuilderContext } from "@/context/layoutBuilder/LayoutBuilderContext";
import { useSelectedNode } from "./hooks/useSelectedNode";
import { useLayoutTools } from "./hooks/useLayoutTools";
import { ComponentTree } from "./ComponentTree";
import { ClassEditor } from "./ClassEditor";
import { ExportPanel } from "./ExportPanel";
import { useRegisterToolDispatch } from "@/context/toolDispatch";
import type { LayoutNode } from "@ai-builder/schemas";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

function countStats(node: LayoutNode): { nodes: number; containers: number } {
  if (!("children" in node)) return { nodes: 1, containers: 0 };
  const children = node.children ?? [];
  const childStats = children.reduce(
    (acc, child) => {
      const s = countStats(child);
      return { nodes: acc.nodes + s.nodes, containers: acc.containers + s.containers };
    },
    { nodes: 0, containers: 0 }
  );
  return { nodes: 1 + childStats.nodes, containers: 1 + childStats.containers };
}

function findNodeInTree(node: LayoutNode, id: string): LayoutNode | null {
  if (node.id === id) return node;
  if ("children" in node && node.children) {
    for (const child of node.children) {
      const found = findNodeInTree(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function LayoutBuilderPanel() {
  const { layoutTree, setLayoutTree, undo, redo, canUndo, canRedo, resetTree } =
    useLayoutBuilderContext();
  const { selectedNode, setSelectedNode } = useSelectedNode();
  const tools = useLayoutTools(layoutTree, setLayoutTree);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [themeToast, setThemeToast] = useState(false);

  const handleToolCall = useCallback(
    async (call: ToolCall): Promise<ToolResult> => {
      const toolName = call.toolName as keyof typeof tools;
      const handler = tools[toolName];
      if (typeof handler === "function") {
        const result = await (handler as (args: unknown) => Promise<ToolResult>)(call.args);
        if (call.toolName === "applyTheme") {
          setThemeToast(true);
          setTimeout(() => {
            setThemeToast(false);
          }, 2500);
        }
        return result;
      }
      return Promise.resolve({ error: `Unknown tool: ${call.toolName}` });
    },
    [tools]
  );

  useRegisterToolDispatch(handleToolCall);

  const stats = useMemo(() => countStats(layoutTree.root), [layoutTree]);

  function requestDelete(nodeId: string) {
    const node = findNodeInTree(layoutTree.root, nodeId);
    if (node && "children" in node && (node.children?.length ?? 0) > 0) {
      setPendingDeleteId(nodeId);
    } else {
      performDelete(nodeId);
    }
  }

  function performDelete(nodeId: string) {
    setLayoutTree((prev) => removeNode(prev, nodeId));
    if (selectedNode?.id === nodeId) setSelectedNode(null);
    setPendingDeleteId(null);
  }

  function handleDuplicate(nodeId: string) {
    setLayoutTree((prev) => duplicateNode(prev, nodeId));
  }

  function handleClassUpdate(classes: string[]) {
    if (!selectedNode) return;
    setLayoutTree((prev) => updateNodeClasses(prev, selectedNode.id, classes, "replace"));
    setSelectedNode((prev) => (prev ? { ...prev, classes } : prev));
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layers className="text-muted-foreground h-4 w-4" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Layout Tree</h2>
          <p className="text-muted-foreground text-xs">
            {stats.nodes} node{stats.nodes !== 1 ? "s" : ""} · {stats.containers} container
            {stats.containers !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Undo / Redo / Reset toolbar */}
        <div className="flex items-center gap-0.5">
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
            onClick={resetTree}
            title="Reset to empty"
            aria-label="Reset tree"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Theme applied toast */}
      {themeToast && (
        <div className="bg-muted text-muted-foreground flex items-center gap-1.5 rounded-md px-3 py-2 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          Theme applied successfully
        </div>
      )}

      <Separator />

      {/* Component tree */}
      <div className="flex-1 overflow-hidden">
        <ComponentTree
          tree={layoutTree}
          selectedNode={selectedNode}
          onSelect={setSelectedNode}
          onDelete={requestDelete}
          onDuplicate={handleDuplicate}
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

      {/* Delete confirmation dialog */}
      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={() => {
          setPendingDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete component?</DialogTitle>
            <DialogDescription>
              This component has children. Deleting it will also remove all nested components.
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
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDeleteId) performDelete(pendingDeleteId);
              }}
            >
              Delete all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
