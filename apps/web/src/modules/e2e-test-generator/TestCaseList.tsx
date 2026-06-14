import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TestCase } from "@ai-builder/schemas";

interface TestCaseListProps {
  testCases: TestCase[];
  onDelete: (id: string) => void;
}

const STEP_ACTION_COLORS: Record<string, string> = {
  navigate: "bg-blue-100 text-blue-700",
  click: "bg-green-100 text-green-700",
  fill: "bg-purple-100 text-purple-700",
  select: "bg-indigo-100 text-indigo-700",
  check: "bg-teal-100 text-teal-700",
  wait: "bg-gray-100 text-gray-700",
  screenshot: "bg-orange-100 text-orange-700",
  expect: "bg-red-100 text-red-700",
};

function stepSummary(step: TestCase["steps"][number]): string {
  switch (step.action) {
    case "navigate":
      return "→ " + step.path;
    case "click":
      return "click [" + step.selector.value + "]";
    case "fill":
      return "fill [" + step.selector.value + '] = "' + step.value + '"';
    case "select":
      return "select [" + step.selector.value + '] = "' + step.value + '"';
    case "check":
      return "check [" + step.selector.value + "] " + String(step.checked);
    case "wait":
      return "wait " + String(step.ms) + "ms";
    case "screenshot":
      return "screenshot" + (step.name ? ' "' + step.name + '"' : "");
    case "expect":
      return "expect " + step.type + (step.selector ? " [" + step.selector.value + "]" : "");
  }
}

export function TestCaseList({ testCases, onDelete }: TestCaseListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (testCases.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-center text-xs">
        No test cases yet. Ask the agent to generate some.
      </p>
    );
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1.5">
        {testCases.map((tc) => (
          <div key={tc.id} className="rounded-md border">
            <div className="flex items-center gap-2 px-3 py-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 shrink-0"
                onClick={() => {
                  toggle(tc.id);
                }}
                aria-expanded={expanded.has(tc.id)}
                aria-label={expanded.has(tc.id) ? "Collapse" : "Expand"}
              >
                {expanded.has(tc.id) ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{tc.name}</span>
              <span className="text-muted-foreground shrink-0 text-[10px]">
                {tc.steps.length} steps
              </span>
              {tc.tags?.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive h-5 w-5 shrink-0"
                onClick={() => {
                  onDelete(tc.id);
                }}
                aria-label={"Delete test case " + tc.name}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {expanded.has(tc.id) && tc.steps.length > 0 && (
              <div className="space-y-1 border-t px-3 py-2">
                {tc.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className={
                        "shrink-0 rounded px-1 py-0.5 text-[9px] font-medium " +
                        (STEP_ACTION_COLORS[step.action] ?? "bg-gray-100 text-gray-700")
                      }
                    >
                      {step.action}
                    </span>
                    <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[10px]">
                      {stepSummary(step)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
