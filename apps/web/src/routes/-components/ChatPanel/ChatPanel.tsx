import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils";
import { ToolCallStatus } from "../ToolCallStatus";
import type { ChatPanelProps } from "./ChatPanel.types";
import type { AgentStatus } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

// ─── Thinking indicator ───────────────────────────────────────────────────────

type ThinkingPhase = "thinking" | "applying" | "responding";

function getPhase(status: AgentStatus, activeToolCall: string | null): ThinkingPhase {
  if (activeToolCall) return "applying";
  if (status === "submitted") return "thinking";
  return "responding";
}

const PHASE_CONFIG: Record<ThinkingPhase, { label: string; color: string; dotColor: string }> = {
  thinking: {
    label: "Thinking",
    color: "text-amber-500 dark:text-amber-400",
    dotColor: "bg-amber-500",
  },
  applying: {
    label: "Applying",
    color: "text-blue-500 dark:text-blue-400",
    dotColor: "bg-blue-500",
  },
  responding: {
    label: "Responding",
    color: "text-green-500 dark:text-green-400",
    dotColor: "bg-green-500",
  },
};

function prettifyTool(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();
}

function ThinkingIndicator({
  status,
  activeToolCall,
}: {
  status: AgentStatus;
  activeToolCall: string | null;
}) {
  const phase = getPhase(status, activeToolCall);
  const { label, color, dotColor } = PHASE_CONFIG[phase];

  const [elapsed, setElapsed] = useState(0);
  // Reset elapsed when the phase or active tool changes
  const phaseKey = phase + (activeToolCall ?? "");
  useEffect(() => {
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [phaseKey]);

  return (
    <div className="bg-muted mr-auto max-w-[85%] rounded-lg px-3 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        {/* Animated dots */}
        <div className="flex items-center gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn("h-1.5 w-1.5 animate-bounce rounded-full", dotColor)}
              style={{ animationDelay: `${String(i * 150)}ms` }}
            />
          ))}
        </div>

        {/* Phase label */}
        <span className={cn("text-xs font-semibold", color)}>{label}</span>

        {/* Tool name when applying */}
        {activeToolCall && (
          <span className="text-muted-foreground text-xs">· {prettifyTool(activeToolCall)}</span>
        )}

        {/* Elapsed time */}
        <span className="text-muted-foreground ml-auto font-mono text-[10px]">{elapsed}s</span>
      </div>
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

export function ChatPanel({
  messages,
  input,
  isLoading,
  status = "idle",
  activeToolCall,
  onInputChange,
  onSubmit,
  onClear,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      {messages.length > 0 && (
        <div className="flex justify-end border-b px-3 py-1">
          <button
            onClick={onClear}
            disabled={isLoading}
            title="Clear conversation"
            aria-label="Clear conversation"
            className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <ScrollArea className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-muted-foreground mt-8 text-center text-sm">
            Describe what you want to build...
          </p>
        )}

        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-muted text-foreground mr-auto"
              )}
            >
              {msg.role === "user" ? (
                msg.content
              ) : (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    ul: ({ children }) => <ul className="mb-1 list-disc pl-4">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-1 list-decimal pl-4">{children}</ol>,
                    li: ({ children }) => <li className="mb-0.5">{children}</li>,
                    code: ({ children }) => (
                      <code className="rounded bg-black/10 px-1 font-mono text-xs dark:bg-white/10">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          ))}

          {isLoading && <ThinkingIndicator status={status} activeToolCall={activeToolCall} />}
        </div>

        <div ref={bottomRef} />
      </ScrollArea>

      <div className="border-t p-3">
        {activeToolCall && (
          <div className="mb-2">
            <ToolCallStatus toolName={activeToolCall} />
          </div>
        )}
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => {
              onInputChange(e.target.value);
            }}
            placeholder="Ask the agent..."
            disabled={isLoading}
            className={cn(
              "flex-1 rounded-md border bg-transparent px-3 py-2 text-sm",
              "placeholder:text-muted-foreground focus:ring-ring focus:outline-none focus:ring-1",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
