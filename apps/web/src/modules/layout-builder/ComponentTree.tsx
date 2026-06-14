import { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TreeNode } from "./TreeNode";
import type { LayoutTree, LayoutNode } from "@ai-builder/schemas";

interface ComponentTreeProps {
  tree: LayoutTree;
  selectedNode: LayoutNode | null;
  onSelect: (node: LayoutNode) => void;
  onDelete: (nodeId: string) => void;
}

function isContainerNode(
  node: LayoutNode
): node is Extract<LayoutNode, { children: LayoutNode[] | null }> {
  return "children" in node;
}

interface TreeItemsProps {
  node: LayoutNode;
  depth: number;
  selectedNodeId: string | null;
  expandedIds: Set<string>;
  onSelect: (node: LayoutNode) => void;
  onDelete: (nodeId: string) => void;
  onToggleExpand: (nodeId: string) => void;
}

function TreeItems({
  node,
  depth,
  selectedNodeId,
  expandedIds,
  onSelect,
  onDelete,
  onToggleExpand,
}: TreeItemsProps) {
  const hasChildren = isContainerNode(node) && (node.children?.length ?? 0) > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <>
      <TreeNode
        node={node}
        depth={depth}
        isSelected={selectedNodeId === node.id}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        onSelect={onSelect}
        onDelete={onDelete}
        onToggleExpand={onToggleExpand}
      />
      {hasChildren &&
        isExpanded &&
        isContainerNode(node) &&
        (node.children ?? []).map((child) => (
          <TreeItems
            key={child.id}
            node={child}
            depth={depth + 1}
            selectedNodeId={selectedNodeId}
            expandedIds={expandedIds}
            onSelect={onSelect}
            onDelete={onDelete}
            onToggleExpand={onToggleExpand}
          />
        ))}
    </>
  );
}

export function ComponentTree({ tree, selectedNode, onSelect, onDelete }: ComponentTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(["root"]));

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  return (
    <ScrollArea className="flex-1">
      <div role="tree" aria-label="Layout component tree" className="py-1">
        <TreeItems
          node={tree.root}
          depth={0}
          selectedNodeId={selectedNode?.id ?? null}
          expandedIds={expandedIds}
          onSelect={onSelect}
          onDelete={onDelete}
          onToggleExpand={handleToggleExpand}
        />
      </div>
    </ScrollArea>
  );
}
