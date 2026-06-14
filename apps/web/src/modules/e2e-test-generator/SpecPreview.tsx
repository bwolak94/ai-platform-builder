import { useMemo } from "react";
import { generatePlaywrightSpec } from "@ai-builder/serializers";
import type { TestFile } from "@ai-builder/schemas";

interface SpecPreviewProps {
  testFile: TestFile;
}

export function SpecPreview({ testFile }: SpecPreviewProps) {
  const code = useMemo(() => generatePlaywrightSpec(testFile), [testFile]);

  if (testFile.testCases.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Add test cases to see the generated Playwright spec.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-zinc-950 p-4">
      <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-zinc-100">
        {code}
      </pre>
    </div>
  );
}
