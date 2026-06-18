import { useState } from "react";
import { Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateStoriesCode, serializeStoriesDSL } from "@ai-builder/serializers";
import type { StoryFile, StoryManagerState } from "@ai-builder/schemas";

interface ExportPanelProps {
  storyFile: StoryFile;
  managerState?: StoryManagerState;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadZip(files: { name: string; content: string }[]) {
  // Simple multi-file download: trigger one download per file
  for (const file of files) {
    downloadFile(file.content, file.name, "text/plain");
  }
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(getText()).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1800);
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy to clipboard"}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

export function ExportPanel({ storyFile, managerState }: ExportPanelProps) {
  const filename = storyFile.componentName + ".stories.tsx";
  const hasMultipleFiles = managerState && managerState.files.length > 1;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Export:</p>

      {/* Active file exports */}
      <div className="flex flex-wrap gap-1.5">
        {/* .stories.tsx */}
        <div className="flex items-center gap-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-r-none border-r-0 px-2 text-[11px]"
            onClick={() => {
              downloadFile(generateStoriesCode(storyFile), filename, "text/plain");
            }}
          >
            <Download className="mr-1 h-3 w-3" />
            .stories.tsx
          </Button>
          <CopyButton getText={() => generateStoriesCode(storyFile)} />
        </div>

        {/* DSL */}
        <div className="flex items-center gap-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-r-none border-r-0 px-2 text-[11px]"
            onClick={() => {
              downloadFile(
                serializeStoriesDSL(storyFile),
                storyFile.componentName + ".story.dsl",
                "text/plain"
              );
            }}
          >
            <Download className="mr-1 h-3 w-3" />
            DSL
          </Button>
          <CopyButton getText={() => serializeStoriesDSL(storyFile)} />
        </div>

        {/* JSON */}
        <div className="flex items-center gap-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-r-none border-r-0 px-2 text-[11px]"
            onClick={() => {
              downloadFile(
                JSON.stringify(storyFile, null, 2),
                storyFile.componentName + ".story.json",
                "application/json"
              );
            }}
          >
            <Download className="mr-1 h-3 w-3" />
            JSON
          </Button>
          <CopyButton getText={() => JSON.stringify(storyFile, null, 2)} />
        </div>
      </div>

      {/* Export all files (multi-file mode) */}
      {hasMultipleFiles && (
        <Button
          variant="secondary"
          size="sm"
          className="h-7 w-full text-[11px]"
          onClick={() => {
            downloadZip(
              managerState.files.map((f) => ({
                name: f.componentName + ".stories.tsx",
                content: generateStoriesCode(f),
              }))
            );
          }}
        >
          <Download className="mr-1.5 h-3 w-3" />
          Export all {managerState.files.length} files
        </Button>
      )}
    </div>
  );
}
