import { useState, useCallback, useRef, useEffect } from "react";
import { Layers } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TreeNode } from "./TreeNode";
import type { LayoutTree, LayoutNode } from "@ai-builder/schemas";

interface ComponentTreeProps {
  tree: LayoutTree;
  selectedNode: LayoutNode | null;
  onSelect: (node: LayoutNode) => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
}

function isContainerNode(
  node: LayoutNode
): node is Extract<LayoutNode, { children: LayoutNode[] | null }> {
  return "children" in node;
}

// Flat ordered list of visible nodes for keyboard navigation
function flattenVisible(
  node: LayoutNode,
  expandedIds: Set<string>,
  depth: number,
  result: { node: LayoutNode; depth: number }[] = []
): { node: LayoutNode; depth: number }[] {
  result.push({ node, depth });
  if (isContainerNode(node) && expandedIds.has(node.id) && node.children) {
    for (const child of node.children) {
      flattenVisible(child, expandedIds, depth + 1, result);
    }
  }
  return result;
}

interface TreeItemsProps {
  node: LayoutNode;
  depth: number;
  selectedNodeId: string | null;
  expandedIds: Set<string>;
  onSelect: (node: LayoutNode) => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onToggleExpand: (nodeId: string) => void;
  nodeRefs: React.RefObject<Map<string, HTMLElement>>;
}

function TreeItems({
  node,
  depth,
  selectedNodeId,
  expandedIds,
  onSelect,
  onDelete,
  onDuplicate,
  onToggleExpand,
  nodeRefs,
}: TreeItemsProps) {
  const hasChildren = isContainerNode(node) && (node.children?.length ?? 0) > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <>
      <div
        ref={(el) => {
          if (el) nodeRefs.current.set(node.id, el);
          else nodeRefs.current.delete(node.id);
        }}
      >
        <TreeNode
          node={node}
          depth={depth}
          isSelected={selectedNodeId === node.id}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          onSelect={onSelect}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onToggleExpand={onToggleExpand}
        />
      </div>
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
            onDuplicate={onDuplicate}
            onToggleExpand={onToggleExpand}
            nodeRefs={nodeRefs}
          />
        ))}
    </>
  );
}

export function ComponentTree({
  tree,
  selectedNode,
  onSelect,
  onDelete,
  onDuplicate,
}: ComponentTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(["root"]));
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  // Scroll selected node into view whenever selection changes
  useEffect(() => {
    if (!selectedNode) return;
    nodeRefs.current.get(selectedNode.id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedNode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const flat = flattenVisible(tree.root, expandedIds, 0);
      const currentIdx = flat.findIndex((f) => f.node.id === selectedNode?.id);
      const currentDepth = flat[currentIdx]?.depth ?? 0;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = flat[currentIdx + 1];
          if (next) onSelect(next.node);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = flat[currentIdx - 1];
          if (prev) onSelect(prev.node);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (
            !selectedNode ||
            !isContainerNode(selectedNode) ||
            !(selectedNode.children?.length ?? 0)
          )
            break;
          if (!expandedIds.has(selectedNode.id)) {
            handleToggleExpand(selectedNode.id);
          } else {
            const firstChild = selectedNode.children?.[0];
            if (firstChild) onSelect(firstChild);
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (selectedNode && expandedIds.has(selectedNode.id) && isContainerNode(selectedNode)) {
            handleToggleExpand(selectedNode.id);
          } else {
            const parent = flat
              .slice(0, currentIdx)
              .reverse()
              .find((f) => f.depth < currentDepth);
            if (parent) onSelect(parent.node);
          }
          break;
        }
        case "Delete": {
          if (selectedNode && selectedNode.id !== "root") {
            e.preventDefault();
            onDelete(selectedNode.id);
          }
          break;
        }
      }
    },
    [tree, expandedIds, selectedNode, onSelect, onDelete, handleToggleExpand]
  );

  const isEmpty = !isContainerNode(tree.root) || (tree.root.children?.length ?? 0) === 0;

  return (
    <ScrollArea className="flex-1">
      <div
        role="tree"
        aria-label="Layout component tree"
        className="py-1 outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <TreeItems
          node={tree.root}
          depth={0}
          selectedNodeId={selectedNode?.id ?? null}
          expandedIds={expandedIds}
          onSelect={onSelect}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onToggleExpand={handleToggleExpand}
          nodeRefs={nodeRefs}
        />

        {isEmpty && (
          <div className="text-muted-foreground flex flex-col items-center gap-1 px-4 py-6 text-center">
            <Layers className="h-6 w-6 opacity-40" />
            <p className="text-xs">No components yet</p>
            <p className="text-[11px] opacity-70">Ask the AI to add components</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
