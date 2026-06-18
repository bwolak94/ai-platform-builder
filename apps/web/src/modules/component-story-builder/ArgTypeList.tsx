import { Trash2, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ArgType } from "@ai-builder/schemas";

interface ArgTypeListProps {
  argTypes: ArgType[];
  onDelete: (name: string) => void;
}

const CONTROL_COLORS: Record<ArgType["control"], string> = {
  text: "bg-blue-50 text-blue-700 border-blue-200",
  boolean: "bg-green-50 text-green-700 border-green-200",
  select: "bg-purple-50 text-purple-700 border-purple-200",
  radio: "bg-purple-50 text-purple-700 border-purple-200",
  number: "bg-orange-50 text-orange-700 border-orange-200",
  range: "bg-orange-50 text-orange-700 border-orange-200",
  color: "bg-pink-50 text-pink-700 border-pink-200",
  object: "bg-zinc-50 text-zinc-700 border-zinc-200",
  file: "bg-zinc-50 text-zinc-700 border-zinc-200",
};

export function ArgTypeList({ argTypes, onDelete }: ArgTypeListProps) {
  if (argTypes.length === 0) {
    return (
      <div className="flex items-center justify-center gap-1.5 py-3">
        <Sliders className="text-muted-foreground h-3.5 w-3.5" />
        <p className="text-muted-foreground text-xs">No controls defined.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-40">
      <div className="space-y-1">
        {argTypes.map((at) => (
          <div key={at.name} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
            <code className="min-w-0 flex-1 truncate font-mono text-[11px] font-medium text-rose-600">
              {at.name}
            </code>

            <span
              className={[
                "shrink-0 rounded border px-1.5 py-0 font-mono text-[10px]",
                CONTROL_COLORS[at.control],
              ].join(" ")}
            >
              {at.control}
            </span>

            {at.options && at.options.length > 0 && (
              <span className="text-muted-foreground max-w-[80px] shrink-0 truncate text-[10px]">
                {at.options.join(", ")}
              </span>
            )}

            {at.description && (
              <span
                className="text-muted-foreground max-w-[60px] shrink-0 truncate text-[10px] italic"
                title={at.description}
              >
                {at.description}
              </span>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-5 w-5 shrink-0"
              onClick={() => {
                onDelete(at.name);
              }}
              aria-label={"Remove argType " + at.name}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function ArgTypeListSection({
  argTypes,
  onDelete,
}: {
  argTypes: ArgType[] | null;
  onDelete: (name: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Sliders className="text-muted-foreground h-3 w-3" />
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
          Controls ({argTypes?.length ?? 0})
        </p>
      </div>
      <ArgTypeList argTypes={argTypes ?? []} onDelete={onDelete} />
    </div>
  );
}
