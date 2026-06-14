import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePlaywrightSpec, serializeE2eDSL } from "@ai-builder/serializers";
import type { TestFile } from "@ai-builder/schemas";

interface ExportPanelProps {
  testFile: TestFile;
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

export function ExportPanel({ testFile }: ExportPanelProps) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Export as:</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generatePlaywrightSpec(testFile), testFile.filename, "text/plain");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> .spec.ts
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(
              serializeE2eDSL(testFile),
              testFile.filename.replace(".spec.ts", ".e2e.dsl"),
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
              JSON.stringify(testFile, null, 2),
              testFile.filename.replace(".spec.ts", ".e2e.json"),
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
