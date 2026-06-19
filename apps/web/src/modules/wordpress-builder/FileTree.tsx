import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/utils";
import type { WordPressFile } from "@ai-builder/schemas";

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file: WordPressFile | undefined;
}

function buildTree(files: WordPressFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let nodes = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] ?? "";
      const isLast = i === parts.length - 1;
      const existing = nodes.find((n) => n.name === part);

      if (existing) {
        if (isLast) existing.file = file;
        nodes = existing.children;
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          isDir: !isLast,
          children: [],
          file: isLast ? file : undefined,
        };
        nodes.push(newNode);
        nodes = newNode.children;
      }
    }
  }

  return root;
}

function fileTypeIcon(file: WordPressFile): string {
  switch (file.type) {
    case "php":
      return "text-purple-400";
    case "css":
      return "text-blue-400";
    case "js":
      return "text-yellow-400";
    case "json":
      return "text-green-400";
    default:
      return "text-muted-foreground";
  }
}

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  activeFileId: string | null;
  onSelectFile: (file: WordPressFile) => void;
}

function TreeNodeItem({ node, depth, activeFileId, onSelectFile }: TreeNodeItemProps) {
  const [open, setOpen] = useState(depth < 2);

  if (node.isDir) {
    return (
      <div>
        <button
          type="button"
          className="hover:bg-accent flex w-full items-center gap-1 rounded-sm px-2 py-0.5 text-left text-xs"
          style={{ paddingLeft: `${String((depth + 1) * 12)}px` }}
          onClick={() => {
            setOpen((o) => !o);
          }}
        >
          {open ? (
            <>
              <ChevronDown className="text-muted-foreground h-3 w-3 shrink-0" />
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
            </>
          ) : (
            <>
              <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0" />
              <Folder className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
            </>
          )}
          <span className="text-foreground">{node.name}</span>
        </button>
        {open && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFileId={activeFileId}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = node.file ? node.file.id === activeFileId : false;

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-1.5 rounded-sm px-2 py-0.5 text-left text-xs transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "hover:bg-accent text-muted-foreground hover:text-foreground"
      )}
      style={{ paddingLeft: `${String((depth + 1) * 12)}px` }}
      onClick={() => {
        if (node.file) onSelectFile(node.file);
      }}
    >
      <File className={cn("h-3.5 w-3.5 shrink-0", node.file ? fileTypeIcon(node.file) : "")} />
      <span className="truncate font-mono">{node.name}</span>
    </button>
  );
}

interface FileTreeProps {
  files: WordPressFile[];
  activeFileId: string | null;
  projectSlug: string;
  onSelectFile: (file: WordPressFile) => void;
}

export function FileTree({ files, activeFileId, projectSlug, onSelectFile }: FileTreeProps) {
  const tree = buildTree(files);

  return (
    <div className="h-full overflow-auto">
      {/* Root folder */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
        <span className="text-foreground truncate font-mono text-xs font-medium">
          {projectSlug}/
        </span>
      </div>

      {files.length === 0 ? (
        <p className="text-muted-foreground px-4 py-3 text-xs">
          No files yet. Ask the agent to initialize a project.
        </p>
      ) : (
        <div className="pb-2">
          {tree.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              depth={0}
              activeFileId={activeFileId}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
