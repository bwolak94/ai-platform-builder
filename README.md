# AI Platform Builder

> An AI-powered, multi-module web platform where natural language drives live mutations on structured state.
> Pattern: **Agent → Client-Side Tools → Eval Harness → Improvement Loop** (AI Engineering Fundamentals, Scott Moss)

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-61dafb?logo=react&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20DO-f38020?logo=cloudflare&logoColor=white)
![Claude](https://img.shields.io/badge/Claude-Sonnet%204.6-6b21a8)
![Vercel AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-4.x-black?logo=vercel&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4.x-3068b7)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.x-06b6d4?logo=tailwindcss&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-workspaces-f69220?logo=pnpm&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-2.x-EF4444)
![Tests](https://img.shields.io/badge/tests-161%20passing-22c55e)

---

## Table of Contents

- [Overview](#overview)
- [Implementation Status](#implementation-status)
- [System Architecture](#system-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Key Design Patterns](#key-design-patterns)
- [Monorepo Structure](#monorepo-structure)
- [Technology Stack](#technology-stack)
- [Module Reference](#module-reference)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Architecture Decision Record](#architecture-decision-record)

---

## Overview

AI Platform Builder is a browser-based developer tool where users describe what they want in plain English and an AI agent performs live mutations on structured state. The agent runs on **Cloudflare Durable Objects** (one persistent session per user), streams responses back over **WebSocket**, and delegates all state mutations to **client-side tools** that execute directly in the browser. Results are rendered instantly in sandboxed iframe previews.

The platform implements 8 independent builder modules — each a complete vertical slice from Zod schema → compact DSL → React UI → agent tools → live preview.

```
User types a prompt
      │
      ▼
 Chat Panel (useAgentChat — Vercel AI SDK + @cloudflare/ai-chat)
      │  WebSocket (hibernation API — DO persists between WS frames)
      ▼
 BuilderAgent Durable Object
      ├── retrieves relevant docs from Upstash Vector (RAG)
      ├── builds system prompt: mode context + DSL + RAG
      ├── calls streamText(claude-sonnet-4-6, tools, maxSteps:10)
      └── emits tool_call event (no server execute — client-side only)
            │
            ▼
 onToolCall handler in browser
      ├── Zod.safeParse(args)        — validates at boundary
      ├── setSpec(prev => ...)       — React state mutation
      ├── → React re-render          — instant UI update
      └── → iframe.srcDoc = ...     — live preview refresh
            │
            ▼
 addToolResult(result) sent back → agent continues stream
```

---

## Implementation Status

| Module                         | Schema | DSL | React UI | Tests | Worker Tools | Worker Prompt |
| ------------------------------ | :----: | :-: | :------: | :---: | :----------: | :-----------: |
| **Form Builder**               |   ✅   | ✅  |    ✅    |  ✅   |      ✅      |      ✅       |
| **Layout Builder**             |   ✅   | ✅  |    ✅    |  ✅   |      ✅      |      ✅       |
| **API Schema Builder**         |   ✅   | ✅  |    ✅    |  ✅   |      ✅      |      ✅       |
| **Email Template Builder**     |   ✅   | ✅  |    ✅    |  🔲   |      ✅      |      ✅       |
| DB Schema Builder              |   ✅   | ✅  |    🔲    |  🔲   |      ✅      |      ✅       |
| Component Story Builder        |   ✅   | ✅  |    🔲    |  🔲   |      ✅      |      ✅       |
| i18n Manager                   |   ✅   | ✅  |    🔲    |  🔲   |      ✅      |      ✅       |
| E2E Test Generator             |   ✅   | ✅  |    🔲    |  🔲   |      ✅      |      ✅       |
| **App Shell / Chat / Routing** |   —    |  —  |    ✅    |  ✅   |      —       |       —       |
| **Eval Harness**               |   —    |  —  |    —     |   —   |      🔲      |       —       |

✅ Complete · 🔲 Planned

**Backend fully scaffolded**: all 8 modules have worker tools + system prompts deployed and routing in `BuilderAgent`.

---

## System Architecture

### High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         Browser  (React 19 + Vite 5)                             │
│                                                                                  │
│  ┌─────────────────┐   ┌────────────────────────────┐   ┌───────────────────┐   │
│  │   Chat Panel    │   │      Builder Panel          │   │   Preview Panel   │   │
│  │                 │   │                             │   │                   │   │
│  │  useAgentChat   │   │  ModeSwitcher (8 modes)     │   │  <iframe          │   │
│  │  ThinkingPhase  │   │  FormBuilderPanel      ✅   │   │   sandbox=        │   │
│  │  ToolCallStatus │   │  LayoutBuilderPanel    ✅   │   │   "allow-scripts" │   │
│  │  ScrollArea     │   │  ApiSchemaBuilderPanel ✅   │   │   NO same-origin  │   │
│  │                 │   │  EmailBuilderPanel     ✅   │   │                   │   │
│  └────────┬────────┘   │  (+ 4 scaffolded)          │   │  Tailwind CDN     │   │
│           │ WebSocket  └──────────────┬──────────────┘   │  Live render      │   │
│           │ (WS hib.)                │ ToolDispatch      └───────────────────┘   │
└───────────┼──────────────────────────┼──────────────────────────────────────────┘
            │                          │
┌───────────┼──────────────────────────┼──────── Cloudflare Edge ──────────────────┐
│           ▼                          │                                            │
│  ┌────────────────────────────────┐  │  ┌──────────────────────────────────────┐ │
│  │   BuilderAgent (Durable Object)│◄─┘  │  Wrangler Secrets                    │ │
│  │                                │     │  ANTHROPIC_API_KEY (primary)          │ │
│  │  • AIChatAgent extends DO      │     │  OPENAI_API_KEY   (fallback)          │ │
│  │  • mode: BuilderMode           │     │  UPSTASH_URL / UPSTASH_TOKEN          │ │
│  │  • context: DSL string         │     │  BRAINTRUST_API_KEY                   │ │
│  │  • streamText → claude/gpt-4o  │     └──────────────────────────────────────┘ │
│  │  • maxSteps: 10 (agentic)      │                                              │
│  │  • sliding window: 20 msgs     │                                              │
│  │  • WS hibernation API          │                                              │
│  └────────────────┬───────────────┘                                              │
└───────────────────┼──────────────────────────────────────────────────────────────┘
                    │
┌───────────────────┼───────────────────── External Services ──────────────────────┐
│                   │                                                               │
│   ┌───────────────▼──┐   ┌──────────────────┐   ┌────────────────────────────┐  │
│   │  Anthropic        │   │  Upstash Vector  │   │  Braintrust                │  │
│   │  claude-sonnet-4-6│   │  RAG corpus      │   │  Eval experiments          │  │
│   │  (primary)        │   │  1536-dim index  │   │  Trace logging             │  │
│   │  GPT-4o (fallback)│   │  HTTP REST API   │   │  Prompt versioning         │  │
│   └───────────────────┘   └──────────────────┘   └────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Agent Communication Protocol

Every message from the browser to the DO carries a typed discriminated union parsed by Zod:

```
Browser → WebSocket → BuilderAgent.onMessage()
                            │
                ┌───────────┼───────────────┐
                ▼           ▼               ▼
         set_mode      update_context   chat message
         ─────────     ──────────────   ────────────
         this.mode =   this.context =   super.onMessage()
         data.mode     { ...data.ctx }  → onChatMessage()
```

```typescript
// Zod-parsed on every incoming WebSocket frame
const IncomingMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("set_mode"), mode: BuilderModeSchema }),
  z.object({ type: z.literal("update_context"), context: ContextSchema }),
  // all other frames → AIChatAgent base class handler
]);
```

### Tool Dispatch Flow

```
streamText emits tool_call
        │
        ▼ (WebSocket frame to browser)
useBuilderAgent.onToolCall(call: ToolCall)
        │
        ├── setActiveToolCall(call.toolName)   ← triggers ThinkingIndicator "Applying" phase
        │
        ▼
dispatchRef.current(call)                      ← stable ref, no re-renders on register
        │
        ▼
<ActiveModulePanel>.handleToolCall(call)
        │
        ├── tools[call.toolName](call.args)    ← Zod-validated at this boundary
        │        │
        │        ├── ApiEndpointSchema.safeParse(args)
        │        ├── setSpec(prev => ...)       ← React state mutation
        │        └── return { success, ... }   ← or { error }
        │
        ▼
addToolResult(result)                          ← sent back to DO via WebSocket
setActiveToolCall(null)                        ← triggers ThinkingIndicator "Responding" phase
```

### Package Dependency Graph

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          packages/schemas                                     │
│                                                                              │
│  FormFieldSchema         LayoutNodeSchema (z.lazy — recursive)               │
│  ApiEndpointSchema       OpenApiSpecSchema                                   │
│  EmailSectionSchema      DbTableSchema                                       │
│  i18nKeySchema           StorySchema · E2eTestSchema                         │
│                                                                              │
│  All types derived via z.infer<> — runtime + compile-time parity            │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │ workspace:*
               ┌───────────────┴──────────────────┐
               ▼                                  ▼
┌─────────────────────────┐         ┌─────────────────────────────────────┐
│  packages/serializers   │         │         apps/worker                  │
│                         │         │                                     │
│  form-dsl.ts            │         │  BuilderAgent (Durable Object)      │
│  layout-dsl.ts          │         │  ├── prompts/ (8 system prompts)    │
│  api-dsl.ts             │         │  ├── tools/  (8 tool sets)          │
│  email-dsl.ts           │         │  ├── rag/    (Upstash retrieval)    │
│  db-dsl.ts              │         │  └── observability.ts (Braintrust)  │
│  i18n-dsl.ts            │         └─────────────────────────────────────┘
│  stories-dsl.ts         │
│  e2e-dsl.ts             │
│                         │
│  Tree utilities:        │
│  findNode  insertNode   │
│  removeNode moveNode    │
│  updateNodeClasses      │
│  applyThemeToTree       │
└───────────┬─────────────┘
            │ workspace:*
            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                             apps/web                                          │
│                                                                              │
│  modules/form-builder/          modules/layout-builder/                      │
│  modules/api-schema-builder/    modules/email-template-builder/              │
│  modules/db-schema-builder/     modules/component-story-builder/             │
│  modules/i18n-manager/          modules/e2e-test-generator/                  │
│                                                                              │
│  routes/ (TanStack Router — file-based, type-safe)                           │
│  context/ (React Context — per-module state isolation)                       │
│  hooks/   (useBuilderAgent · useMode)                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Hierarchy

```
<AppProviders>                           ← ModeProvider, ToolDispatchProvider,
      │                                     FormBuilderProvider, LayoutBuilderProvider,
      │                                     EmailBuilderProvider, ApiBuilderProvider
      └── <RouterProvider>
              └── <AppShell>             ← ResizablePanelGroup (3 panels)
                    ├── <ChatPanel>
                    │     ├── message list (ReactMarkdown for assistant)
                    │     ├── <ThinkingIndicator>    (Thinking / Applying / Responding)
                    │     └── <ToolCallStatus>       (active tool name below input)
                    │
                    ├── <Outlet>         ← TanStack Router file-based
                    │     ├── /form    → <FormBuilderPanel>
                    │     ├── /layout  → <LayoutBuilderPanel>
                    │     ├── /api     → <ApiSchemaBuilderPanel>
                    │     ├── /email   → <EmailBuilderPanel>
                    │     └── /db, /story, /i18n, /e2e → scaffolded panels
                    │
                    └── <PreviewFrame>   ← sandboxed <iframe> (when path is /form|/layout|/email|/api)
```

### State Management Architecture

No global state library. Each module owns its state via an isolated React Context + custom hooks. The contexts are composed at the root and never cross module boundaries.

```
┌──────────────────── React Context Tree ────────────────────────────────────────┐
│                                                                                 │
│  ModeContext            — current BuilderMode ("form"|"layout"|"api"|...)      │
│  ToolDispatchContext    — { dispatchRef, register }  (single mutable ref)      │
│                                                                                 │
│  FormBuilderContext     — { formSchema, setFormSchema }                         │
│  LayoutBuilderContext   — { layoutTree, setLayoutTree }                         │
│  EmailBuilderContext    — { template, setTemplate, clientMode }                 │
│                                                                                 │
│  (API Builder state lives locally in ApiSchemaBuilderPanel via useApiState)    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Each builder module follows the same hook composition pattern:

```
useApiState()                            ← state + localStorage + undo/redo/reset
      │  { spec, setSpec, undo, redo, canUndo, canRedo, resetSpec }
      │
      ▼
useApiTools(spec, setSpec)               ← pure tool handlers, no side-effects besides setSpec
      │  { addEndpoint, removeEndpoint, updateEndpoint, ... }
      │
      ▼
useApiSnapshots()                        ← named snapshots in localStorage (max 5)
      │  { snapshots, saveSnapshot, deleteSnapshot }
      │
      ▼
<ApiSchemaBuilderPanel>                  ← composes all hooks, registers tool dispatch
      └── useRegisterToolDispatch(handleToolCall)
```

### Undo / Redo Architecture

Implemented with past/future arrays — O(1) push, O(1) pop, capped at `MAX_HISTORY = 50`:

```
State:
  present:  OpenApiSpec        ← current value
  past:     OpenApiSpec[]      ← undo stack  (newest at end)
  future:   OpenApiSpec[]      ← redo stack  (newest at start)

setSpec(next):
  past = [...past.slice(-49), present]
  future = []
  present = next
  localStorage.setItem(key, JSON.stringify(next))

undo():
  previous = past.at(-1)
  future = [present, ...future]
  past = past.slice(0, -1)
  present = previous

redo():
  next = future.at(0)
  past = [...past, present]
  future = future.slice(1)
  present = next
```

### Tool Dispatch Registration

A single mutable `dispatchRef` is shared via Context. Each module panel registers itself on mount. No stale closures — the ref always points to the current module's handler:

```typescript
// Context: dispatchRef is a plain object (not React ref) so it can live in context
interface ToolDispatchContextValue {
  dispatchRef: { current: ToolDispatcher };
  register: (fn: ToolDispatcher) => void; // useCallback — stable identity
}

// Each module panel:
function useRegisterToolDispatch(fn: ToolDispatcher): void {
  const { register } = useToolDispatch();
  const fnRef = useRef<ToolDispatcher>(fn);
  fnRef.current = fn; // always up-to-date, no re-render

  useEffect(() => {
    register((call) => fnRef.current(call)); // stable wrapper; fnRef.current is live
  }, [register]); // runs once on mount — overwrites previous
}
```

Route navigation automatically rotates the active dispatcher: when `/form` unmounts and `/api` mounts, `ApiSchemaBuilderPanel` registers its handler, overwriting the form builder's.

### Chat UX — Thinking Phase Indicator

The agent goes through distinct phases during a response. The `ThinkingIndicator` reflects each phase with animated color-coded feedback and an elapsed timer:

```
Status from useAgentChat     activeToolCall     Phase         Color
────────────────────────     ──────────────     ──────────    ──────
"submitted"                  null               Thinking      amber
"streaming"                  "addEndpoint"      Applying      blue
"streaming"                  null               Responding    green
"idle" / "error"             any                (hidden)
```

The timer resets on every phase transition using a stable `phaseKey = phase + (activeToolCall ?? "")` dependency.

---

## Backend Architecture

### Durable Object Lifecycle

```
Browser opens /agents/<mode>/<userId>
        │
        ▼
Cloudflare routes to BuilderAgent DO (id = userId)
        │
        ├── First request: DO cold-starts, initializes AIChatAgent base
        │
        ├── WebSocket upgrade (hibernation API)
        │     DO persists across WS frames without a running isolate
        │     CPU billed only during active message processing
        │
        ├── onMessage() — custom handler, runs before AIChatAgent
        │     ├── set_mode    → this.mode  (updated in memory)
        │     └── update_context → this.context (DSL injected into system prompt)
        │
        └── onChatMessage() — called by AIChatAgent per chat message
              ├── derive mode from DO room name (identity = reliable)
              ├── buildSystemPrompt(mode, context)
              ├── getToolsForMode(mode)       ← tool schemas only, no execute()
              ├── buildRetrieveDocsTool(...)  ← only server-side tool
              └── streamText(model, { system, tools, messages, maxSteps: 10 })
```

### Model Selection Strategy

```typescript
// Prefer Claude when key is available; graceful fallback to GPT-4o
const model = env.ANTHROPIC_API_KEY
  ? createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })("claude-sonnet-4-6")
  : createOpenAI({ apiKey: env.OPENAI_API_KEY })("gpt-4o");
```

### Tool Architecture — Client-Side Execution

All builder tools have **no `execute` function**. They are schema-only definitions. The agent emits `tool_call` events; the browser executes them and sends back results. This is the core architectural decision: zero-latency preview updates with no round-trip serialization.

```typescript
// Worker defines tool shape only:
export const addEndpointTool = tool({
  description: "Add a new endpoint to the OpenAPI spec",
  parameters: z.object({
    id: z.string(),
    method: HttpMethodSchema,
    path: z.string(),
    responses: z.array(ApiResponseSchema),
    // ... all nullable with .default(null) so agent can omit them
  }),
  // NO execute() — client handles it
});

// Browser executes:
addEndpoint: (args: unknown): Promise<ToolResult> => {
  const parsed = ApiEndpointSchema.safeParse(args);
  if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
  setSpec((prev) => ({ ...prev, endpoints: [...prev.endpoints, parsed.data] }));
  return Promise.resolve({ success: true, endpointId: parsed.data.id });
};
```

### Zod Validation Boundary Design

A critical detail: agent-omitted optional fields must not fail validation. The schema uses `.nullable().default(null)` — not just `.nullable()` (which requires the field to be present):

```typescript
// WRONG — agent omits summary → Zod error "Required"
summary: z.string().nullable();

// CORRECT — agent omits summary → coerces to null
summary: z.string().nullable().default(null);
```

This applies at every tool boundary where the LLM is the data producer.

---

## Key Design Patterns

### 1. Compact DSL — Token-Efficient Context

Each module serializes its state into a hand-crafted compact DSL. This is injected into every system prompt so the agent always sees the current state without the token cost of raw JSON.

**API DSL example:**

```
API: Product API v1.0.0 | baseUrl:https://api.example.com | auth:BearerJWT

TAGS: products(Product catalog), orders(Order management)

GET     /products          → 200:Product[], 500:ServerError                    # List products
POST    /products          → 201:Product, 400:ValidationError  [body:CreateProductInput] [auth]  # Create product
GET     /products/{id}     → 200:Product, 404:NotFound, 500:ServerError  [path:id]
PUT     /products/{id}     → 200:Product, 404:NotFound  [body:UpdateProductInput] [path:id] [auth]
DELETE  /products/{id}     → 204:NoContent, 404:NotFound  [path:id] [auth] [tags:products]

SCHEMA Product
  id!: string
  name!: string
  price!: number
  category: string
  createdAt!: string
```

**Email DSL example:**

```
EMAIL: Welcome Campaign | subject:Welcome to {{company}}!
header | bg:#1a1a2e
  logo | src:{{logoUrl}} | alt:Logo | width:120
  hero | headline:Welcome, {{firstName}}! | sub:You're in. | bg:#1a1a2e
text | Let's get you set up quickly.
button | label:Get Started | href:{{ctaUrl}} | bg:#6366f1
footer | company:{{company}} | year:2026
```

**Token comparison:**

| Module               | Raw JSON      | DSL         | Reduction |
| -------------------- | ------------- | ----------- | :-------: |
| Form — 10 fields     | ~2 000 tokens | ~200 tokens |  **90%**  |
| Layout — 20 nodes    | ~3 000 tokens | ~400 tokens |  **87%**  |
| API Spec — 15 routes | ~4 000 tokens | ~600 tokens |  **85%**  |
| Email — 8 sections   | ~1 500 tokens | ~150 tokens |  **90%**  |

### 2. Zod as Single Source of Truth

One schema definition drives the entire data pipeline:

```
packages/schemas/src/api.ts
         │
         ├─► TypeScript type        type ApiEndpoint = z.infer<typeof ApiEndpointSchema>
         ├─► Tool parameter def     parameters: ApiEndpointSchema (passed to streamText)
         ├─► Runtime guard          ApiEndpointSchema.safeParse(toolArgs)
         ├─► API Linter input       lintApiSpec(spec: OpenApiSpec)
         └─► Export schema          JSON Schema download / OpenAPI 3.1 generation
```

### 3. Iframe Security Model

```
Parent (React app)                      Sandboxed iframe
        │                                       │
        │  iframe.srcDoc = generateHTML(tree)   │
        │──────────────────────────────────────►│
        │                                       │  Scripts execute here
        │                                       │  Tailwind CDN injects styles
        │                                       │  Cannot read parent DOM
        │  sandbox="allow-scripts"              │  Cannot access parent cookies
        │  (NO allow-same-origin)               │  Cannot read parent localStorage
        │                                       │  Cannot make credentialed fetch
```

### 4. API Linter — Pure Function Quality Gate

The API Schema Builder includes a built-in linter (`lintApiSpec`) that runs on every render. 8 rules, three severity levels:

```
Rule                                      Level    Example trigger
─────────────────────────────────────     ───────  ──────────────────────────────────
Duplicate method+path                     error    GET /users defined twice
GET by-ID without 404 response            warning  GET /users/{id} → 200 only
Non-kebab-case path segment               warning  /userOrders (should be /user-orders)
Missing summary                           warning  endpoint has no summary field
POST/PUT/PATCH without requestBody        info     POST /users with no body
Mutating endpoint without auth            info     DELETE /items, no requiresAuth
No 5xx response defined                   info     endpoint missing 500/502/503
Tag used but not defined in spec          warning  tags:["products"] but no tagDefinition
```

Health score = `100 - (errors × 20) - (warnings × 5) - (infos × 1)`, clamped 0–100.

### 5. Eval → Improvement Loop

```
┌─────────────────┐     ┌───────────────────┐     ┌───────────────────────┐
│  Run eval suite │────►│  Braintrust UI    │────►│  Identify regression  │
│  vitest +       │     │  compare runs     │     │  "agent sends wrong   │
│  scorers        │     │  inspect traces   │     │   field IDs"          │
└─────────────────┘     └───────────────────┘     └──────────┬────────────┘
         ▲                                                    │
         │                                                    ▼
┌────────┴────────┐     ┌───────────────────┐     ┌───────────────────────┐
│  Rerun + verify │◄────│  Commit: schema + │◄────│  Fix: schema default, │
│  score improved │     │  prompt + test    │     │  prompt wording, or   │
└─────────────────┘     └───────────────────┘     │  tool handler logic   │
                                                   └───────────────────────┘
```

---

## Monorepo Structure

```
ai-platform-builder/
│
├── apps/
│   ├── web/                               # React 19 + Vite 5 frontend
│   │   └── src/
│   │       ├── routes/                    # TanStack Router (file-based, fully typed)
│   │       │   ├── __root.tsx             # AppShell: ResizablePanels + agent init
│   │       │   ├── index.tsx              # Redirect → /form
│   │       │   ├── form/index.tsx         # ✅ Form Builder page
│   │       │   ├── layout/index.tsx       # ✅ Layout Builder page
│   │       │   ├── api/index.tsx          # ✅ API Schema Builder page
│   │       │   ├── email/index.tsx        # ✅ Email Template Builder page
│   │       │   ├── db/index.tsx           # DB Schema Builder (scaffolded)
│   │       │   ├── story/index.tsx        # Component Story Builder (scaffolded)
│   │       │   ├── i18n/index.tsx         # i18n Manager (scaffolded)
│   │       │   ├── e2e/index.tsx          # E2E Test Generator (scaffolded)
│   │       │   └── -components/           # Route-private shared components
│   │       │       ├── ChatPanel/         # ✅ Streaming chat + ThinkingIndicator
│   │       │       ├── ModeSwitcher/      # ✅ 8-mode tab navigation
│   │       │       ├── PreviewFrame/      # ✅ Sandboxed iframe wrapper
│   │       │       └── ToolCallStatus/    # ✅ Active tool name display
│   │       │
│   │       ├── modules/
│   │       │   ├── form-builder/          # ✅ Fully implemented
│   │       │   │   ├── hooks/
│   │       │   │   │   ├── useFormState.ts      # state + localStorage persist
│   │       │   │   │   └── useFormTools.ts      # 5 client tools (Zod-validated)
│   │       │   │   ├── FormBuilderPanel.tsx
│   │       │   │   ├── FieldList.tsx            # @dnd-kit drag-and-drop reorder
│   │       │   │   ├── FieldItem.tsx
│   │       │   │   ├── FieldEditor.tsx          # shadcn Sheet slide-over
│   │       │   │   ├── FormPreview.tsx          # sandboxed iframe HTML preview
│   │       │   │   └── ExportPanel.tsx          # JSON / React TSX / HTML
│   │       │   │
│   │       │   ├── layout-builder/        # ✅ Fully implemented
│   │       │   │   ├── hooks/
│   │       │   │   │   ├── useLayoutState.ts
│   │       │   │   │   ├── useSelectedNode.ts   # click-to-select tree node
│   │       │   │   │   └── useLayoutTools.ts    # 7 client tools
│   │       │   │   ├── LayoutBuilderPanel.tsx
│   │       │   │   ├── ComponentTree.tsx        # recursive expand/collapse tree
│   │       │   │   ├── TreeNode.tsx             # tag badge + class chip preview
│   │       │   │   ├── ClassEditor.tsx          # Tailwind class autocomplete
│   │       │   │   ├── LayoutPreview.tsx        # Tailwind CDN sandboxed iframe
│   │       │   │   └── ExportPanel.tsx          # HTML / JSX / JSON
│   │       │   │
│   │       │   ├── api-schema-builder/    # ✅ Fully implemented
│   │       │   │   ├── hooks/
│   │       │   │   │   ├── useApiState.ts       # state + undo/redo + localStorage
│   │       │   │   │   ├── useApiTools.ts       # 12 client tools
│   │       │   │   │   └── useApiSnapshots.ts   # named snapshots (max 5)
│   │       │   │   ├── ApiSchemaBuilderPanel.tsx
│   │       │   │   ├── EndpointList.tsx         # expandable endpoint cards
│   │       │   │   ├── SchemaList.tsx           # component schema viewer
│   │       │   │   ├── ApiInfoSection.tsx       # inline spec metadata editor
│   │       │   │   ├── LintPanel.tsx            # health score + issue list
│   │       │   │   ├── SnapshotsPanel.tsx       # save / restore / delete snapshots
│   │       │   │   ├── ExportPanel.tsx          # 7 export formats
│   │       │   │   ├── ApiPreview.tsx           # Swagger UI in iframe
│   │       │   │   └── lint.ts                  # pure lintApiSpec() + lintSummary()
│   │       │   │
│   │       │   └── email-template-builder/ # ✅ Fully implemented
│   │       │       ├── hooks/
│   │       │       │   └── useEmailTools.ts     # 8 client tools
│   │       │       ├── EmailBuilderPanel.tsx
│   │       │       ├── SectionList.tsx          # drag-reorder sections
│   │       │       ├── SectionEditor.tsx        # per-type inline editor
│   │       │       ├── PresetsPanel.tsx         # preset templates
│   │       │       ├── SpamChecker.tsx          # spam score analysis
│   │       │       └── ExportPanel.tsx          # HTML / DSL / JSON
│   │       │
│   │       ├── hooks/
│   │       │   ├── useBuilderAgent/       # ✅ WebSocket agent + tool dispatch hook
│   │       │   │   ├── useBuilderAgent.ts       # useAgentChat wrapper + activeToolCall state
│   │       │   │   └── useBuilderAgent.types.ts # AgentStatus · ChatMessage · ToolCall
│   │       │   └── useMode/               # ✅ Mode context hook
│   │       │
│   │       ├── context/
│   │       │   ├── toolDispatch/          # ✅ Single-ref tool router
│   │       │   ├── formBuilder/           # ✅ FormSchema context
│   │       │   ├── layoutBuilder/         # ✅ LayoutTree context
│   │       │   └── emailBuilder/          # ✅ EmailTemplate + clientMode context
│   │       │
│   │       ├── ui/                        # ✅ ErrorBoundary · EmptyState · ThemeToggle
│   │       ├── components/ui/             # shadcn/ui (new-york, neutral base)
│   │       ├── providers/AppProviders.tsx # Context composition root
│   │       └── utils/cn.ts               # clsx + tailwind-merge
│   │
│   └── worker/                            # ✅ Cloudflare Worker + Durable Object
│       └── src/
│           ├── agent.ts                   # BuilderAgent DO — mode routing + streamText
│           ├── types.ts                   # Env · BuilderMode · IncomingMessageSchema
│           ├── observability.ts           # Braintrust logger factory
│           ├── prompts/                   # ✅ 8 system prompts (one per mode)
│           │   ├── form-prompt.ts
│           │   ├── layout-prompt.ts
│           │   ├── api-prompt.ts          # REST conventions + schema naming guide
│           │   ├── email-prompt.ts
│           │   ├── db-prompt.ts
│           │   ├── story-prompt.ts
│           │   ├── i18n-prompt.ts
│           │   └── e2e-prompt.ts
│           ├── tools/                     # ✅ 8 tool sets (schema-only, no execute)
│           │   ├── form-tools.ts
│           │   ├── layout-tools.ts
│           │   ├── api-tools.ts           # 10 tools + querySpec + retrieveDocs
│           │   ├── email-tools.ts
│           │   ├── db-tools.ts
│           │   ├── story-tools.ts
│           │   ├── i18n-tools.ts
│           │   └── e2e-tools.ts
│           └── rag/
│               └── retrieve.ts            # buildRetrieveDocsTool (Upstash Vector)
│
├── packages/
│   ├── schemas/                           # ✅ Shared Zod schemas (single source of truth)
│   │   └── src/
│   │       ├── form.ts                    # 13 field types · 8 validation rules
│   │       ├── layout.ts                  # 16 node types (z.lazy recursive)
│   │       ├── api.ts                     # OpenApiSpec · ApiEndpoint · SecurityScheme
│   │       ├── email.ts                   # EmailTemplate · EmailSection (discriminated union)
│   │       ├── db.ts
│   │       ├── i18n.ts
│   │       ├── stories.ts
│   │       └── e2e.ts
│   │
│   ├── serializers/                       # ✅ DSL serializers + tree utilities
│   │   └── src/
│   │       ├── form-dsl.ts                # serialize · deserialize
│   │       ├── layout-dsl.ts             # serialize · deserialize · findNode · insertNode
│   │       │                             #             removeNode · moveNode · updateNodeClasses
│   │       │                             #             applyThemeToTree
│   │       ├── api-dsl.ts                # serialize · deserialize · generateOpenApiJson
│   │       │                             # generatePostmanCollection · generateTypeScriptSDK
│   │       │                             # generateCurlScript · generatePythonSDK
│   │       │                             # generateMockForEndpoint · analyzeSpam
│   │       ├── email-dsl.ts              # serialize · deserialize · buildPresetSections
│   │       ├── db-dsl.ts
│   │       ├── i18n-dsl.ts
│   │       ├── stories-dsl.ts
│   │       └── e2e-dsl.ts
│   │
│   └── types/                            # Shared TypeScript utility types
│
├── evals/                                # 🔲 Braintrust eval harness
│   ├── datasets/                         # Golden input/output pairs
│   └── scorers/                          # Code-based quality scorers
│
├── corpus/                               # RAG source documents
│   ├── tailwind/  forms/  api/  email/
│
├── docs/                                 # Architecture docs + task specs
│   ├── architecture.md
│   ├── architecture-flow.md
│   ├── database-flow.md
│   ├── technologies.md
│   └── tasks/  (TASK-001 … TASK-007)
│
├── .github/workflows/ci.yml             # lint → type-check → test → build
├── eslint.config.mjs                    # ESLint 9 flat config (typescript-eslint strict)
├── turbo.json                           # Turborepo pipeline (cached builds)
└── pnpm-workspace.yaml
```

---

## Technology Stack

### Frontend

| Concern       | Technology             | Version | Notes                                                          |
| ------------- | ---------------------- | ------- | -------------------------------------------------------------- |
| Framework     | React                  | 19.x    | Concurrent features, strict mode, no `use client` directives   |
| Build         | Vite                   | 5.x     | Fast HMR, native ESM, TanStack Router plugin                   |
| Language      | TypeScript             | 5.x     | `strict: true`, zero `any`, explicit return types everywhere   |
| Routing       | TanStack Router        | 1.x     | File-based, fully type-safe, auto-generated `routeTree.gen.ts` |
| Styling       | Tailwind CSS           | 4.x     | Utility-first — also the _output target_ of Layout Builder     |
| Components    | shadcn/ui              | latest  | new-york style, neutral base, copy-into-project pattern        |
| Layout panels | react-resizable-panels | —       | 3-panel: Chat / Builder / Preview with drag-to-resize          |
| Drag & drop   | @dnd-kit               | 6.x     | Form field and email section reorder                           |
| ID generation | nanoid                 | 5.x     | `ep_abc123`, `f_xyz789`, `sec_def456`                          |
| Markdown      | react-markdown         | —       | Renders agent text responses with code, lists, bold            |

### Backend & Agent

| Concern           | Technology          | Notes                                                         |
| ----------------- | ------------------- | ------------------------------------------------------------- |
| Runtime           | Cloudflare Workers  | V8 isolates, zero cold-start, globally distributed at edge    |
| Stateful sessions | Durable Objects     | One DO per user, WebSocket hibernation API (CPU = 0 at rest)  |
| Agent SDK         | @cloudflare/ai-chat | `AIChatAgent` base class, `useAgentChat` React hook           |
| AI SDK            | Vercel AI SDK 4.x   | `streamText`, `tool`, `convertToModelMessages`, `maxSteps`    |
| LLM (primary)     | Claude Sonnet 4.6   | Best tool-calling accuracy; used when `ANTHROPIC_API_KEY` set |
| LLM (fallback)    | OpenAI GPT-4o       | Fallback when only `OPENAI_API_KEY` is available              |
| Embeddings        | text-embedding-3    | 1536 dimensions, Upstash Vector indexing                      |

### Data & Validation

| Concern             | Technology     | Notes                                                           |
| ------------------- | -------------- | --------------------------------------------------------------- |
| Schema validation   | Zod 4.x        | Single source of truth — types + guards + tool params + exports |
| Vector DB           | Upstash Vector | Serverless, HTTP REST API (CF Workers compat — no raw TCP)      |
| Context compression | Custom DSL     | 85–90% token reduction vs raw JSON                              |
| Persistence         | localStorage   | Per-module state + named snapshots (up to 5)                    |
| Email delivery      | Resend API     | Send-test-email endpoint, proxied via Vite dev server           |

### Observability & Quality

| Concern    | Technology          | Notes                                                       |
| ---------- | ------------------- | ----------------------------------------------------------- |
| Evals      | Braintrust          | Experiments, trace logging, prompt versioning with git SHA  |
| Unit tests | Vitest 2.x          | jsdom env, @testing-library/react, 161 tests passing        |
| Linting    | ESLint 9            | Flat config, `typescript-eslint` strict, `--max-warnings=0` |
| Formatting | Prettier 3          | `prettier-plugin-tailwindcss` for consistent class ordering |
| Git hooks  | Husky + lint-staged | Pre-commit: ESLint + Prettier · Pre-push: `tsc --noEmit`    |
| Commits    | Commitlint          | Conventional commits enforced on every push                 |

### Infrastructure

| Concern        | Technology            | Notes                                      |
| -------------- | --------------------- | ------------------------------------------ |
| Monorepo       | pnpm workspaces       | `workspace:*` linking, single lockfile     |
| Build pipeline | Turborepo 2.x         | Cached builds, parallel tasks, dep-ordered |
| CI/CD          | GitHub Actions        | PR: lint → type-check → test → build       |
| Deployment     | Cloudflare Pages + DO | Automated on merge to `main`               |

---

## Module Reference

### Form Builder ✅

Generates and edits HTML forms from natural language. State is a typed `FormSchema` with a list of `FormField` objects validated against a Zod schema.

**Client tools:**

| Tool            | Args                       | Effect                              |
| --------------- | -------------------------- | ----------------------------------- |
| `addField`      | `{ field, afterFieldId? }` | Insert Zod-validated field          |
| `removeField`   | `{ fieldId }`              | Delete field by ID                  |
| `updateField`   | `{ fieldId, updates }`     | Partial field update (any property) |
| `reorderFields` | `{ orderedIds }`           | Reorder all fields by ID array      |
| `querySchema`   | —                          | Return compact DSL string           |

**Field types:** `text · email · password · number · tel · textarea · select · multiselect · checkbox · radio · date · file · hidden`

**Validation rules:** `required · minLength · maxLength · min · max · pattern · email · url`

**Exports:** JSON Schema · React TSX (react-hook-form) · Semantic HTML

---

### Layout Builder ✅

Builds page layouts as a typed `LayoutNode` tree. Each node carries Tailwind CSS classes. Rendered live in a sandboxed iframe via the Tailwind CDN. Tree mutations use pure utility functions from `@ai-builder/serializers`.

**Client tools:**

| Tool                 | Args                                                  | Effect                    |
| -------------------- | ----------------------------------------------------- | ------------------------- |
| `addComponent`       | `{ node, parentId?, afterSiblingId? }`                | Insert Zod-validated node |
| `removeComponent`    | `{ nodeId }`                                          | Remove node and subtree   |
| `updateClasses`      | `{ nodeId, classes, mode }`                           | replace / merge / remove  |
| `updateContent`      | `{ nodeId, content }`                                 | Update text content       |
| `nestComponent`      | `{ nodeId, newParentId }`                             | Move node to new parent   |
| `reorderComponents`  | `{ parentId, orderedIds }`                            | Reorder children          |
| `duplicateComponent` | `{ nodeId }`                                          | Clone node at same level  |
| `queryLayout`        | —                                                     | Return compact DSL string |
| `applyTheme`         | `{ colorScheme?, accentColor?, fontSize?, rounded? }` | Walk tree, apply theme    |

**Exports:** HTML (Tailwind CDN) · React JSX · JSON

---

### API Schema Builder ✅

Builds OpenAPI 3.1 specifications from natural language. Includes undo/redo history, named snapshots, an inline spec editor, and a built-in API linter.

**Client tools:**

| Tool                 | Args                                  | Effect                           |
| -------------------- | ------------------------------------- | -------------------------------- |
| `querySpec`          | —                                     | Return compact DSL string        |
| `updateSpec`         | `{ title?, version?, baseUrl?, ... }` | Update spec-level metadata       |
| `addEndpoint`        | `ApiEndpoint`                         | Insert Zod-validated endpoint    |
| `removeEndpoint`     | `{ id }`                              | Delete endpoint by ID            |
| `updateEndpoint`     | `{ id, updates }`                     | Partial endpoint update          |
| `reorderEndpoints`   | `{ orderedIds }`                      | Reorder by ID array              |
| `setRequestBody`     | `{ id, schemaRef, contentType? }`     | Attach request body to endpoint  |
| `addSchemaObject`    | `ApiSchemaObject`                     | Add component schema             |
| `updateSchemaObject` | `{ name, ...updates }`                | Modify component schema          |
| `removeSchemaObject` | `{ name }`                            | Delete component schema          |
| `addTag`             | `{ name, description? }`              | Add tag definition               |
| `removeTag`          | `{ name }`                            | Remove tag definition            |
| `generateMockData`   | `{ id }`                              | Generate typed mock for endpoint |
| `retrieveDocs`       | `{ query }`                           | Server-side RAG passthrough      |

**Exports:** OpenAPI JSON · OpenAPI YAML · Postman Collection · DSL · TypeScript SDK · cURL Script · Python SDK

---

### Email Template Builder ✅

Builds responsive HTML email templates section by section. Includes desktop/mobile/Outlook/dark client simulation previews, a spam score analyzer, and preset templates.

**Client tools:** `queryTemplate · updateSubject · addSection · updateSection · removeSection · reorderSections · setClientMode · clearTemplate`

**Section types:** `header · hero · text · button · divider · image · columns · footer`

**Previews:** Desktop · Mobile · Outlook (MSO tables) · Dark mode (CSS injection)

**Exports:** HTML · DSL · JSON

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Cloudflare account (for worker deployment)

### Install

```bash
git clone https://github.com/your-org/ai-platform-builder.git
cd ai-platform-builder
pnpm install
```

### Development

```bash
# Frontend (localhost:5173)
pnpm --filter @ai-builder/web dev

# Worker (Miniflare at localhost:8787)
pnpm --filter @ai-builder/worker dev

# Both concurrently
pnpm dev
```

### Build

```bash
# All packages (Turborepo resolves dependency order, uses cache)
pnpm build

# Single package
pnpm --filter @ai-builder/web build
```

---

## Testing

**161 passing tests** across schemas, serializers, and the React app.

```bash
# Full test suite
pnpm test

# Per package
pnpm --filter @ai-builder/schemas test
pnpm --filter @ai-builder/serializers test
pnpm --filter @ai-builder/web test

# Watch mode
pnpm --filter @ai-builder/web exec vitest
```

### Test Coverage

| Package                   | File                       |   Tests |
| ------------------------- | -------------------------- | ------: |
| `@ai-builder/schemas`     | `form.test.ts`             |      13 |
| `@ai-builder/schemas`     | `layout.test.ts`           |      16 |
| `@ai-builder/serializers` | `form-dsl.test.ts`         |      10 |
| `@ai-builder/serializers` | `layout-dsl.test.ts`       |      25 |
| `@ai-builder/web`         | `cn.test.ts`               |       6 |
| `@ai-builder/web`         | `EmptyState.test.tsx`      |       4 |
| `@ai-builder/web`         | `ErrorBoundary.test.tsx`   |       3 |
| `@ai-builder/web`         | `useMode.test.tsx`         |       4 |
| `@ai-builder/web`         | `useBuilderAgent.test.tsx` |       7 |
| `@ai-builder/web`         | `useFormTools.test.ts`     |       7 |
| `@ai-builder/web`         | `useLayoutState.test.ts`   |       8 |
| `@ai-builder/web`         | `useLayoutTools.test.ts`   |      17 |
| `@ai-builder/web`         | `ModeSwitcher.test.tsx`    |       3 |
| `@ai-builder/web`         | `ChatPanel.test.tsx`       |      10 |
| `@ai-builder/web`         | `ToolCallStatus.test.tsx`  |       2 |
| `@ai-builder/web`         | `useApiState.test.ts`      |      19 |
| `@ai-builder/web`         | `useApiTools.test.ts`      |      32 |
| `@ai-builder/web`         | `lint.test.ts`             |      28 |
| **Total**                 |                            | **161** |

### Linting & Type Checking

```bash
pnpm lint           # ESLint all packages
pnpm type-check     # tsc --noEmit all packages (pre-push gate)
```

---

## Environment Variables

| Variable             | App    | How to set      | Description                               |
| -------------------- | ------ | --------------- | ----------------------------------------- |
| `VITE_AGENT_URL`     | web    | `.env.local`    | WebSocket URL for the Durable Object      |
| `ANTHROPIC_API_KEY`  | worker | Wrangler secret | Claude Sonnet 4.6 (primary LLM)           |
| `OPENAI_API_KEY`     | worker | Wrangler secret | GPT-4o (fallback if Anthropic key absent) |
| `UPSTASH_URL`        | worker | Wrangler secret | Upstash Vector REST endpoint              |
| `UPSTASH_TOKEN`      | worker | Wrangler secret | Upstash auth token                        |
| `BRAINTRUST_API_KEY` | worker | Wrangler secret | Eval tracking + trace logging             |
| `RESEND_API_KEY`     | worker | Wrangler secret | Email send-test (Email Template Builder)  |

---

## Architecture Decision Record

| Decision                | Choice                                             | Rationale                                                                                                   |
| ----------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Agent runtime           | Cloudflare Durable Objects                         | One stateful session per user, globally distributed, WebSocket hibernation — CPU cost = 0 between frames    |
| Tool execution location | Client-side only (no `execute`)                    | Zero-latency preview updates; state stays in React; no round-trip serialization for large schemas           |
| Context compression     | Custom compact DSL per module                      | 85–90% token reduction vs raw JSON; fits multi-field specs in a single context window                       |
| Schema validation layer | Zod everywhere, `.nullable().default(null)`        | Single schema → types + guards + tool params. `.default(null)` critical: agent-omitted fields must not fail |
| Preview sandbox         | `sandbox="allow-scripts"` (no `allow-same-origin`) | Agent-generated class names and content cannot access parent origin, cookies, or localStorage               |
| Conversation history    | Sliding window (20 messages)                       | Prevents unbounded context growth; DSL re-injected per message provides fresh state without replay          |
| LLM model               | Claude Sonnet 4.6 (primary), GPT-4o (fallback)     | Claude's superior tool-calling and instruction-following; fallback ensures deployability without Anthropic  |
| State management        | Local React state + Context (no Redux/Zustand)     | Each module is isolated; no cross-module state; Context is sufficient for current scope                     |
| Tool dispatcher         | Single mutable ref via Context                     | No re-renders on register; always points to the mounted module's handler; safe across route transitions     |
| Monorepo tooling        | pnpm workspaces + Turborepo                        | Hard-linked installs, cached builds, incremental pipelines — `pnpm build` in the right order automatically  |
| Undo/redo               | past[]/future[] arrays, MAX_HISTORY=50             | O(1) push/pop, bounded memory, no external library needed                                                   |
