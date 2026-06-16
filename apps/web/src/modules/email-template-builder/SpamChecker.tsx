import { useMemo } from "react";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { analyzeSpam } from "@ai-builder/serializers";
import type { EmailTemplate } from "@ai-builder/schemas";

interface SpamCheckerProps {
  template: EmailTemplate;
}

function scoreLabel(score: number): { label: string; color: string; Icon: typeof ShieldCheck } {
  if (score <= 15) return { label: "Good", color: "text-green-600", Icon: ShieldCheck };
  if (score <= 40) return { label: "Fair", color: "text-amber-600", Icon: ShieldAlert };
  return { label: "High risk", color: "text-red-600", Icon: ShieldX };
}

export function SpamChecker({ template }: SpamCheckerProps) {
  const result = useMemo(() => analyzeSpam(template), [template]);
  const { label, color, Icon } = scoreLabel(result.score);

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className={`text-xs font-semibold ${color}`}>{label}</span>
        <span className="text-muted-foreground ml-auto font-mono text-xs">{result.score}/100</span>
      </div>

      {/* Score bar */}
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={[
            "h-full rounded-full transition-all duration-500",
            result.score <= 15
              ? "bg-green-500"
              : result.score <= 40
                ? "bg-amber-500"
                : "bg-red-500",
          ].join(" ")}
          style={{ width: `${String(result.score)}%` }}
          role="progressbar"
          aria-valuenow={result.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Spam score: ${String(result.score)} out of 100`}
        />
      </div>

      {result.issues.length > 0 ? (
        <ul className="space-y-0.5">
          {result.issues.map((issue, i) => (
            <li key={i} className="text-muted-foreground flex items-start gap-1.5 text-[11px]">
              <span className="mt-0.5 shrink-0 text-amber-500">•</span>
              {issue}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-[11px]">No spam issues detected.</p>
      )}
    </div>
  );
}
