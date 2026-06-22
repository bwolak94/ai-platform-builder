import { useMemo, useState } from "react";
import { Layers, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils";
import { useGeneralChatContext } from "@/context/generalChat/GeneralChatContext";
import { ArtifactCard } from "./ArtifactCard";
import type { ArtifactType } from "@/context/generalChat/GeneralChatContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ArtifactType, string> = {
  code: "Code",
  mermaid: "Diagram",
  diff: "Diff",
  data: "Data",
  text: "Text",
  palette: "Palette",
  table: "Table",
};

/** Show the filter bar once we have this many artifacts. */
const FILTER_THRESHOLD = 4;

// ─── Component ────────────────────────────────────────────────────────────────

export function ArtifactBoard() {
  const {
    artifacts,
    clearArtifacts,
    pinnedArtifactIds,
    pinArtifact,
    unpinArtifact,
    updateArtifact,
  } = useGeneralChatContext();

  const [typeFilter, setTypeFilter] = useState<ArtifactType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const availableTypes = useMemo(() => [...new Set(artifacts.map((a) => a.type))], [artifacts]);

  const displayedArtifacts = useMemo(() => {
    let list = artifacts;

    if (typeFilter !== "all") {
      list = list.filter((a) => a.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q));
    }

    // Pinned artifacts float to the top
    return [...list].sort((a, b) => {
      const aPin = pinnedArtifactIds.has(a.id) ? 1 : 0;
      const bPin = pinnedArtifactIds.has(b.id) ? 1 : 0;
      return bPin - aPin;
    });
  }, [artifacts, typeFilter, searchQuery, pinnedArtifactIds]);

  const showFilters = artifacts.length >= FILTER_THRESHOLD;

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

      {/* Filter bar — shown when ≥ FILTER_THRESHOLD artifacts */}
      {showFilters && (
        <div className="flex flex-col gap-2 border-b px-3 py-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              placeholder="Search artifacts..."
              className={cn(
                "w-full rounded-md border bg-transparent py-1 pl-6 pr-2 text-[11px]",
                "placeholder:text-muted-foreground focus:ring-ring focus:outline-none focus:ring-1"
              )}
            />
          </div>

          {availableTypes.length > 1 && (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("all");
                }}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                  typeFilter === "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              {availableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setTypeFilter(type);
                  }}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                    typeFilter === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
      ) : displayedArtifacts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-muted-foreground text-xs">No artifacts match the current filter.</p>
          <button
            type="button"
            onClick={() => {
              setTypeFilter("all");
              setSearchQuery("");
            }}
            className="text-primary text-[11px] underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-3 p-3">
            {displayedArtifacts.map((artifact) => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                isPinned={pinnedArtifactIds.has(artifact.id)}
                onPin={() => {
                  pinArtifact(artifact.id);
                }}
                onUnpin={() => {
                  unpinArtifact(artifact.id);
                }}
                onUpdate={(content) => {
                  updateArtifact(artifact.id, content);
                }}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
