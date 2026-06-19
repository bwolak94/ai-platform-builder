import { Layers, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGeneralChatContext } from "@/context/generalChat/GeneralChatContext";
import { ArtifactCard } from "./ArtifactCard";

export function ArtifactBoard() {
  const { artifacts, clearArtifacts } = useGeneralChatContext();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-1.5">
          <Layers className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-xs font-medium">Artifacts</span>
          {artifacts.length > 0 && (
            <span className="bg-primary/10 text-primary rounded-full px-1.5 text-[10px] font-medium">
              {artifacts.length}
            </span>
          )}
        </div>
        {artifacts.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive h-6 gap-1 text-[10px]"
            onClick={clearArtifacts}
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Content */}
      {artifacts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <Layers className="text-muted-foreground/40 h-8 w-8" />
          <p className="text-muted-foreground text-xs">
            Artifacts from code execution, transforms, and diffs will appear here.
          </p>
          <p className="text-muted-foreground/60 text-[10px]">
            Try asking the agent to run some code or compare two texts.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-3 p-3">
            {artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
