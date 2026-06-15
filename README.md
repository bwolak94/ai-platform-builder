# AI Platform Builder

> An AI-powered, multi-module web platform where natural language drives CRUD operations on live previews.
> Pattern: **Agent → Client-Side Tools → Eval Harness → Improvement Loop** (AI Engineering Fundamentals, Scott Moss)

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61dafb?logo=react&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20DO-f38020?logo=cloudflare&logoColor=white)
![Vercel AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-4.x-black?logo=vercel&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3.x-3068b7)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.x-06b6d4?logo=tailwindcss&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-workspaces-f69220?logo=pnpm&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-2.x-EF4444)
![Tests](https://img.shields.io/badge/tests-116%20passing-22c55e)

---

## Table of Contents

- [Overview](#overview)
- [Implementation Status](#implementation-status)
- [System Architecture](#system-architecture)
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

AI Platform Builder is a browser-based SaaS tool where users describe what they want in plain English and an AI agent performs live mutations on structured state. The agent runs on Cloudflare Durable Objects (one persistent session per user), streams responses back over WebSocket, and delegates all state mutations to **client-side tools** that execute directly in the browser. Results are rendered instantly in sandboxed iframe previews.

```
User types a prompt
      │
      ▼
 Chat Panel (useAgentChat)
      │  WebSocket
      ▼
 Durable Object (BuilderAgent)
      │  RAG lookup (Upstash Vector)
      │  streamText → GPT-4o
      │  tool_call event emitted
      ▼
 Browser executes client tool
 (addField, addComponent, updateClasses…)
      │  React state update
      ▼
 Live iframe preview updates instantly
```

---

## Implementation Status

| Module                             | Schema | DSL | React UI | Tests | Backend Agent |
| ---------------------------------- | :----: | :-: | :------: | :---: | :-----------: |
| **Form Builder**                   |   ✅   | ✅  |    ✅    |  ✅   |      🔲       |
| **Layout Builder**                 |   ✅   | ✅  |    ✅    |  ✅   |      🔲       |
| API Schema Builder                 |   🔲   | 🔲  |    🔲    |  🔲   |      🔲       |
| DB Schema Builder                  |   🔲   | 🔲  |    🔲    |  🔲   |      🔲       |
| Email Template Builder             |   🔲   | 🔲  |    🔲    |  🔲   |      🔲       |
| Component Story Builder            |   🔲   | 🔲  |    🔲    |  🔲   |      🔲       |
| i18n Manager                       |   🔲   | 🔲  |    🔲    |  🔲   |      🔲       |
| E2E Test Generator                 |   🔲   | 🔲  |    🔲    |  🔲   |      🔲       |
| **App Shell / Chat / Routing**     |   —    |  —  |    ✅    |  ✅   |       —       |
| **Backend Agent (Durable Object)** |   —    |  —  |    —     |   —   |      🔲       |
| **Eval Harness**                   |   —    |  —  |    —     |   —   |      🔲       |

✅ Complete · 🔲 Planned

**Completed tasks:** TASK-001 (monorepo + CI) · TASK-002 (frontend core) · TASK-003 (Form Builder) · TASK-004 (Layout Builder)

---

## System Architecture

### High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Browser  (React 18 + Vite)                         │
│                                                                              │
│  ┌────────────────┐   ┌──────────────────────┐   ┌─────────────────────┐    │
│  │   Chat Panel   │   │    Builder Panel      │   │   Preview Panel     │    │
│  │                │   │                       │   │                     │    │
│  │  useAgentChat  │   │  Mode Switcher (8)    │   │  <iframe            │    │
│  │  ToolStatus    │   │  FormBuilderPanel     │   │   sandbox=          │    │
│  │  ScrollArea    │   │  LayoutBuilderPanel   │   │   "allow-scripts">  │    │
│  └───────┬────────┘   └──────────┬────────────┘   │  Tailwind CDN       │    │
│          │ WebSocket             │ client-side      │  Live rendering     │    │
│          │ (hibernation API)     │ tool execution   └─────────────────────┘    │
└──────────┼───────────────────────┼───────────────────────────────────────────┘
           │                       │
┌──────────┼───────────────────────┼──────────────── Cloudflare Edge ──────────┐
│          ▼                       │                                            │
│  ┌──────────────────────────┐    │   ┌──────────────────────────────────┐    │
│  │   Durable Object         │    │   │       Wrangler Secrets           │    │
│  │   BuilderAgent           │◄───┘   │  OPENAI_API_KEY                  │    │
│  │                          │        │  UPSTASH_URL / UPSTASH_TOKEN     │    │
│  │  • streamText (GPT-4o)   │        │  BRAINTRUST_API_KEY              │    │
│  │  • RAG tool defs         │        └──────────────────────────────────┘    │
│  │  • sliding window (20)   │                                                │
│  │  • WebSocket hibernation │                                                │
│  └──────────┬───────────────┘                                                │
└─────────────┼──────────────────────────────────────────────────────────────┘
              │
┌─────────────┼─────────────────────── External Services ─────────────────────┐
│             │                                                                 │
│   ┌─────────▼──────┐   ┌─────────────────┐   ┌──────────────────────┐      │
│   │  OpenAI        │   │  Upstash Vector  │   │  Braintrust          │      │
│   │  GPT-4o        │   │  RAG Corpus      │   │  Eval experiments    │      │
│   │  text-embed-3  │   │  1536-dim index  │   │  Trace logging       │      │
│   └────────────────┘   └─────────────────┘   └──────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Agent Sequence Flow

```
User               React App              Durable Object         OpenAI / Upstash
 │                     │                       │                       │
 │ "Add an email field" │                       │                       │
 │────────────────────►│                       │                       │
 │                     │ WS { content,         │                       │
 │                     │      mode: "form",    │                       │
 │                     │      dsl: "FORM:…" }  │                       │
 │                     │──────────────────────►│                       │
 │                     │                       │ retrieveDocs("email") │
 │                     │                       │──────────────────────►│
 │                     │                       │◄──────────────────────│
 │                     │                       │ streamText(           │
 │                     │                       │  system + RAG +       │
 │                     │                       │  tools + history)     │
 │                     │                       │──────────────────────►│
 │                     │                       │  tool_call:           │
 │                     │◄──────────────────────│  addField({…})        │
 │                     │ execute onToolCall     │                       │
 │                     │  Zod.safeParse(args)   │                       │
 │                     │  setFormSchema(…)      │                       │
 │                     │  → React re-render     │                       │
 │                     │  → iframe.srcDoc =…    │                       │
 │                     │──────────────────────►│ { success, fieldId }  │
 │                     │                       │──────────────────────►│
 │                     │◄──────────────────────│ text delta stream     │
 │◄────────────────────│ "Added email field…"  │                       │
```

### Package Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    packages/schemas                          │
│                                                             │
│  FormFieldSchema · FormSchemaSchema                         │
│  LayoutNodeSchema (recursive, z.lazy) · LayoutTreeSchema    │
│  TailwindClassSchema                                        │
│                                                             │
│  → TypeScript types inferred via z.infer<>                  │
│  → Runtime validation at every tool boundary                │
└──────────────────────────┬──────────────────────────────────┘
                           │ workspace:*
              ┌────────────┴───────────────┐
              ▼                            ▼
┌─────────────────────┐      ┌────────────────────────────┐
│ packages/serializers │      │       apps/worker           │
│                     │      │                            │
│  form-dsl.ts        │      │  BuilderAgent (DO)         │
│  layout-dsl.ts      │      │  streamText + tools        │
│                     │      │  RAG (Upstash Vector)      │
│  + tree utilities:  │      │  Braintrust logging        │
│  findNode           │      └────────────────────────────┘
│  insertNode         │
│  removeNode         │
│  updateNodeClasses  │
│  moveNode           │
│  applyThemeToTree   │
└──────────┬──────────┘
           │ workspace:*
           ▼
┌─────────────────────────────────────────────────────────────┐
│                       apps/web                               │
│                                                             │
│  modules/form-builder/    modules/layout-builder/           │
│  hooks/ (useFormTools)    hooks/ (useLayoutTools)           │
│  FieldList · FieldEditor  ComponentTree · ClassEditor       │
│  FormPreview              LayoutPreview                     │
│                                                             │
│  routes/ (TanStack Router file-based)                       │
│  context/ · hooks/ · ui/                                    │
└─────────────────────────────────────────────────────────────┘
```

### Module Inter-Dependencies

```
 Form Builder ──────────────────────► API Schema Builder
    │         "form fields → POST body"
    │
    ├──────────────────────────────── DB Schema Builder
    │         "fields → INSERT columns"
    │
    ├──────────────────────────────── Email Template Builder
    │         "submit → welcome email"
    │
    └──────────────────────────────── i18n Manager
              "labels, placeholders, errors"

 Layout Builder ────────────────────► Component Story Builder
    │          "components → stories"
    │
    ├──────────────────────────────── E2E Test Generator
    │          "UI tree → selectors"
    │
    └──────────────────────────────── i18n Manager
               "text node content"
```

---

## Key Design Patterns

### 1. Client-Side Tools Pattern

The agent decides _what_ to do; the browser executes state mutations. Zero round-trip latency for preview updates.

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent (Durable Object)         │  Browser                      │
│                                 │                               │
│  streamText() → GPT-4o          │                               │
│    detects need to add field    │                               │
│    emits tool_call event ──────►│  onToolCall({ toolName,       │
│                                 │               args })         │
│                                 │    Zod.safeParse(args)        │
│                                 │    setFormSchema(prev =>      │
│                                 │      insertField(prev, data)) │
│                                 │    → React re-render          │
│                                 │    → iframe.srcDoc update     │
│◄──── tool result ───────────────│  return { success, fieldId }  │
│  continues stream…              │                               │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Compact DSL — Token-Efficient Context

Each module serializes its state into a compact DSL injected into every message. This avoids re-sending raw JSON (which balloons context size).

**Form DSL:**

```
FORM: Contact Form | layout:single-column
f_a1b2c3 text:fullName "Full name" [required,minLength:2]
f_d4e5f6 email:email "Email address" [required]
f_g7h8i9 select:country "Country" [required]
```

**Layout DSL (indented tree):**

```
section#hero .py-20.bg-slate-900
  div#container .max-w-5xl.mx-auto.px-4
    h1#title .text-5xl.font-bold "Build faster"
    p#sub .text-xl.text-slate-400 "Ship with confidence"
    button#cta .px-8.py-3.bg-violet-600 "Get started"
```

| Module               | Raw JSON      | DSL         | Token saving |
| -------------------- | ------------- | ----------- | :----------: |
| Form — 10 fields     | ~2 000 tokens | ~200 tokens |   **90%**    |
| Layout — 20 nodes    | ~3 000 tokens | ~400 tokens |   **87%**    |
| API Spec — 15 routes | ~4 000 tokens | ~600 tokens |   **85%**    |

### 3. Zod as Single Source of Truth

```
packages/schemas/src/form.ts
         │
         ├─► TypeScript type       type FormField = z.infer<typeof FormFieldSchema>
         ├─► Runtime guard         FormFieldSchema.safeParse(toolArgs.field)
         ├─► Tool parameter def    parameters: zodToJsonSchema(FormFieldSchema)
         └─► Export schema         JSON Schema download button
```

### 4. Iframe Security Model

```
Parent (React app)                    Sandboxed iframe
       │                                     │
       │  iframe.srcDoc = generateHTML(tree)  │
       │────────────────────────────────────►│
       │                                     │  Tailwind CDN runs here
       │                                     │  No DOM access to parent
       │                                     │  No cookie access
       │                                     │  No localStorage access
       │                                     │
       │  sandbox="allow-scripts"             │
       │  (NO allow-same-origin)              │
```

### 5. Eval → Improvement Loop

```
 ┌─────────────────┐     ┌──────────────────┐     ┌───────────────────────┐
 │  Run eval suite │────►│ View in Braintrust│────►│ Identify failure      │
 │  (vitest +      │     │ inspect failures  │     │ "agent omits          │
 │   scorers)      │     │ compare runs      │     │  responsive classes"  │
 └─────────────────┘     └──────────────────┘     └────────────┬──────────┘
         ▲                                                      │
         │                                                      ▼
 ┌───────┴─────────┐     ┌──────────────────┐     ┌───────────────────────┐
 │ Rerun + compare │◄────│ Commit updated   │◄────│ Update system prompt  │
 │ score improved? │     │ prompt + code    │     │ (one focused change)  │
 └─────────────────┘     └──────────────────┘     └───────────────────────┘
```

---

## Monorepo Structure

```
ai-platform-builder/
│
├── apps/
│   ├── web/                            # React 18 + Vite frontend
│   │   └── src/
│   │       ├── routes/                 # TanStack Router file-based routes
│   │       │   ├── __root.tsx          # App shell with ResizablePanels
│   │       │   ├── index.tsx           # Redirect → /form
│   │       │   ├── form/index.tsx      # ✅ Form Builder page
│   │       │   ├── layout/index.tsx    # ✅ Layout Builder page
│   │       │   └── -components/        # Route-private shared components
│   │       │       ├── ChatPanel/      # ✅ Streaming chat UI
│   │       │       ├── ModeSwitcher/   # ✅ 8-mode navigation
│   │       │       ├── PreviewFrame/   # ✅ iframe container
│   │       │       └── ToolCallStatus/ # ✅ Active tool indicator
│   │       ├── modules/
│   │       │   ├── form-builder/       # ✅ Fully implemented
│   │       │   │   ├── hooks/
│   │       │   │   │   ├── useFormState.ts
│   │       │   │   │   └── useFormTools.ts
│   │       │   │   ├── FormBuilderPanel.tsx
│   │       │   │   ├── FieldList.tsx      # @dnd-kit drag-and-drop
│   │       │   │   ├── FieldItem.tsx
│   │       │   │   ├── FieldEditor.tsx    # shadcn Sheet slide-over
│   │       │   │   ├── FormPreview.tsx    # sandboxed iframe
│   │       │   │   └── ExportPanel.tsx    # JSON / TSX / HTML export
│   │       │   └── layout-builder/     # ✅ Fully implemented
│   │       │       ├── hooks/
│   │       │       │   ├── useLayoutState.ts
│   │       │       │   ├── useSelectedNode.ts
│   │       │       │   └── useLayoutTools.ts
│   │       │       ├── LayoutBuilderPanel.tsx
│   │       │       ├── ComponentTree.tsx  # Recursive tree with expand/collapse
│   │       │       ├── TreeNode.tsx       # Tag badge + class previews
│   │       │       ├── ClassEditor.tsx    # Tailwind autocomplete (datalist)
│   │       │       ├── LayoutPreview.tsx  # Tailwind CDN sandboxed iframe
│   │       │       └── ExportPanel.tsx    # HTML / JSX / JSON export
│   │       ├── hooks/
│   │       │   ├── useBuilderAgent/    # ✅ WebSocket agent connection
│   │       │   └── useMode/            # ✅ Active builder mode context
│   │       ├── context/mode/           # ✅ ModeContext + ModeProvider
│   │       ├── ui/                     # ✅ ErrorBoundary, EmptyState, ThemeToggle
│   │       ├── components/ui/          # shadcn/ui component library
│   │       ├── providers/              # AppProviders composition root
│   │       └── utils/cn.ts             # clsx + tailwind-merge
│   │
│   └── worker/                         # 🔲 Cloudflare Worker + Durable Object
│       └── src/
│           ├── agent.ts                # BuilderAgent DO
│           ├── prompts/                # Per-module system prompts
│           └── rag/                    # Upstash Vector retrieval
│
├── packages/
│   ├── schemas/                        # ✅ Shared Zod schemas
│   │   └── src/
│   │       ├── form.ts                 # ✅ 13 field types, 8 validation rules
│   │       └── layout.ts               # ✅ 16 node types (recursive), TailwindClassSchema
│   │
│   ├── serializers/                    # ✅ DSL serializers + tree utilities
│   │   └── src/
│   │       ├── form-dsl.ts             # ✅ serialize / deserialize
│   │       └── layout-dsl.ts           # ✅ serialize / deserialize
│   │                                   #     findNode · insertNode · removeNode
│   │                                   #     updateNodeClasses · moveNode
│   │                                   #     applyThemeToTree
│   └── types/                          # Shared TypeScript utility types
│
├── evals/                              # 🔲 Braintrust eval harness
│   ├── datasets/                       # Golden input/output pairs
│   └── scorers/                        # Code-based quality scorers
│
├── corpus/                             # 🔲 RAG source documents
│   ├── tailwind/ · forms/ · components/
│
├── docs/                               # Architecture docs + task specs
│   ├── architecture.md
│   ├── architecture-flow.md
│   ├── technologies.md
│   └── tasks/  (TASK-001 … TASK-007)
│
├── .github/workflows/                  # CI: lint → type-check → test → build
├── eslint.config.mjs                   # ESLint 9 flat config
├── turbo.json                          # Turborepo pipeline
└── pnpm-workspace.yaml
```

---

## Technology Stack

### Frontend

| Concern       | Technology                  | Version | Notes                                                   |
| ------------- | --------------------------- | ------- | ------------------------------------------------------- |
| Framework     | React                       | 18.x    | Concurrent features, strict mode                        |
| Build         | Vite                        | 5.x     | Fast HMR, native ESM, TanStack Router plugin            |
| Language      | TypeScript                  | 5.x     | `strict: true`, zero `any`                              |
| Routing       | TanStack Router             | 1.x     | Type-safe file-based, auto-generated `routeTree.gen.ts` |
| Styling       | Tailwind CSS                | 4.x     | Utility-first — also the _output_ of Layout Builder     |
| Components    | shadcn/ui                   | latest  | new-york style, neutral base, copy-into-project         |
| Layout panels | `@radix-ui/react-resizable` | —       | 3-panel: Chat / Builder / Preview                       |
| Drag & drop   | @dnd-kit                    | 6.x     | Form field reorder with pointer activation constraint   |
| ID generation | nanoid                      | 5.x     | `f_abc123` (fields), `div_xyz789` (nodes)               |

### Backend & Agent

| Concern           | Technology             | Notes                                              |
| ----------------- | ---------------------- | -------------------------------------------------- |
| Runtime           | Cloudflare Workers     | V8 isolates, zero cold-start, edge-distributed     |
| Stateful sessions | Durable Objects        | One DO per user, WebSocket hibernation API         |
| Agent SDK         | @cloudflare/agents     | `Agent` base class, `useAgentChat` React hook      |
| AI SDK            | Vercel AI SDK 4.x      | `streamText`, `tool`, `onToolCall`, `maxSteps: 10` |
| LLM               | OpenAI GPT-4o          | Best tool-calling accuracy and JSON adherence      |
| Embeddings        | text-embedding-3-small | 1536 dimensions, Upstash Vector indexing           |

### Data & Validation

| Concern             | Technology     | Notes                                                 |
| ------------------- | -------------- | ----------------------------------------------------- |
| Schema validation   | Zod 3.x        | Single source of truth — types + guards + tool params |
| Vector DB           | Upstash Vector | Serverless, HTTP API (CF Workers compatible, no TCP)  |
| Context compression | Custom DSL     | 85–90% token reduction vs raw JSON                    |

### Observability & Quality

| Concern       | Technology          | Notes                                                       |
| ------------- | ------------------- | ----------------------------------------------------------- |
| Eval tracking | Braintrust          | Experiments, scorers, prompt versioning with git metadata   |
| Unit tests    | Vitest 2.x          | jsdom env, @testing-library/react, 116 tests passing        |
| E2E tests     | Playwright 1.x      | Cross-browser, agent interaction tests                      |
| Linting       | ESLint 9            | Flat config, `typescript-eslint` strict, `--max-warnings=0` |
| Formatting    | Prettier 3          | `prettier-plugin-tailwindcss` for class ordering            |
| Git hooks     | Husky + lint-staged | Pre-commit: ESLint + Prettier; Pre-push: `tsc --noEmit`     |
| Commits       | Commitlint          | Conventional commits enforced on every push                 |

### Infrastructure

| Concern        | Technology                 | Notes                                       |
| -------------- | -------------------------- | ------------------------------------------- |
| Monorepo       | pnpm workspaces            | `workspace:*` linking, single lockfile      |
| Build pipeline | Turborepo 2.x              | Cached builds, parallel tasks, `pnpm build` |
| Local dev      | Docker Compose             | `web` + `worker` (Miniflare)                |
| CI/CD          | GitHub Actions             | PR: lint → type-check → test → build        |
| Deployment     | Cloudflare Pages + Workers | Automated on merge to `main`                |

---

## Module Reference

### Form Builder ✅

Generates and edits HTML forms from natural language. State is a typed `FormSchema` with a list of validated `FormField` objects.

**Client tools (executed in browser):**

| Tool            | Args                       | Effect                     |
| --------------- | -------------------------- | -------------------------- |
| `addField`      | `{ field, afterFieldId? }` | Insert Zod-validated field |
| `removeField`   | `{ fieldId }`              | Delete field by ID         |
| `updateField`   | `{ fieldId, updates }`     | Partial field update       |
| `reorderFields` | `{ orderedIds }`           | Reorder by ID array        |
| `querySchema`   | —                          | Returns compact DSL string |

**Supported field types:**
`text · email · password · number · tel · textarea · select · multiselect · checkbox · radio · date · file · hidden`

**Validation rules:**
`required · minLength · maxLength · min · max · pattern · email · url`

**Exports:** JSON Schema · React TSX (react-hook-form) · Semantic HTML

---

### Layout Builder ✅

Builds page layouts as a typed `LayoutNode` tree, each node carrying Tailwind CSS classes. Rendered live in a sandboxed iframe via the Tailwind CDN.

**Client tools (executed in browser):**

| Tool              | Args                                                  | Effect                     |
| ----------------- | ----------------------------------------------------- | -------------------------- |
| `addComponent`    | `{ node, parentId?, afterSiblingId? }`                | Insert Zod-validated node  |
| `removeComponent` | `{ nodeId }`                                          | Remove node and subtree    |
| `updateClasses`   | `{ nodeId, classes, mode }`                           | replace / merge / remove   |
| `nestComponent`   | `{ nodeId, newParentId }`                             | Move node to new parent    |
| `queryLayout`     | —                                                     | Returns compact DSL string |
| `applyTheme`      | `{ colorScheme?, accentColor?, fontSize?, rounded? }` | Walk tree applying theme   |

**Container nodes:** `div · section · nav · header · main · footer · article · aside`

**Leaf nodes:** `h1 · h2 · h3 · h4 · p · span · button · img`

**Exports:** HTML (Tailwind CDN) · React JSX · JSON

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

### Environment Setup

```bash
cp apps/web/.env.example apps/web/.env.local
```

```env
# apps/web/.env.local
VITE_AGENT_URL=ws://localhost:8787
VITE_APP_ENV=development
```

Worker secrets (via Wrangler):

```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put UPSTASH_URL
wrangler secret put UPSTASH_TOKEN
wrangler secret put BRAINTRUST_API_KEY
```

### Development

```bash
# Frontend only (hot reload at localhost:5173)
pnpm --filter @ai-builder/web dev

# Worker only (Miniflare at localhost:8787)
pnpm --filter @ai-builder/worker dev

# Both via Docker Compose
docker compose -f docker/docker-compose.yml up
```

### Build

```bash
# Build all packages (Turborepo resolves dependency order)
pnpm build

# Build a single package
pnpm --filter @ai-builder/web build
```

---

## Testing

The project has **116 passing tests** across three packages.

```bash
# Full test suite (all packages, Turborepo cached)
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
| `@ai-builder/web`         | `useLayoutTools.test.ts`   |       8 |
| `@ai-builder/web`         | `ModeSwitcher.test.tsx`    |       3 |
| `@ai-builder/web`         | `ChatPanel.test.tsx`       |       8 |
| `@ai-builder/web`         | `ToolCallStatus.test.tsx`  |       2 |
| **Total**                 |                            | **116** |

### Linting & Type Checking

```bash
# Lint all
pnpm lint

# Type check all (pre-push gate)
pnpm type-check

# Lint a single module
pnpm --filter @ai-builder/web exec eslint src/modules/layout-builder --max-warnings=0
```

---

## Environment Variables

| Variable             | App    | How to set      | Description                          |
| -------------------- | ------ | --------------- | ------------------------------------ |
| `VITE_AGENT_URL`     | web    | `.env.local`    | WebSocket URL for the Durable Object |
| `VITE_APP_ENV`       | web    | `.env.local`    | `development` or `production`        |
| `OPENAI_API_KEY`     | worker | Wrangler secret | GPT-4o + text-embedding-3-small      |
| `UPSTASH_URL`        | worker | Wrangler secret | Upstash Vector REST endpoint         |
| `UPSTASH_TOKEN`      | worker | Wrangler secret | Upstash auth token                   |
| `BRAINTRUST_API_KEY` | worker | Wrangler secret | Eval tracking + trace logging        |

---

## Architecture Decision Record

| Decision                | Choice                                             | Rationale                                                                                               |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Agent runtime           | Cloudflare Durable Objects                         | Stateful WebSocket sessions per user, globally distributed at edge, hibernation API for cost efficiency |
| Tool execution location | Client-side (browser)                              | Zero-latency preview updates; state stays in React; no serialization round-trip for large schemas       |
| Context compression     | Custom compact DSL                                 | 85–90% token reduction vs raw JSON; fits large multi-field schemas within a single context window       |
| Schema validation layer | Zod everywhere                                     | One schema → TypeScript type + runtime guard + tool parameter definition + export schema                |
| Preview sandbox         | `sandbox="allow-scripts"` (no `allow-same-origin`) | Rendered user-provided class names and content cannot access parent origin, cookies, or localStorage    |
| Conversation history    | Sliding window (20 messages)                       | Prevents unbounded context growth; DSL re-injected on every message provides fresh state regardless     |
| LLM                     | OpenAI GPT-4o                                      | Highest tool-calling accuracy and JSON schema adherence — critical for DSL generation reliability       |
| Monorepo tooling        | pnpm workspaces + Turborepo                        | Efficient installs (hard links), cached builds, incremental task pipelines across packages              |

---
