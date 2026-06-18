import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePlaywrightConfig } from "@ai-builder/serializers";
import type { TestFile } from "@ai-builder/schemas";

interface PlaywrightConfigPanelProps {
  testFile: TestFile;
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PlaywrightConfigPanel({ testFile }: PlaywrightConfigPanelProps) {
  const [copied, setCopied] = useState(false);
  const config = generatePlaywrightConfig(testFile);

  function handleCopy() {
    void navigator.clipboard.writeText(config).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    });
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
          playwright.config.ts
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy} title="Copy">
            {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              downloadFile(config, "playwright.config.ts");
            }}
            title="Download"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-md bg-zinc-950">
        <pre className="whitespace-pre-wrap break-all p-3 font-mono text-[11px] leading-relaxed text-zinc-100">
          {config}
        </pre>
      </div>
    </div>
  );
}
