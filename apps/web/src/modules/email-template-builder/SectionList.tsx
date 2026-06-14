import { Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EmailSection } from "@ai-builder/schemas";

interface SectionListProps {
  sections: EmailSection[];
  onDelete: (id: string) => void;
}

const SECTION_LABELS: Record<EmailSection["type"], string> = {
  header: "Header",
  hero: "Hero",
  text: "Body text",
  cta: "Call to action",
  footer: "Footer",
};

const SECTION_COLORS: Record<EmailSection["type"], string> = {
  header: "bg-purple-100 text-purple-700",
  hero: "bg-blue-100 text-blue-700",
  text: "bg-gray-100 text-gray-700",
  cta: "bg-green-100 text-green-700",
  footer: "bg-orange-100 text-orange-700",
};

function getSectionSummary(section: EmailSection): string {
  switch (section.type) {
    case "header":
      return section.title ?? section.logoAlt ?? "Header";
    case "hero":
      return section.heading;
    case "text":
      return section.content.slice(0, 40) + (section.content.length > 40 ? "…" : "");
    case "cta":
      return section.cta.label + " → " + section.cta.url;
    case "footer":
      return section.companyName ?? "Footer";
  }
}

export function SectionList({ sections, onDelete }: SectionListProps) {
  if (sections.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-xs">
        No sections yet. Ask the agent to add some.
      </p>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1.5">
        {sections.map((section) => (
          <div key={section.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
            <GripVertical className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <span
              className={
                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium " +
                SECTION_COLORS[section.type]
              }
            >
              {SECTION_LABELS[section.type]}
            </span>
            <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
              {getSectionSummary(section)}
            </span>
            {section.bgColor && (
              <span
                className="h-3 w-3 shrink-0 rounded-full border"
                style={{ backgroundColor: section.bgColor }}
                aria-label={"Background color " + section.bgColor}
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-5 w-5 shrink-0"
              onClick={() => {
                onDelete(section.id);
              }}
              aria-label={"Delete " + section.type + " section"}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
