import { Trash2, Monitor, Smartphone, Tablet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StoryVariant } from "@ai-builder/schemas";

interface VariantListProps {
  variants: StoryVariant[];
  onDelete: (id: string) => void;
}

const VIEWPORT_ICONS: Record<NonNullable<StoryVariant["viewport"]>, React.ReactNode> = {
  mobile1: <Smartphone className="h-3 w-3" />,
  mobile2: <Smartphone className="h-3 w-3" />,
  tablet: <Tablet className="h-3 w-3" />,
  desktop: <Monitor className="h-3 w-3" />,
};

export function VariantList({ variants, onDelete }: VariantListProps) {
  if (variants.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-xs">
        No variants yet. Ask the agent to add some.
      </p>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1.5">
        {variants.map((variant) => (
          <div key={variant.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {variant.name}
            </Badge>
            {variant.viewport && (
              <span
                className="text-muted-foreground flex shrink-0 items-center gap-1 text-[10px]"
                aria-label={"Viewport: " + variant.viewport}
              >
                {VIEWPORT_ICONS[variant.viewport]}
              </span>
            )}
            <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
              {Object.keys(variant.args).length > 0
                ? Object.entries(variant.args)
                    .map(([k, v]) => k + "=" + JSON.stringify(v))
                    .join(" ")
                : "no args"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-5 w-5 shrink-0"
              onClick={() => {
                onDelete(variant.id);
              }}
              aria-label={"Delete variant " + variant.name}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
