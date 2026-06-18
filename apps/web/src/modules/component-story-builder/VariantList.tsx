import { Trash2, Monitor, Smartphone, Tablet, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StoryVariant } from "@ai-builder/schemas";

interface VariantListProps {
  variants: StoryVariant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const VIEWPORT_ICONS: Record<NonNullable<StoryVariant["viewport"]>, React.ReactNode> = {
  mobile1: <Smartphone className="h-3 w-3" />,
  mobile2: <Smartphone className="h-3 w-3" />,
  tablet: <Tablet className="h-3 w-3" />,
  desktop: <Monitor className="h-3 w-3" />,
};

function VariantRow({
  variant,
  isSelected,
  onSelect,
  onDelete,
}: {
  variant: StoryVariant;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [argsOpen, setArgsOpen] = useState(false);
  const argCount = Object.keys(variant.args).length;

  return (
    <div
      className={[
        "rounded-md border transition-colors",
        isSelected ? "border-primary bg-primary/5" : "border-border",
      ].join(" ")}
    >
      <div
        className="flex cursor-pointer items-center gap-2 px-3 py-2"
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect();
        }}
        aria-pressed={isSelected}
      >
        <Badge variant={isSelected ? "default" : "outline"} className="shrink-0 text-[10px]">
          {variant.name}
        </Badge>

        {variant.viewport && (
          <span
            className="text-muted-foreground flex shrink-0 items-center gap-1 text-[10px]"
            aria-label={"Viewport: " + variant.viewport}
          >
            {VIEWPORT_ICONS[variant.viewport]}
            <span className="hidden sm:inline">{variant.viewport}</span>
          </span>
        )}

        {/* Args summary */}
        <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[10px]">
          {argCount > 0 ? `${String(argCount)} prop${argCount !== 1 ? "s" : ""}` : "no props"}
        </span>

        {argCount > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setArgsOpen((v) => !v);
            }}
            className="text-muted-foreground hover:text-foreground h-4 w-4 shrink-0"
            aria-label={argsOpen ? "Collapse args" : "Expand args"}
          >
            {argsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive h-5 w-5 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label={"Delete variant " + variant.name}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Docs */}
      {variant.docs && (
        <p className="border-t px-3 pb-1.5 pt-1 text-[11px] italic text-amber-700 dark:text-amber-400">
          {variant.docs}
        </p>
      )}

      {/* Expanded args */}
      {argsOpen && argCount > 0 && (
        <div className="border-t px-3 pb-2 pt-1.5">
          <div className="space-y-0.5">
            {Object.entries(variant.args).map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-1.5">
                <code className="shrink-0 text-[10px] font-medium text-rose-600">{k}</code>
                <span className="text-muted-foreground">=</span>
                <code className="min-w-0 flex-1 truncate text-[10px] text-green-700 dark:text-green-400">
                  {JSON.stringify(v)}
                </code>
              </div>
            ))}
          </div>

          {variant.parameters && Object.keys(variant.parameters).length > 0 && (
            <div className="mt-1.5 rounded bg-zinc-50 px-2 py-1 dark:bg-zinc-900">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                Parameters
              </p>
              <code className="text-muted-foreground break-all text-[10px]">
                {JSON.stringify(variant.parameters)}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function VariantList({ variants, selectedId, onSelect, onDelete }: VariantListProps) {
  if (variants.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-xs">
        No variants yet. Ask the agent to add some.
      </p>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1.5">
        {variants.map((variant) => (
          <VariantRow
            key={variant.id}
            variant={variant}
            isSelected={variant.id === selectedId}
            onSelect={() => {
              onSelect(variant.id);
            }}
            onDelete={() => {
              onDelete(variant.id);
            }}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
