import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import type { WordPressFile } from "@ai-builder/schemas";

const TYPE_LABELS: Record<WordPressFile["type"], string> = {
  php: "PHP",
  css: "CSS",
  js: "JavaScript",
  txt: "Text",
  json: "JSON",
};

const TYPE_COLORS: Record<WordPressFile["type"], string> = {
  php: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  css: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  js: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  txt: "bg-muted text-muted-foreground border-border",
  json: "bg-green-500/10 text-green-400 border-green-500/20",
};

interface FileEditorProps {
  file: WordPressFile | null;
}

export function FileEditor({ file }: FileEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!file) return;
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }, [file]);

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Select a file to view its contents</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Use the file tree on the left to navigate
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-xs">{file.path}</span>
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium",
              TYPE_COLORS[file.type]
            )}
          >
            {TYPE_LABELS[file.type]}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => void handleCopy()}
          disabled={!file.content}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="min-h-0 flex-1 overflow-auto">
        {file.content ? (
          <pre className="text-foreground h-full whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed">
            {file.content}
          </pre>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-xs">
              This file is empty. Ask the agent to generate content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
