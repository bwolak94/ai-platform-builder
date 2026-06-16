import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils";
import { ToolCallStatus } from "../ToolCallStatus";
import type { ChatPanelProps } from "./ChatPanel.types";

export function ChatPanel({
  messages,
  input,
  isLoading,
  activeToolCall,
  onInputChange,
  onSubmit,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
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
          {isLoading && (
            <div className="bg-muted text-muted-foreground mr-auto max-w-[85%] rounded-lg px-3 py-2 text-sm">
              <span className="animate-pulse">...</span>
            </div>
          )}
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
