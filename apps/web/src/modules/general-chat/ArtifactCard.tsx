import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

// ─── Badge colours by type ────────────────────────────────────────────────────

const TYPE_BADGE: Record<ArtifactType, string> = {
  code: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  mermaid: "bg-purple-500/10 text-purple-400",
  diff: "bg-orange-500/10 text-orange-400",
  data: "bg-blue-500/10 text-blue-400",
  text: "bg-muted text-muted-foreground",
};

const TYPE_LABEL: Record<ArtifactType, string> = {
  code: "Code",
  mermaid: "Diagram",
  diff: "Diff",
  data: "Data",
  text: "Text",
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
      {artifact.type === "diff" ? (
        <div className="max-h-64 overflow-auto py-1">
          {artifact.content.split("\n").map((line, i) => (
            <DiffLine key={i} line={line} />
          ))}
        </div>
      ) : (
        <pre className="text-foreground max-h-64 overflow-auto whitespace-pre-wrap break-words p-3 font-mono leading-relaxed">
          {artifact.content}
        </pre>
      )}
    </div>
  );
}
