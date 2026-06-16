import { ChevronRight, ChevronDown, Trash2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import type { LayoutNode } from "@ai-builder/schemas";

interface TreeNodeProps {
  node: LayoutNode;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onSelect: (node: LayoutNode) => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onToggleExpand: (nodeId: string) => void;
}

// Hoisted outside component — never changes
const TAG_COLORS: Record<string, string> = {
  div: "bg-slate-100 text-slate-700",
  section: "bg-blue-100 text-blue-700",
  header: "bg-purple-100 text-purple-700",
  footer: "bg-purple-100 text-purple-700",
  nav: "bg-orange-100 text-orange-700",
  main: "bg-green-100 text-green-700",
  article: "bg-teal-100 text-teal-700",
  aside: "bg-yellow-100 text-yellow-700",
  h1: "bg-red-100 text-red-700",
  h2: "bg-red-100 text-red-700",
  h3: "bg-red-100 text-red-700",
  h4: "bg-red-100 text-red-700",
  p: "bg-gray-100 text-gray-700",
  span: "bg-gray-100 text-gray-700",
  button: "bg-indigo-100 text-indigo-700",
  img: "bg-pink-100 text-pink-700",
};

function getTagColor(tag: string): string {
  return TAG_COLORS[tag] ?? "bg-gray-100 text-gray-700";
}

function getNodeLabel(node: LayoutNode): string {
  if ("label" in node && node.label) return node.label;
  if ("content" in node) return node.content;
  if ("alt" in node) return node.alt;
  return node.tag;
}

export function TreeNode({
  node,
  depth,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onDelete,
  onDuplicate,
  onToggleExpand,
}: TreeNodeProps) {
  const label = getNodeLabel(node);
  const previewClasses = (node.classes ?? []).slice(0, 3);
  const remainingCount = (node.classes ?? []).length - previewClasses.length;
  const isRoot = node.id === "root";

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1 text-sm",
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
      )}
      style={{ paddingLeft: String((depth + 1) * 12) + "px" }}
      onClick={() => {
        onSelect(node);
      }}
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={hasChildren ? isExpanded : undefined}
    >
      {/* Expand toggle */}
      <button
        className="text-muted-foreground flex h-4 w-4 shrink-0 items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) onToggleExpand(node.id);
        }}
        aria-label={isExpanded ? "Collapse" : "Expand"}
        tabIndex={-1}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )
        ) : null}
      </button>

      {/* Tag badge */}
      <span
        className={cn(
          "shrink-0 rounded px-1 py-0.5 font-mono text-[10px] font-medium",
          getTagColor(node.tag)
        )}
      >
        {node.tag}
      </span>

      {/* Label */}
      <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs" title={label}>
        {label}
      </span>

      {/* Class previews — hidden until hover */}
      <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
        {previewClasses.map((cls) => (
          <Badge key={cls} variant="secondary" className="h-4 px-1 text-[10px]">
            {cls}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <span className="text-muted-foreground text-[10px]">+{remainingCount}</span>
        )}
      </div>

      {/* Action buttons — show on hover or when selected */}
      {!isRoot && (
        <div
          className={cn(
            "ml-1 hidden shrink-0 items-center gap-0.5 group-hover:flex",
            isSelected && "flex"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(node.id);
            }}
            aria-label={`Duplicate ${node.tag} node`}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            aria-label={`Delete ${node.tag} node`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
