import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  createContext,
  useContext,
  type KeyboardEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import {
  Trash2,
  Sparkles,
  Copy,
  Check,
  Download,
  Square,
  Search,
  ChevronDown,
  ChevronUp,
  Pin,
  PinOff,
  GitBranch,
  GitFork,
  Save,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { ToolCallStatus } from "../ToolCallStatus";
import { useTokenGauge } from "@/hooks/useTokenGauge";
import type { ChatPanelProps } from "./ChatPanel.types";
import type { AgentStatus, ChatMessage } from "@/hooks/useBuilderAgent/useBuilderAgent.types";
import type { BuilderMode } from "@/types";

// ─── Internal context (avoids prop-drilling through ReactMarkdown) ────────────

interface ChatPanelInternalContext {
  onSaveArtifact: ((content: string, lang: string, title: string) => void) | undefined;
}

const ChatPanelCtx = createContext<ChatPanelInternalContext>({ onSaveArtifact: undefined });

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
      "Generate a full multi-step form component with react-hook-form and per-step Zod validation",
      "Add a cross-field validation rule: confirmPassword must equal password",
      "Infer a form schema from this sample JSON object and add all its properties",
      "Generate a typed onSubmit handler with optimistic update, error toast, and redirect",
      "Show the ARIA accessibility tree for all fields in this form",
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
      "Convert the feature cards into a responsive grid: 1 column on mobile, 3 on large screens",
      "Extract all color and typography tokens from this layout as a design token map",
      "Generate a Storybook story file for this layout as a full-page LandingPage story",
      "Replace the team grid with a skeleton loading placeholder using animate-pulse",
      "Audit the hero and feature sections for WCAG AA contrast ratio violations",
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
      "Create a standardized error catalog with INVALID_EMAIL, NOT_FOUND, and UNAUTHORIZED codes",
      "Add /v1/ path versioning to all endpoints and mark the unversioned paths as deprecated",
      "Generate Zod validators for all schema components in this spec",
      "Detect any circular schema references in this spec",
      "Add CORS policy documentation with OPTIONS method to all endpoints",
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
      "Add soft delete support to users, posts, and comments with a deleted_at column",
      "Generate an audit_log table and trigger that records all changes with old/new JSONB data",
      "Suggest indexes for all FK columns and common filter fields in this schema",
      "Generate TypeORM entity classes with relation decorators for all tables",
      "Scan this schema for denormalization: comma-separated values and missing junction tables",
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
      "Convert this template to MJML for automatic cross-client compatibility",
      "Add a countdown timer section showing hours and minutes until the offer ends",
      "Score the readability of this email using Flesch-Kincaid grade level",
      "Generate a multi-part MIME plain-text version with full URLs in parentheses",
      "Add an RSS feed block pulling the latest 3 articles from our blog",
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
      "Generate an autodocs page with component description and usage examples per variant",
      "Create Light, Dark, and High-Contrast theme variants from the Default story",
      "Generate a full prop matrix: Primary × Small/Medium/Large × enabled/disabled",
      "Add an i18n decorator with en/de/fr locale selector for this component",
      "Infer argType controls from this design token JSON and update default args",
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
      "Sync the store with these codebase keys and auto-add any missing ones",
      "Suggest machine translations for all missing German keys (up to 20)",
      "Generate ICU plural forms for the item count key in Arabic",
      "Build a translation memory from all current keys for consistency auditing",
      "Export the French translations as an ARB file for Flutter localization",
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
      "Generate API contract tests that validate status codes and response fields",
      "Add a retry strategy with 2 retries for all flaky checkout tests",
      "Generate a performance budget test for the homepage: LCP < 2500ms, CLS < 0.1",
      "Create a multi-user scenario with admin and viewer contexts interacting simultaneously",
      "Convert this Cypress test file to a Playwright spec",
    ],
  },
  chat: {
    tagline:
      "General-purpose AI assistant with 20 tools: web search, code execution, transforms, and more.",
    prompts: [
      "Search the web for the latest Claude 4.5 release notes",
      "Fetch https://example.com and summarise the content",
      "Generate 10 user records with id, name, email, role (admin|viewer), and createdAt",
      "Run this JS and show me the output: return [1,2,3,4,5].reduce((a,b)=>a+b,0)",
      "Format this SQL: select u.id,u.name,o.total from users u join orders o on u.id=o.user_id",
      "Write Vitest tests for a function that validates an email address",
      "Convert this Python dataclass to a TypeScript interface",
      "Explain this error: Cannot read properties of undefined (reading 'map')",
      "Summarise the following text in 3 bullet points",
      "Translate 'Good morning, how are you?' into Japanese, French, and Arabic",
      "Extract {title, salary, techStack[]} from this job posting",
      "Generate a Mermaid sequence diagram for a JWT authentication flow",
      "Turn these commits into a CHANGELOG for v2.0.0",
      "Generate a 6-colour accessible palette for a fintech brand, primary blue",
      "Break down 'Add OAuth2 login with Google' into implementation tasks",
      "Estimate story points for migrating the PostgreSQL database to PlanetScale",
      "Show me the diff between 'Hello World' and 'Hello Claude'",
      "Count tokens in my system prompt",
      "Base64-encode this string: admin:secretpassword",
      "Query this JSON for the first user's email",
    ],
  },
  wordpress: {
    tagline:
      "Scaffold WordPress themes and plugins with ACF, CPTs, shortcodes, and REST endpoints.",
    prompts: [
      "Initialize a new WordPress theme with full boilerplate (functions.php, templates, style.css)",
      "Initialize a new WordPress plugin with the standard file structure and activation hooks",
      "Add an ACF field group for the Page post type with hero heading, image, and CTA fields",
      "Register a Portfolio custom post type with title, editor, thumbnail, and excerpt support",
      "Generate a shortcode [latest_posts] that displays the 5 most recent posts",
      "Add a REST API endpoint GET /wp-json/myapi/v1/featured-products",
      "Register a custom image size hero-banner at 1920x600px with crop",
      "Add an ACF Gutenberg block called Hero Block with a heading and background image field",
      "Register a primary and footer navigation menu",
      "Add a custom widget area named Sidebar Primary",
      "Generate a custom taxonomy called Project Category for the Portfolio CPT",
      "Add wp_enqueue_scripts to register a Google Fonts stylesheet",
    ],
  },
};

const INITIAL_PROMPT_COUNT = 6;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function prettifyTool(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();
}

/** Replace bare #rrggbb hex codes in a text string with swatch+code nodes. */
function processColorSwatches(text: string): React.ReactNode[] {
  const HEX = /#([0-9a-fA-F]{6})\b/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = HEX.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const hex = m[0];
    nodes.push(
      <span key={m.index} className="inline-flex items-center gap-1 align-middle">
        <span
          className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-black/20 dark:border-white/20"
          style={{ backgroundColor: hex }}
          aria-hidden="true"
        />
        <code className="rounded bg-black/10 px-1 text-[11px] dark:bg-white/10">{hex}</code>
      </span>
    );
    last = m.index + hex.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Recursively process children, injecting color swatches into string nodes. */
function injectSwatches(children: React.ReactNode): React.ReactNode {
  if (typeof children === "string") {
    const nodes = processColorSwatches(children);
    return nodes.length === 1 && typeof nodes[0] === "string" ? nodes[0] : nodes;
  }
  if (Array.isArray(children)) {
    return (children as React.ReactNode[]).map((child, i) => {
      const result = injectSwatches(child);
      if (result !== child) return <span key={i}>{result}</span>;
      return child;
    });
  }
  return children;
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    });
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className={cn(
        "rounded p-0.5 transition-colors",
        "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Code block renderer ──────────────────────────────────────────────────────

function SaveArtifactButton({
  content,
  lang,
  title,
}: {
  content: string;
  lang: string;
  title: string;
}) {
  const { onSaveArtifact } = useContext(ChatPanelCtx);
  const [saved, setSaved] = useState(false);

  if (!onSaveArtifact) return null;

  return (
    <button
      type="button"
      aria-label="Save as artifact"
      title="Save as artifact"
      onClick={() => {
        onSaveArtifact(content, lang, title);
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
        }, 1500);
      }}
      className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
    >
      {saved ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Save className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const match = /language-(\w+)/.exec(className);
  const lang = match?.[1] ?? "";
  const raw = (typeof children === "string" ? children : "").replace(/\n$/, "");

  // Mermaid — render as diagram
  if (lang === "mermaid") {
    return (
      <div className="my-2 overflow-hidden rounded-md border">
        <div className="bg-muted/40 flex items-center gap-2 border-b px-3 py-1">
          <span className="text-muted-foreground font-mono text-[10px]">mermaid</span>
          <div className="ml-auto flex items-center gap-1">
            <SaveArtifactButton content={raw} lang="mermaid" title="Mermaid Diagram" />
            <CopyButton text={raw} />
          </div>
        </div>
        <div className="p-3">
          <MermaidDiagram chart={raw} />
        </div>
      </div>
    );
  }

  // Fenced block — styled with language badge + copy + save
  if (className) {
    return (
      <div className="my-2 overflow-hidden rounded-md border">
        <div className="bg-muted/40 flex items-center gap-2 border-b px-3 py-1">
          {lang && <span className="text-muted-foreground font-mono text-[10px]">{lang}</span>}
          <div className="ml-auto flex items-center gap-1">
            <SaveArtifactButton
              content={raw}
              lang={lang}
              title={lang ? `${lang} snippet` : "Code"}
            />
            <CopyButton text={raw} />
          </div>
        </div>
        <pre className="overflow-auto p-3 text-xs leading-relaxed">
          <code>{children}</code>
        </pre>
      </div>
    );
  }

  // Inline code
  return (
    <code className="rounded bg-black/10 px-1 font-mono text-xs dark:bg-white/10">{children}</code>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  msg: ChatMessage;
  isPinned: boolean;
  onPin: (msg: ChatMessage) => void;
  onUnpin: (id: string) => void;
}

function MessageBubble({ msg, isPinned, onPin, onUnpin }: MessageBubbleProps) {
  const isUser = msg.role === "user";

  return (
    <div className={cn("group flex flex-col gap-0.5", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "relative max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          isPinned && "ring-primary/40 ring-1"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-1 last:mb-0">{injectSwatches(children)}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => <ul className="mb-1 list-disc pl-4">{children}</ul>,
              ol: ({ children }) => <ol className="mb-1 list-decimal pl-4">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:opacity-80"
                >
                  {children}
                </a>
              ),
              code: ({ className: cls, children: ch }) => (
                <CodeBlock className={cls ?? ""}>{ch}</CodeBlock>
              ),
              pre: ({ children }) => <>{children}</>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-current pl-3 italic opacity-70">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-2 border-current opacity-20" />,
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}

        {/* Action buttons — appear on hover */}
        <div
          className={cn(
            "absolute -top-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100",
            isUser ? "left-2" : "right-2"
          )}
        >
          {/* Pin / Unpin */}
          <button
            type="button"
            aria-label={isPinned ? "Unpin message" : "Pin message to memory"}
            title={isPinned ? "Unpin from memory" : "Pin to memory"}
            onClick={() => {
              if (isPinned) {
                onUnpin(msg.id);
              } else {
                onPin(msg);
              }
            }}
            className="bg-background rounded-sm border p-0.5 shadow-sm transition-colors"
          >
            {isPinned ? (
              <PinOff className="text-primary h-3.5 w-3.5" />
            ) : (
              <Pin className="text-muted-foreground hover:text-foreground h-3.5 w-3.5" />
            )}
          </button>
          <CopyButton
            text={msg.content}
            className="bg-background rounded-sm border p-0.5 shadow-sm"
          />
        </div>
      </div>

      {/* Timestamp + pin indicator */}
      <div className={cn("flex items-center gap-1 px-1", isUser ? "flex-row-reverse" : "flex-row")}>
        <span className="text-muted-foreground text-[10px]">{formatTimestamp(msg.timestamp)}</span>
        {isPinned && (
          <span className="text-primary flex items-center gap-0.5 text-[10px]">
            <Pin className="h-2.5 w-2.5" />
            pinned
          </span>
        )}
      </div>
    </div>
  );
}

// ─── ThinkingIndicator ────────────────────────────────────────────────────────

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

function ThinkingIndicator({
  status,
  activeToolCall,
}: {
  status: AgentStatus;
  activeToolCall: string | null;
}) {
  const phase = getPhase(status, activeToolCall);
  const { label, color, dotColor } = PHASE_CONFIG[phase];

  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const phaseKey = phase + (activeToolCall ?? "");

  // Phase timer — resets on phase change
  useEffect(() => {
    setPhaseElapsed(0);
    const id = setInterval(() => {
      setPhaseElapsed((s) => s + 1);
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [phaseKey]);

  // Total timer — runs from component mount (= when loading starts)
  useEffect(() => {
    setTotalElapsed(0);
    const id = setInterval(() => {
      setTotalElapsed((s) => s + 1);
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);

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
        <span className="text-muted-foreground ml-auto font-mono text-[10px]">
          {String(phaseElapsed)}s
          {totalElapsed !== phaseElapsed ? ` / ${String(totalElapsed)}s total` : ""}
        </span>
      </div>
    </div>
  );
}

// ─── EmptyState with search + shuffle + show more ─────────────────────────────

function EmptyState({
  mode,
  onPrompt,
}: {
  mode: BuilderMode | undefined;
  onPrompt: (text: string) => void;
}) {
  const hints = mode ? HINTS[mode] : null;
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");

  // Shuffle once per mode change
  const shuffled = useMemo(
    () => (hints ? [...hints.prompts].sort(() => Math.random() - 0.5) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode]
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return shuffled;
    const q = query.toLowerCase();
    return shuffled.filter((p) => p.toLowerCase().includes(q));
  }, [shuffled, query]);

  const displayed = showAll ? filtered : filtered.slice(0, INITIAL_PROMPT_COUNT);

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

      {/* Search filter */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowAll(false);
          }}
          placeholder="Filter prompts..."
          className={cn(
            "w-full rounded-md border bg-transparent py-1.5 pl-7 pr-3 text-xs",
            "placeholder:text-muted-foreground focus:ring-ring focus:outline-none focus:ring-1"
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {displayed.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">No matching prompts.</p>
        ) : (
          displayed.map((prompt) => (
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
          ))
        )}
      </div>

      {/* Show more / less toggle */}
      {filtered.length > INITIAL_PROMPT_COUNT && (
        <button
          type="button"
          onClick={() => {
            setShowAll((v) => !v);
          }}
          className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 text-xs transition-colors"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-3 w-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Show{" "}
              {String(filtered.length - INITIAL_PROMPT_COUNT)} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── TokenGaugeBar ────────────────────────────────────────────────────────────

function TokenGaugeBar({
  pct,
  isWarning,
  isCritical,
}: {
  pct: number;
  isWarning: boolean;
  isCritical: boolean;
}) {
  const barColor = isCritical ? "bg-destructive" : isWarning ? "bg-amber-500" : "bg-primary/40";
  const label = `${String(Math.round(pct * 100))}% context used`;

  return (
    <div className="flex items-center gap-1.5" title={label} aria-label={label}>
      <Zap
        className={cn(
          "h-3 w-3 shrink-0",
          isCritical ? "text-destructive" : isWarning ? "text-amber-500" : "text-muted-foreground"
        )}
      />
      <div className="bg-muted h-1 w-16 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${String(Math.round(pct * 100))}%` }}
        />
      </div>
    </div>
  );
}

// ─── BranchSelector ───────────────────────────────────────────────────────────

function BranchSelector({
  branches,
  activeBranchId,
  onFork,
  onSwitchBranch,
}: {
  branches: NonNullable<ChatPanelProps["branches"]>;
  activeBranchId: string;
  onFork: () => void;
  onSwitchBranch: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeBranch = branches.find((b) => b.id === activeBranchId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
        }}
        title="Conversation branches"
        aria-label="Conversation branches"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <GitBranch className="h-3.5 w-3.5" />
        <span className="max-w-[80px] truncate text-[10px]">{activeBranch?.label ?? "main"}</span>
      </button>

      {open && (
        <div className="bg-popover border-border absolute left-0 top-6 z-50 min-w-[180px] rounded-md border shadow-md">
          <div className="border-b px-2 py-1.5">
            <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Branches
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onSwitchBranch(b.id);
                  setOpen(false);
                }}
                className={cn(
                  "hover:bg-muted w-full px-3 py-1.5 text-left text-xs transition-colors",
                  b.id === activeBranchId && "text-primary font-semibold"
                )}
              >
                {b.id === activeBranchId ? "● " : "○ "}
                {b.label}
              </button>
            ))}
          </div>
          <div className="border-t px-2 py-1.5">
            <button
              type="button"
              onClick={() => {
                onFork();
                setOpen(false);
              }}
              className="text-primary hover:text-primary/80 flex w-full items-center gap-1.5 text-xs transition-colors"
            >
              <GitFork className="h-3 w-3" />
              Fork conversation
            </button>
          </div>
        </div>
      )}
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
  onStop,
  onRequestSummary,
  branches,
  activeBranchId,
  onFork,
  onSwitchBranch,
  pinnedIds,
  onPin,
  onUnpin,
  onSaveArtifact,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Feature 1 — token gauge
  const gauge = useTokenGauge(messages);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${String(Math.min(el.scrollHeight, 160))}px`;
  }, [input]);

  // Cmd/Ctrl+Enter to submit; Enter for newline
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!isLoading && input.trim()) onSubmit();
    }
  }

  function handleHintClick(prompt: string) {
    onInputChange(prompt);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  // Export conversation as markdown
  function handleExport() {
    const ts = new Date().toLocaleString();
    const md = [
      `# Chat Export — ${ts}`,
      "",
      ...messages.map((m) =>
        [
          `**${m.role === "user" ? "You" : "Assistant"}** · ${formatTimestamp(m.timestamp)}`,
          "",
          m.content,
          "",
          "---",
          "",
        ].join("\n")
      ),
    ].join("\n");

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${Date.now().toString()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handlePin = useCallback(
    (msg: ChatMessage) => {
      onPin?.(msg);
    },
    [onPin]
  );

  const handleUnpin = useCallback(
    (id: string) => {
      onUnpin?.(id);
    },
    [onUnpin]
  );

  const hasBranches = branches && branches.length > 0 && onFork && onSwitchBranch;

  return (
    <ChatPanelCtx.Provider value={{ onSaveArtifact }}>
      <div className="flex h-full flex-col">
        {messages.length > 0 && (
          <div className="flex items-center gap-2 border-b px-3 py-1">
            {/* Feature 2 — Branch selector */}
            {hasBranches && activeBranchId !== undefined && (
              <BranchSelector
                branches={branches}
                activeBranchId={activeBranchId}
                onFork={onFork}
                onSwitchBranch={onSwitchBranch}
              />
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Feature 1 — Token gauge */}
              {messages.length > 0 && (
                <TokenGaugeBar
                  pct={gauge.pct}
                  isWarning={gauge.isWarning}
                  isCritical={gauge.isCritical}
                />
              )}

              <button
                onClick={handleExport}
                title="Export conversation"
                aria-label="Export conversation as markdown"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
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
          </div>
        )}

        {/* Feature 1 — Critical context warning banner */}
        {gauge.isCritical && messages.length > 0 && (
          <div className="border-destructive/30 bg-destructive/5 flex items-center gap-2 border-b px-3 py-1.5">
            <AlertTriangle className="text-destructive h-3.5 w-3.5 shrink-0" />
            <p className="text-destructive flex-1 text-[11px]">
              Context window {String(Math.round(gauge.pct * 100))}% full — responses may be
              truncated.
            </p>
            {onRequestSummary && (
              <button
                type="button"
                onClick={onRequestSummary}
                className="text-destructive hover:text-destructive/80 shrink-0 text-[11px] font-medium underline underline-offset-2 transition-colors"
              >
                Compress history
              </button>
            )}
          </div>
        )}

        <ScrollArea className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <EmptyState mode={mode} onPrompt={handleHintClick} />
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isPinned={pinnedIds?.has(msg.id) ?? false}
                  onPin={handlePin}
                  onUnpin={handleUnpin}
                />
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
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                onInputChange(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask the agent… (⌘↵ to send)"
              disabled={isLoading}
              rows={1}
              className={cn(
                "flex-1 resize-none overflow-hidden rounded-md border bg-transparent px-3 py-2 text-sm",
                "placeholder:text-muted-foreground focus:ring-ring focus:outline-none focus:ring-1",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "max-h-40 min-h-[38px]"
              )}
            />

            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                title="Stop generation"
                aria-label="Stop generation"
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "bg-destructive/10 text-destructive hover:bg-destructive/20",
                  "border-destructive/30 border"
                )}
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                Send
              </button>
            )}
          </form>

          <p className="text-muted-foreground mt-1.5 text-right text-[10px]">
            ⌘↵ to send · Enter for newline
          </p>
        </div>
      </div>
    </ChatPanelCtx.Provider>
  );
}
