import { Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TranslationKey, SupportedLanguage } from "@ai-builder/schemas";

interface KeyListProps {
  keys: TranslationKey[];
  activeLanguages: SupportedLanguage[];
  sourceLanguage: SupportedLanguage;
  onDelete: (id: string) => void;
}

function countMissing(
  key: TranslationKey,
  activeLanguages: SupportedLanguage[],
  source: SupportedLanguage
): number {
  return activeLanguages.filter((l) => l !== source && !key.translations[l]).length;
}

export function KeyList({ keys, activeLanguages, sourceLanguage, onDelete }: KeyListProps) {
  if (keys.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-xs">
        No keys yet. Ask the agent to add translation keys.
      </p>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1.5">
        {keys.map((key) => {
          const missing = countMissing(key, activeLanguages, sourceLanguage);
          return (
            <div key={key.id} className="flex items-start gap-2 rounded-md border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs">{key.key}</p>
                <p className="text-muted-foreground truncate text-[10px]">{key.sourceText}</p>
              </div>
              {missing > 0 && (
                <span
                  className="flex shrink-0 items-center gap-1 text-[10px] text-amber-600"
                  aria-label={String(missing) + " missing translations"}
                >
                  <AlertCircle className="h-3 w-3" />
                  {missing}
                </span>
              )}
              {missing === 0 && (
                <Badge
                  variant="outline"
                  className="shrink-0 border-green-200 text-[10px] text-green-600"
                >
                  ✓
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive h-5 w-5 shrink-0"
                onClick={() => {
                  onDelete(key.id);
                }}
                aria-label={"Delete key " + key.key}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
