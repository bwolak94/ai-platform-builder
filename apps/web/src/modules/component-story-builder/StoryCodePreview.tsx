import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { generateStoriesCode } from "@ai-builder/serializers";
import type { StoryFile } from "@ai-builder/schemas";

interface StoryCodePreviewProps {
  storyFile: StoryFile;
}

// Simple keyword-based syntax highlighter that returns HTML spans
function highlight(code: string): string {
  return (
    code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // string literals
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span style="color:#a5d6ff">$1</span>')
      // keywords
      .replace(
        /\b(import|export|const|type|from|default)\b/g,
        '<span style="color:#ff7b72">$1</span>'
      )
      // types
      .replace(/\b(Meta|Story|StoryObj)\b/g, '<span style="color:#ffa657">$1</span>')
      // comments
      .replace(/(\/\/[^\n]*)/g, '<span style="color:#8b949e;font-style:italic">$1</span>')
  );
}

export function StoryCodePreview({ storyFile }: StoryCodePreviewProps) {
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => generateStoriesCode(storyFile), [storyFile]);
  const highlighted = useMemo(() => highlight(code), [code]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1800);
    });
  };

  if (storyFile.variants.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Add variants to see the generated story code.
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-auto rounded-md bg-zinc-950">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 z-10 rounded-md bg-zinc-800 p-1.5 text-zinc-400 opacity-80 transition-all hover:opacity-100"
        title={copied ? "Copied!" : "Copy code"}
        aria-label={copied ? "Copied" : "Copy code"}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>

      <pre
        className="p-4 font-mono text-xs leading-relaxed text-zinc-100"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled internal highlight output
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}
