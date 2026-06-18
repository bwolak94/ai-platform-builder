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
    tagline: "Describe a form — the agent builds it with validation, ARIA, and live preview.",
    prompts: [
      "Build a user registration form with email, password, and confirm password",
      "Create a contact form with name, email, message, and Zod validation",
      "Add a drag-and-drop file upload with file type restriction and size limit",
      "Add Zod validation: email format, password strength, and matching confirm",
      "Add an international phone field with flag selector and E.164 format validation",
      "Create a 3-step checkout form with a progress stepper and back/next buttons",
      "Convert this form into a multi-step wizard with progress indicator",
      "Show the conditional visibility graph for all rules in this form",
      "Import a JSON Schema and add its properties as form fields",
      "Export a Zod schema snippet from the current form fields",
      "Duplicate the email field and add a confirm email field below it",
      "Add a computed order total field that multiplies quantity by price",
      "Audit this form for ARIA labels, input types, and accessibility issues",
    ],
  },
  layout: {
    tagline: "Compose page layouts from semantic Tailwind blocks — instantly previewed.",
    prompts: [
      "Build a SaaS landing page: hero, feature grid, social proof, pricing, and CTA",
      "Build a dashboard with collapsible sidebar, KPI cards, chart placeholders, and data table",
      "Add a pricing section with 3 tiers, feature comparison table, and annual/monthly toggle",
      "Create a blog post layout with sticky TOC, reading progress bar, and author card",
      "Build a split hero: left text + right product screenshot, with animated gradient",
      "Add a footer with links, newsletter signup, social icons, and dark mode support",
      "Clone the hero section and create a secondary CTA variant below it",
      "Add responsive classes so the feature grid stacks on mobile and goes 3-column on lg",
      "Toggle the pricing section visibility to hide it from the preview",
      "Wrap the hero and nav in a named PageHeader component block",
      "Add group-hover utilities so the card scales and reveals the CTA on hover",
      "Generate a :root CSS variables snippet from this layout's color palette",
      "Add dark mode variants to the header, hero, and pricing sections",
    ],
  },
  api: {
    tagline: "Design OpenAPI 3.1 specs with security, examples, and Swagger UI preview.",
    prompts: [
      "Design a blog API: posts, comments, likes — with pagination and hypermedia links",
      "Add auth endpoints: register, login, refresh token, logout, and revoke all sessions",
      "Create a CRUD API for a products catalog with filtering, sorting, and search",
      "Design a file upload API with S3 presigned URLs, multipart support, and virus scan webhook",
      "Add rate limiting headers and 429 responses to all endpoints",
      "Design a webhooks system with subscriptions, HMAC signatures, and retry policy",
      "Add cursor-based pagination with a limit param to all list endpoints",
      "Add an OrderStatus enum schema and reference it in the order endpoints",
      "Generate a typed TypeScript SDK client from this spec",
      "Export this spec as a Postman Collection v2.1",
      "Duplicate the GET /users endpoint and create a GET /admins variant",
      "Add contract tests with Pact for the web-frontend consuming this API",
      "Check for breaking changes between this spec and the previous version",
    ],
  },
  db: {
    tagline: "Design normalized schemas — preview as ERD, export SQL, Prisma, or Drizzle.",
    prompts: [
      "Design a multi-tenant schema with Row Level Security and tenant-scoped indexes",
      "Create a social schema: posts, comments, reactions, follows, and notifications",
      "Add a products, orders, order items, and inventory schema for e-commerce",
      "Add soft delete, audit timestamps, and created_by to all tables",
      "Create RBAC: users, roles, permissions, and role assignments with Supabase RLS",
      "Design a polymorphic tagging system that works across posts, products, and events",
      "Add a CHECK constraint that ensures order total is always positive",
      "Add a user_role Postgres enum and apply it to the users table",
      "Generate a Prisma schema file from the current tables",
      "Generate Supabase RLS policies for the posts table with user ownership",
      "Analyze this schema for normalization violations and suggest fixes",
      "Generate a Mermaid ER diagram of all tables and relationships",
      "Seed the database with 5 realistic rows per table",
    ],
  },
  email: {
    tagline:
      "Build spam-safe, cross-client HTML emails with live desktop, mobile, and Outlook preview.",
    prompts: [
      "Create an onboarding welcome email: hero, feature highlights, single CTA, and unsubscribe footer",
      "Build a password reset email with a secure link and expiry warning",
      "Design a newsletter: branded header, 2-column article grid, sponsor slot, and footer",
      "Create an order confirmation: header, line-item table, shipping info, support CTA",
      "Build a flash-sale email: countdown timer, product grid, discount badge, urgency copy",
      "Suggest 5 subject line variants for this email and explain the open-rate rationale",
      "Create an A/B variant with a different CTA label and measure open-rate rationale",
      "Add a testimonial social proof block after the hero section",
      "Toggle dark mode preview to check contrast and readability",
      "Generate a plain-text fallback version of this email",
      "Validate all CSS properties against Outlook and Gmail compatibility",
      "Register a {{firstName}} personalization token for the greeting line",
      "Audit this email for screen reader compatibility and alt text",
    ],
  },
  story: {
    tagline: "Generate CSF3 stories with controls, play functions, and a11y tests.",
    prompts: [
      "Document a Button: Primary, Secondary, Ghost, Destructive, Loading, and Disabled variants",
      "Add argTypes controls for all props with descriptions and default values",
      "Add autodocs tag, mobile/tablet/desktop viewports, and a11y addon configuration",
      "Create Card stories: default, with image, compact, skeleton loading, and error state",
      "Add a ThemeProvider decorator with a light/dark toolbar toggle parameter",
      "Add a play function that tests the button click flow with userEvent and expect",
      "Generate axe accessibility assertions for the Primary variant",
      "Create Mobile, Tablet, and Desktop viewport variants from the Default story",
      "Generate a Jest snapshot test file for all variants in this story",
      "Add Chromatic visual regression config with 320, 768, and 1280 viewports",
      "Generate a comprehensive keyboard navigation interaction test for the modal",
      "Export this story file as an MDX documentation page with Canvas previews",
      "Add an MSW decorator to mock the /api/user endpoint with fixture data",
    ],
  },
  i18n: {
    tagline: "Extract, translate, and type-check i18n keys across all your namespaces.",
    prompts: [
      "Add Polish, German, and French — auto-fill all keys from the English source",
      "Create an auth namespace: login, register, forgot password keys with ICU error messages",
      "Find all untranslated keys across every language and mark them for review",
      "Add a checkout namespace and create keys for every step of the purchase flow",
      "Create pluralization keys for item counts, cart quantities, and notification badges",
      "Import an existing en.json and auto-detect namespace from the key structure",
      "Merge the auth and common namespaces into a single shared namespace",
      "Find all keys with identical source text that could be consolidated",
      "Generate TypeScript types for all translation keys (i18next format)",
      "Export the German translations as an XLIFF 2.0 file for professional translators",
      "Configure Arabic plural rules (zero, one, two, few, many, other)",
      "Generate a namespace completion report showing % translated per language",
      "Detect unused translation keys by comparing against the provided usages list",
    ],
  },
  e2e: {
    tagline: "Generate type-safe Playwright specs with POM, axe checks, and multi-file management.",
    prompts: [
      "Write a login/logout test: fill credentials, assert dashboard, verify session cookie clears",
      "Test checkout end-to-end: add to cart, fill address, select payment, assert order confirmation",
      "Add a form validation test: submit empty form, assert all error messages are visible",
      "Test product search: type query, apply category filter, sort by price, assert result count",
      "Add network interception to mock the API and test the error state",
      "Add an axe-core test on every main page and assert zero critical violations",
      "Add a visual screenshot comparison step to catch layout regressions",
      "Generate a Page Object Model class from the login test steps",
      "Add storageState auth setup so all tests skip the login flow",
      "Create a mobile viewport variant of the checkout test using iPhone 14",
      "Generate a fixtures.ts with a loggedInPage fixture for shared auth state",
      "Set up HTML and JUnit reporters for CI integration",
      "Generate a GitHub Actions workflow that runs smoke and regression tests separately",
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
          </div>
        )}

        {isLoading && (
          <div className="mt-3">
            <ThinkingIndicator status={status} activeToolCall={activeToolCall} />
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
