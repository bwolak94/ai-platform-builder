import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateStoriesCode, serializeStoriesDSL } from "@ai-builder/serializers";
import type { StoryFile } from "@ai-builder/schemas";

interface ExportPanelProps {
  storyFile: StoryFile;
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

export function ExportPanel({ storyFile }: ExportPanelProps) {
  const filename = storyFile.componentName + ".stories.tsx";

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Export as:</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generateStoriesCode(storyFile), filename, "text/plain");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> .stories.tsx
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(
              serializeStoriesDSL(storyFile),
              storyFile.componentName + ".story.dsl",
              "text/plain"
            );
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> DSL
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(
              JSON.stringify(storyFile, null, 2),
              storyFile.componentName + ".story.json",
              "application/json"
            );
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> JSON
        </Button>
      </div>
    </div>
  );
}
