import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Trash2, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils";
import { ToolCallStatus } from "../ToolCallStatus";
import type { ChatPanelProps } from "./ChatPanel.types";
import type { AgentStatus } from "@/hooks/useBuilderAgent/useBuilderAgent.types";
import type { BuilderMode } from "@/types";

// ─── Per-mode hints ───────────────────────────────────────────────────────────

interface ModeHints {
  tagline: string;
  prompts: string[];
}

const HINTS: Record<BuilderMode, ModeHints> = {
  form: {
    tagline: "Describe a form and the agent builds it for you.",
    prompts: [
      "Build a user registration form with email and password",
      "Create a contact form with name, email, and message",
      "Add a file upload field for profile pictures",
      "Make all fields required and add validation rules",
      "Add a phone number field with country code selector",
      "Create a multi-step checkout form",
    ],
  },
  layout: {
    tagline: "Generate responsive page layouts with Tailwind CSS.",
    prompts: [
      "Create a SaaS marketing landing page with hero and features",
      "Build a dashboard with sidebar navigation and stats cards",
      "Add a pricing section with 3 tiers and feature comparison",
      "Create a blog post layout with sidebar and table of contents",
      "Build a full-page hero section with gradient background",
      "Add a footer with links, newsletter signup, and social icons",
    ],
  },
  api: {
    tagline: "Design OpenAPI 3.1 specs for your backend services.",
    prompts: [
      "Design a REST API for a blog with posts and comments",
      "Add JWT authentication endpoints (login, logout, refresh)",
      "Create a CRUD API for a products catalog",
      "Add pagination, filtering, and sorting to the users endpoint",
      "Design a file upload API with presigned URLs",
      "Create a webhooks API with event subscriptions",
    ],
  },
  db: {
    tagline: "Model your database schema in SQL or Prisma.",
    prompts: [
      "Design a schema for a multi-tenant SaaS application",
      "Create a posts, comments, and likes schema for a social app",
      "Add a products, orders, and inventory schema for e-commerce",
      "Add soft delete and audit timestamps to all tables",
      "Create a user roles and permissions system",
      "Design a tagging and categorization system",
    ],
  },
  email: {
    tagline: "Build email-client-compatible HTML templates.",
    prompts: [
      "Create a welcome email for new users with a CTA button",
      "Build a password reset email with a secure link",
      "Design a weekly newsletter with 2-column layout",
      "Create an order confirmation with itemised receipt",
      "Add a promotional email with a countdown timer section",
      "Build a subscription renewal reminder email",
    ],
  },
  story: {
    tagline: "Generate Storybook CSF3 .stories.tsx files.",
    prompts: [
      "Document a Button with Primary, Secondary, and Disabled variants",
      "Add argTypes controls for all props",
      "Add autodocs tag and viewport variants for mobile",
      "Create stories for a Card component with all states",
      "Wrap all stories with a ThemeProvider decorator",
      "Add a Loading and Error state variant to the component",
    ],
  },
  i18n: {
    tagline: "Manage translation keys across multiple languages.",
    prompts: [
      "Add Polish and German as active languages",
      "Create keys for a login form (email, password, submit, errors)",
      "Find all keys missing a French translation",
      "Add a namespace for the checkout flow",
      "Create pluralization keys for item counts",
      "Import translations from an existing en.json file",
    ],
  },
  e2e: {
    tagline: "Generate Playwright test specs for your UI flows.",
    prompts: [
      "Write a login and logout flow test",
      "Test the full checkout process from cart to confirmation",
      "Add a form validation test with error message assertions",
      "Write a navigation test for all main pages",
      "Create a search and filter test for the products list",
      "Add an accessibility test with axe-core checks",
    ],
  },
};

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
        <div className="flex items-center gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn("h-1.5 w-1.5 animate-bounce rounded-full", dotColor)}
              style={{ animationDelay: `${String(i * 150)}ms` }}
            />
          ))}
        </div>
        <span className={cn("text-xs font-semibold", color)}>{label}</span>
        {activeToolCall && (
          <span className="text-muted-foreground text-xs">· {prettifyTool(activeToolCall)}</span>
        )}
        <span className="text-muted-foreground ml-auto font-mono text-[10px]">{elapsed}s</span>
      </div>
    </div>
  );
}

// ─── Empty state with hints ───────────────────────────────────────────────────

function EmptyState({
  mode,
  onPrompt,
}: {
  mode: BuilderMode | undefined;
  onPrompt: (text: string) => void;
}) {
  const hints = mode ? HINTS[mode] : null;

  if (!hints) {
    return (
      <p className="text-muted-foreground mt-8 text-center text-sm">
        Describe what you want to build...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-1 pt-6">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full">
          <Sparkles className="h-4 w-4" />
        </div>
        <p className="text-foreground text-sm font-semibold">What do you want to build?</p>
        <p className="text-muted-foreground text-xs">{hints.tagline}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        {hints.prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              onPrompt(prompt);
            }}
            className={cn(
              "border-border hover:border-primary hover:bg-muted/60 group w-full rounded-lg border px-3 py-2 text-left transition-colors"
            )}
          >
            <span className="text-foreground/80 group-hover:text-foreground line-clamp-2 text-xs leading-relaxed">
              {prompt}
            </span>
          </button>
        ))}
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
  mode,
  onInputChange,
  onSubmit,
  onClear,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleHintClick(prompt: string) {
    onInputChange(prompt);
    // Auto-focus the input so the user can tweak and submit
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        "form input, form textarea"
      );
      input?.focus();
    }, 0);
  }

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
        {messages.length === 0 ? (
          <EmptyState mode={mode} onPrompt={handleHintClick} />
        ) : (
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
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
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
        )}

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
