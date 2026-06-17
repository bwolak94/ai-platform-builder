import { AlertCircle, AlertTriangle, Info, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { lintDbSchema, lintSummary } from "./lint";
import type { DbSchema } from "@ai-builder/schemas";
import type { DbLintIssue } from "./lint";

interface LintPanelProps {
  schema: DbSchema;
}

const ICONS = {
  error: <AlertCircle className="text-destructive mt-0.5 h-3.5 w-3.5 shrink-0" />,
  warning: <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />,
  info: <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />,
} satisfies Record<DbLintIssue["level"], React.ReactElement>;

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
        <div
          className={"h-full rounded-full transition-all " + color}
          style={{ width: String(score) + "%" }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums">{score}</span>
    </div>
  );
}

export function LintPanel({ schema }: LintPanelProps) {
  const issues = useMemo(() => lintDbSchema(schema), [schema]);
  const summary = useMemo(() => lintSummary(issues), [issues]);

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Health score</span>
          <div className="flex gap-2">
            {summary.errors > 0 && (
              <span className="text-destructive font-medium">{summary.errors}E</span>
            )}
            {summary.warnings > 0 && (
              <span className="font-medium text-yellow-500">{summary.warnings}W</span>
            )}
            {summary.infos > 0 && (
              <span className="font-medium text-blue-500">{summary.infos}I</span>
            )}
          </div>
        </div>
        <ScoreBar score={summary.score} />
      </div>

      {issues.length === 0 ? (
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <ShieldCheck className="h-3.5 w-3.5" />
          No issues found.
        </div>
      ) : (
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                {ICONS[issue.level]}
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
