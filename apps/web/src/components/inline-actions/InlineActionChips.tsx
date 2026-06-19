import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Zap } from "lucide-react";
import { cn } from "@/utils";
import { useAgentActions } from "@/context/agentActions/AgentActionsContext";
import { INLINE_ACTIONS, buildInlinePrompt } from "@/lib/inline-prompts";
import type { FormField } from "@ai-builder/schemas";
import type { InlineAction } from "@/lib/inline-prompts";

interface InlineActionChipsProps {
  field: FormField;
  children: React.ReactNode;
}

export function InlineActionChips({ field, children }: InlineActionChipsProps) {
  const { sendMessage, setInput } = useAgentActions();

  function handleAction(action: InlineAction) {
    const prompt = buildInlinePrompt(field, action);
    // For "explain" we pre-fill (user can review before sending)
    // For all other actions we submit directly
    if (action === "explain") {
      setInput(prompt);
    } else {
      sendMessage(prompt);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={4}
        className="w-auto p-1.5"
        onOpenAutoFocus={(e) => {
          // Prevent stealing focus from the field list
          e.preventDefault();
        }}
      >
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 shrink-0 text-amber-500" />
          {INLINE_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                handleAction(action.id);
              }}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                "bg-muted hover:bg-accent hover:text-accent-foreground",
                "whitespace-nowrap"
              )}
              title={`${action.label}: ${buildInlinePrompt(field, action.id).slice(0, 80)}...`}
            >
              <span className="mr-1 opacity-60">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
