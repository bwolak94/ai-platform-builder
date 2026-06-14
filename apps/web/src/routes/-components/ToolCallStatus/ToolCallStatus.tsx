import { cn } from "@/utils";
import type { ToolCallStatusProps } from "./ToolCallStatus.types";

export function ToolCallStatus({ toolName }: ToolCallStatusProps) {
  if (!toolName) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-xs",
        "text-muted-foreground bg-muted rounded-md"
      )}
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
      <span>Running tool: {toolName}</span>
    </div>
  );
}
