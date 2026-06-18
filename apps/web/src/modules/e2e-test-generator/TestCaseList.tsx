import { Trash2, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TestCase } from "@ai-builder/schemas";

interface TestCaseListProps {
  testCases: TestCase[];
  onDelete: (id: string) => void;
  onDeleteStep: (testCaseId: string, stepId: string) => void;
}

const STEP_ACTION_COLORS: Record<string, string> = {
  navigate: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  click: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  fill: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  select: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  check: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  hover: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  press: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-700",
  upload: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  scroll: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
  wait: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-400",
  screenshot: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  axe: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  intercept: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  expect: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
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
    case "hover":
      return "hover [" + step.selector.value + "]";
    case "press":
      return 'press "' + step.key + '"';
    case "upload":
      return "upload [" + step.selector.value + '] = "' + step.filePath + '"';
    case "scroll":
      return step.selector
        ? "scroll [" + step.selector.value + "]"
        : "scroll " + String(step.x ?? 0) + "," + String(step.y ?? 0);
    case "wait":
      return "wait " + String(step.ms) + "ms";
    case "screenshot":
      return "screenshot" + (step.name ? ' "' + step.name + '"' : "");
    case "axe":
      return "axe" + (step.context ? ' "' + step.context + '"' : " (full page)");
    case "intercept":
      return "intercept " + step.method + " " + step.urlPattern + " → " + String(step.status);
    case "expect":
      return "expect " + step.type + (step.selector ? " [" + step.selector.value + "]" : "");
  }
}

function StepRow({
  step,
  index,
  testCaseId,
  onDelete,
}: {
  step: TestCase["steps"][number];
  index: number;
  testCaseId: string;
  onDelete: (testCaseId: string, stepId: string) => void;
}) {
  return (
    <div className="group flex items-center gap-2">
      <span className="text-muted-foreground w-4 shrink-0 text-right font-mono text-[9px]">
        {index + 1}
      </span>
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
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => {
          onDelete(testCaseId, step.id);
        }}
        aria-label={"Delete step " + step.action}
      >
        <Trash2 className="h-2.5 w-2.5" />
      </Button>
    </div>
  );
}

export function TestCaseList({ testCases, onDelete, onDeleteStep }: TestCaseListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const allExpanded = testCases.length > 0 && expanded.size === testCases.length;

  const toggleAll = useCallback(() => {
    setExpanded(allExpanded ? new Set() : new Set(testCases.map((tc) => tc.id)));
  }, [allExpanded, testCases]);

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
    <div className="flex h-full flex-col gap-1">
      <div className="flex shrink-0 items-center justify-between">
        <span className="text-muted-foreground text-[10px]">
          {testCases.length} test{testCases.length !== 1 ? "s" : ""}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground h-5 w-5"
          onClick={toggleAll}
          title={allExpanded ? "Collapse all" : "Expand all"}
          aria-label={allExpanded ? "Collapse all" : "Expand all"}
        >
          {allExpanded ? (
            <ChevronsDownUp className="h-3 w-3" />
          ) : (
            <ChevronsUpDown className="h-3 w-3" />
          )}
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
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
                  {tc.steps.length} step{tc.steps.length !== 1 ? "s" : ""}
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

              {expanded.has(tc.id) && (
                <div className="border-t px-3 py-2">
                  {tc.beforeEach && tc.beforeEach.length > 0 && (
                    <div className="mb-2">
                      <p className="text-muted-foreground mb-1 text-[9px] font-semibold uppercase tracking-wide">
                        beforeEach
                      </p>
                      <div className="space-y-1 pl-1">
                        {tc.beforeEach.map((step, i) => (
                          <StepRow
                            key={step.id}
                            step={step}
                            index={i}
                            testCaseId={tc.id}
                            onDelete={onDeleteStep}
                          />
                        ))}
                      </div>
                      <div className="border-muted my-2 border-t" />
                    </div>
                  )}

                  {tc.steps.length > 0 ? (
                    <div className="space-y-1">
                      {tc.steps.map((step, i) => (
                        <StepRow
                          key={step.id}
                          step={step}
                          index={i}
                          testCaseId={tc.id}
                          onDelete={onDeleteStep}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-[10px] italic">No steps yet.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
