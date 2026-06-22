import { useState, useRef } from "react";
import { Copy, Check, Pin, PinOff, Download, Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { cn } from "@/utils";
import type { Artifact, ArtifactType } from "@/context/generalChat/GeneralChatContext";

// ─── Diff renderer ────────────────────────────────────────────────────────────

function DiffLine({ line }: { line: string }) {
  const added = line.startsWith("+ ");
  const removed = line.startsWith("- ");
  return (
    <div
      className={cn(
        "px-2 font-mono text-xs",
        added && "bg-green-500/10 text-green-600 dark:text-green-400",
        removed && "bg-red-500/10 text-red-600 dark:text-red-400",
        !added && !removed && "text-muted-foreground"
      )}
    >
      {line}
    </div>
  );
}

// ─── Palette renderer ─────────────────────────────────────────────────────────

interface PaletteEntry {
  name?: string;
  hex: string;
  oklch?: string;
  contrastOnWhite?: number;
  contrastOnBlack?: number;
}

function PaletteRenderer({ content }: { content: string }) {
  let palette: PaletteEntry[] = [];
  try {
    const parsed: unknown = JSON.parse(content);
    if (Array.isArray(parsed)) {
      palette = parsed as PaletteEntry[];
    }
  } catch {
    return <pre className="p-3 font-mono text-xs">{content}</pre>;
  }

  return (
    <div className="flex flex-wrap gap-2 p-3">
      {palette.map((entry, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div
            className="h-10 w-10 rounded-md border border-black/10 shadow-sm dark:border-white/10"
            style={{ backgroundColor: entry.hex }}
            title={entry.hex}
          />
          <span className="text-foreground font-mono text-[10px]">{entry.hex}</span>
          {entry.name && (
            <span className="text-muted-foreground max-w-[48px] truncate text-center text-[9px]">
              {entry.name}
            </span>
          )}
          {entry.contrastOnWhite !== undefined && (
            <span
              className={cn(
                "font-mono text-[9px]",
                entry.contrastOnWhite >= 4.5
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400"
              )}
            >
              {entry.contrastOnWhite.toFixed(1)}:1
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Table renderer ───────────────────────────────────────────────────────────

interface TableData {
  headers: string[];
  rows: string[][];
}

function TableRenderer({ content }: { content: string }) {
  let data: TableData = { headers: [], rows: [] };
  try {
    const parsed: unknown = JSON.parse(content);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray((parsed as TableData).headers) &&
      Array.isArray((parsed as TableData).rows)
    ) {
      data = parsed as TableData;
    }
  } catch {
    return <pre className="p-3 font-mono text-xs">{content}</pre>;
  }

  if (data.headers.length === 0) {
    return <pre className="p-3 font-mono text-xs">{content}</pre>;
  }

  return (
    <div className="max-h-64 overflow-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {data.headers.map((h, i) => (
              <th
                key={i}
                className="border-border bg-muted/50 border px-2 py-1 text-left font-medium"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-muted/30">
              {row.map((cell, ci) => (
                <td key={ci} className="border-border border px-2 py-1">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Badge colours by type ────────────────────────────────────────────────────

const TYPE_BADGE: Record<ArtifactType, string> = {
  code: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  mermaid: "bg-purple-500/10 text-purple-400",
  diff: "bg-orange-500/10 text-orange-400",
  data: "bg-blue-500/10 text-blue-400",
  text: "bg-muted text-muted-foreground",
  palette: "bg-pink-500/10 text-pink-500",
  table: "bg-teal-500/10 text-teal-500",
};

const TYPE_LABEL: Record<ArtifactType, string> = {
  code: "Code",
  mermaid: "Diagram",
  diff: "Diff",
  data: "Data",
  text: "Text",
  palette: "Palette",
  table: "Table",
};

const EDITABLE_TYPES = new Set<ArtifactType>(["code", "text", "data"]);

function getDownloadExtension(artifact: Artifact): string {
  if (artifact.type === "mermaid") return "mmd";
  if (artifact.type === "diff") return "diff";
  if (artifact.type === "data" || artifact.type === "palette" || artifact.type === "table")
    return "json";
  if (artifact.type === "code" && artifact.language) {
    const langMap: Record<string, string> = {
      typescript: "ts",
      javascript: "js",
      python: "py",
      sql: "sql",
      html: "html",
      css: "css",
      json: "json",
      yaml: "yml",
      bash: "sh",
      shell: "sh",
    };
    return langMap[artifact.language.toLowerCase()] ?? "txt";
  }
  return "txt";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ArtifactCardProps {
  artifact: Artifact;
  isPinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  onUpdate?: (content: string) => void;
}

export function ArtifactCard({ artifact, isPinned, onPin, onUnpin, onUpdate }: ArtifactCardProps) {
  const isEditable = EDITABLE_TYPES.has(artifact.type);

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(artifact.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleCopy() {
    void navigator.clipboard.writeText(artifact.content).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    });
  }

  function handleDownload() {
    const ext = getDownloadExtension(artifact);
    const slug = artifact.title.replace(/\s+/g, "-").toLowerCase();
    const blob = new Blob([artifact.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleEditStart() {
    setEditValue(artifact.content);
    setIsEditing(true);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  function handleEditSave() {
    onUpdate?.(editValue);
    setIsEditing(false);
  }

  function handleEditCancel() {
    setEditValue(artifact.content);
    setIsEditing(false);
  }

  const ts = new Date(artifact.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border text-xs",
        isPinned && "ring-primary/40 ring-1"
      )}
    >
      {/* Header */}
      <div className="bg-muted/30 flex items-center gap-1.5 border-b px-3 py-1.5">
        <Badge
          variant="secondary"
          className={cn("shrink-0 px-1.5 py-0 text-[10px]", TYPE_BADGE[artifact.type])}
        >
          {TYPE_LABEL[artifact.type]}
        </Badge>
        <span className="text-foreground min-w-0 flex-1 truncate font-medium">
          {artifact.title}
        </span>
        <span className="text-muted-foreground shrink-0 text-[10px]">{ts}</span>

        {/* Edit — only for editable types */}
        {isEditable && !isEditing && onUpdate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={handleEditStart}
            aria-label="Edit artifact content"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}

        {/* Download */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={handleDownload}
          aria-label="Download artifact"
        >
          <Download className="h-3 w-3" />
        </Button>

        {/* Pin / Unpin */}
        {(onPin ?? onUnpin) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={() => (isPinned ? onUnpin?.() : onPin?.())}
            aria-label={isPinned ? "Unpin artifact" : "Pin artifact"}
          >
            {isPinned ? <PinOff className="text-primary h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </Button>
        )}

        {/* Copy */}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={handleCopy}
          aria-label="Copy artifact content"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>

      {/* Edit mode */}
      {isEditing ? (
        <div className="flex flex-col gap-2 p-3">
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
            }}
            className={cn(
              "min-h-[120px] w-full resize-y rounded-md border bg-transparent p-2 font-mono text-xs",
              "focus:ring-ring focus:outline-none focus:ring-1"
            )}
          />
          <div className="flex justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px]"
              onClick={handleEditCancel}
            >
              <X className="mr-1 h-3 w-3" />
              Cancel
            </Button>
            <Button size="sm" className="h-6 text-[10px]" onClick={handleEditSave}>
              <Check className="mr-1 h-3 w-3" />
              Save
            </Button>
          </div>
        </div>
      ) : artifact.type === "mermaid" ? (
        <div className="overflow-auto p-3">
          <MermaidDiagram chart={artifact.content} />
        </div>
      ) : artifact.type === "diff" ? (
        <div className="max-h-64 overflow-auto py-1">
          {artifact.content.split("\n").map((line, i) => (
            <DiffLine key={i} line={line} />
          ))}
        </div>
      ) : artifact.type === "palette" ? (
        <div className="max-h-48 overflow-auto">
          <PaletteRenderer content={artifact.content} />
        </div>
      ) : artifact.type === "table" ? (
        <TableRenderer content={artifact.content} />
      ) : (
        <pre className="text-foreground max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 font-mono leading-relaxed">
          {artifact.content}
        </pre>
      )}
    </div>
  );
}
