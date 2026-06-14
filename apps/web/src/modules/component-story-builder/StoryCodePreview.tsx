import { useMemo } from "react";
import { generateStoriesCode } from "@ai-builder/serializers";
import type { StoryFile } from "@ai-builder/schemas";

interface StoryCodePreviewProps {
  storyFile: StoryFile;
}

export function StoryCodePreview({ storyFile }: StoryCodePreviewProps) {
  const code = useMemo(() => generateStoriesCode(storyFile), [storyFile]);

  if (storyFile.variants.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Add variants to see the generated story code.
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
