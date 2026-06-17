import { useMemo } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { lintApiSpec, lintSummary } from "./lint";
import type { OpenApiSpec } from "@ai-builder/schemas";
import type { LintIssue } from "./lint";

interface LintPanelProps {
  spec: OpenApiSpec;
}

function issueIcon(level: LintIssue["level"]) {
  switch (level) {
    case "error":
      return <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />;
    case "warning":
      return <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />;
    case "info":
      return <Info className="h-3 w-3 shrink-0 text-blue-400" />;
  }
}

function healthIcon(errors: number, warnings: number) {
  if (errors > 0) return <ShieldX className="h-4 w-4 text-red-500" />;
  if (warnings > 0) return <ShieldAlert className="h-4 w-4 text-amber-500" />;
  return <ShieldCheck className="h-4 w-4 text-green-500" />;
}

function healthLabel(errors: number, warnings: number): string {
  if (errors > 0) return "Errors found";
  if (warnings > 0) return "Warnings";
  return "Looks good";
}

export function LintPanel({ spec }: LintPanelProps) {
  const issues = useMemo(() => lintApiSpec(spec), [spec]);
  const { errors, warnings, infos } = lintSummary(issues);

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        {healthIcon(errors, warnings)}
        <span className="text-xs font-semibold">{healthLabel(errors, warnings)}</span>
        <div className="text-muted-foreground ml-auto flex items-center gap-2 font-mono text-[10px]">
          {errors > 0 && <span className="text-red-500">{errors}E</span>}
          {warnings > 0 && <span className="text-amber-500">{warnings}W</span>}
          {infos > 0 && <span className="text-blue-400">{infos}I</span>}
        </div>
      </div>

      {/* Score bar */}
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={[
            "h-full rounded-full transition-all duration-500",
            errors > 0 ? "bg-red-500" : warnings > 0 ? "bg-amber-500" : "bg-green-500",
          ].join(" ")}
          style={{
            width:
              issues.length === 0
                ? "100%"
                : `${String(Math.max(10, 100 - (errors * 30 + warnings * 10 + infos * 3)))}%`,
          }}
          role="progressbar"
          aria-valuenow={errors + warnings}
          aria-valuemin={0}
          aria-valuemax={10}
          aria-label={`API health: ${String(errors)} errors, ${String(warnings)} warnings`}
        />
      </div>

      {issues.length > 0 ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {issues.map((issue) => (
            <li key={issue.id} className="flex items-start gap-1.5 text-[11px]">
              {issueIcon(issue.level)}
              <span className="text-muted-foreground">{issue.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-[11px]">No issues detected.</p>
      )}
    </div>
  );
}
