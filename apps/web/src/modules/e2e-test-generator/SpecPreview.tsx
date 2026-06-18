import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePlaywrightSpec } from "@ai-builder/serializers";
import type { TestFile } from "@ai-builder/schemas";

interface SpecPreviewProps {
  testFile: TestFile;
}

export function SpecPreview({ testFile }: SpecPreviewProps) {
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => generatePlaywrightSpec(testFile), [testFile]);

  function handleCopy() {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    });
  }

  if (testFile.testCases.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Add test cases to see the generated Playwright spec.
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-auto bg-zinc-950">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6 text-zinc-400 hover:text-zinc-100"
        onClick={handleCopy}
        title="Copy spec"
        aria-label="Copy spec to clipboard"
      >
        {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
      </Button>
      <pre className="whitespace-pre-wrap break-all p-4 font-mono text-xs leading-relaxed text-zinc-100">
        {code}
      </pre>
    </div>
  );
}
