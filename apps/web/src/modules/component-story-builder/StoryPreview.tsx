import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { generateStoryPreviewHtml } from "@ai-builder/serializers";
import type { StoryFile } from "@ai-builder/schemas";

interface StoryPreviewProps {
  file: StoryFile;
}

export function StoryPreview({ file }: StoryPreviewProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    file.variants[0]?.id ?? null
  );

  // Keep selection in sync when variants change
  const resolvedVariantId =
    selectedVariantId && file.variants.some((v) => v.id === selectedVariantId)
      ? selectedVariantId
      : (file.variants[0]?.id ?? null);

  const html = useMemo(
    () => generateStoryPreviewHtml(file, resolvedVariantId),
    [file, resolvedVariantId]
  );

  if (file.variants.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <Eye className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">Add variants to see the story preview.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2">
      {file.variants.length > 1 && (
        <div className="flex shrink-0 flex-wrap gap-1">
          {file.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setSelectedVariantId(v.id);
              }}
              className={[
                "rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
                resolvedVariantId === v.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-foreground",
              ].join(" ")}
              aria-pressed={resolvedVariantId === v.id}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <iframe
          key={html}
          srcDoc={html}
          sandbox="allow-scripts"
          title={"Story preview — " + file.componentName}
          className="h-full w-full rounded-md border-0"
          style={{ minHeight: "300px" }}
          aria-label="Story metadata preview"
        />
      </div>
    </div>
  );
}
