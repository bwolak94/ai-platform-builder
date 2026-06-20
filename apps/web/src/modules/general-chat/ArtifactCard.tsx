import { useState } from "react";
import { Copy, Check } from "lucide-react";
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

// ─── Badge colours by type ────────────────────────────────────────────────────

const TYPE_BADGE: Record<ArtifactType, string> = {
  code: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  mermaid: "bg-purple-500/10 text-purple-400",
  diff: "bg-orange-500/10 text-orange-400",
  data: "bg-blue-500/10 text-blue-400",
  text: "bg-muted text-muted-foreground",
  palette: "bg-pink-500/10 text-pink-500",
};

const TYPE_LABEL: Record<ArtifactType, string> = {
  code: "Code",
  mermaid: "Diagram",
  diff: "Diff",
  data: "Data",
  text: "Text",
  palette: "Palette",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ArtifactCardProps {
  artifact: Artifact;
}

export function ArtifactCard({ artifact }: ArtifactCardProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(artifact.content).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    });
  }

  const ts = new Date(artifact.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="overflow-hidden rounded-md border text-xs">
      {/* Header */}
      <div className="bg-muted/30 flex items-center gap-2 border-b px-3 py-1.5">
        <Badge
          variant="secondary"
          className={cn("px-1.5 py-0 text-[10px]", TYPE_BADGE[artifact.type])}
        >
          {TYPE_LABEL[artifact.type]}
        </Badge>
        <span className="text-foreground flex-1 truncate font-medium">{artifact.title}</span>
        <span className="text-muted-foreground shrink-0 text-[10px]">{ts}</span>
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

      {/* Body */}
      {artifact.type === "mermaid" ? (
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
      ) : (
        <pre className="text-foreground max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 font-mono leading-relaxed">
          {artifact.content}
        </pre>
      )}
    </div>
  );
}
