import { useState } from "react";
import { Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generatePlaywrightSpec,
  serializeE2eDSL,
  generatePageObject,
} from "@ai-builder/serializers";
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function handleCopy(key: string, content: string) {
    void navigator.clipboard.writeText(content).then(() => {
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey(null);
      }, 1500);
    });
  }

  const specContent = generatePlaywrightSpec(testFile);

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Export as:</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(specContent, testFile.filename, "text/plain");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> .spec.ts
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            handleCopy("spec", specContent);
          }}
          title="Copy spec.ts to clipboard"
        >
          {copiedKey === "spec" ? (
            <Check className="mr-1.5 h-3.5 w-3.5 text-green-600" />
          ) : (
            <Copy className="mr-1.5 h-3.5 w-3.5" />
          )}
          Copy
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const pom = generatePageObject(testFile);
            downloadFile(pom, testFile.filename.replace(".spec.ts", ".page.ts"), "text/plain");
          }}
          title="Download Page Object Model"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Page Object
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
