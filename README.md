# AI Platform Builder

> An AI-powered, multi-module developer platform where natural language drives live mutations on structured state — running entirely at the Cloudflare edge.

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
- [Core Pattern](#core-pattern)
- [System Context (C4 Level 1)](#system-context-c4-level-1)
- [Container Diagram (C4 Level 2)](#container-diagram-c4-level-2)
- [Key Interaction Flows](#key-interaction-flows)
  - [Chat → Tool → Preview Flow](#chat--tool--preview-flow)
  - [Agent Stream Lifecycle](#agent-stream-lifecycle)
  - [Multi-Step Agentic Loop](#multi-step-agentic-loop)
  - [RAG Context Injection Flow](#rag-context-injection-flow)
- [Architecture Deep Dive](#architecture-deep-dive)
  - [Frontend Component Hierarchy](#frontend-component-hierarchy)
  - [State Architecture](#state-architecture)
  - [Tool Dispatch Architecture](#tool-dispatch-architecture)
  - [Undo / Redo Architecture](#undo--redo-architecture)
  - [Zod Validation Boundaries](#zod-validation-boundaries)
  - [DSL Token Compression](#dsl-token-compression)
  - [Preview Sandbox Security](#preview-sandbox-security)
- [Monorepo Package Graph](#monorepo-package-graph)
- [Implementation Status](#implementation-status)
- [Module Reference](#module-reference)
- [DSL Examples](#dsl-examples)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Architecture Decision Record](#architecture-decision-record)

---

## Overview

AI Platform Builder is a browser-based developer productivity platform. Users describe what they want in plain English; a Cloudflare-edge AI agent executes a sequence of typed tool calls that mutate structured state in the browser. Every mutation is instantly visible via sandboxed live previews.

**8 independent builder modules** — each a complete vertical slice from Zod schema → compact DSL → React UI → agent tools → live preview:

| Module                  | What it builds                                      |
| ----------------------- | --------------------------------------------------- |
| Form Builder            | Typed `FormSchema` → HTML form + React TSX          |
| Layout Builder          | `LayoutNode` tree → Tailwind page layout iframe     |
| API Schema Builder      | `OpenApiSpec` → OpenAPI 3.1 JSON/YAML + Swagger UI  |
| Email Template Builder  | `EmailTemplate` → client-simulated HTML email       |
| DB Schema Builder       | `DbSchema` → SQL / Prisma + Mermaid ERD             |
| Component Story Builder | `StoryFile` → Storybook CSF3 `.stories.tsx`         |
| i18n Manager            | `I18nStore` → multi-language JSON translation files |
| E2E Test Generator      | `TestFile` → Playwright `.spec.ts` + config + POM   |

---

## Core Pattern

The platform implements the **AI Engineering Fundamentals** pattern by Scott Moss:

```
Agent ──► Client-Side Tools ──► Eval Harness ──► Improvement Loop
```

```mermaid
flowchart LR
    A[Natural Language\nPrompt] --> B[BuilderAgent\nDurable Object]
    B --> C{streamText\nclaude-sonnet-4-6}
    C --> D[tool_call events\nvia WebSocket]
    D --> E[Browser\nTool Handlers]
    E --> F[React State\nMutation]
    F --> G[Live Preview\niframe]
    E --> H[addToolResult\nWebSocket]
    H --> C
    B --> I[Braintrust\nTrace + Eval]
```

**Key insight:** The agent never executes tools server-side. It emits `tool_call` events and waits. The browser validates, executes, and returns results. This gives zero-latency preview updates with no round-trip serialization cost.

---

## System Context (C4 Level 1)

```mermaid
C4Context
    title System Context — AI Platform Builder

    Person(dev, "Developer", "Uses natural language to build\nforms, APIs, layouts, tests, etc.")

    System(platform, "AI Platform Builder", "8-module browser tool: natural language\n→ live structured output via AI agent")

    System_Ext(anthropic, "Anthropic API", "claude-sonnet-4-6\nLLM primary model")
    System_Ext(openai, "OpenAI API", "gpt-4o fallback model")
    System_Ext(upstash, "Upstash Vector", "RAG corpus: Playwright docs,\nTailwind patterns, OpenAPI spec")
    System_Ext(braintrust, "Braintrust", "Eval experiments,\ntrace logging, prompt versioning")
    System_Ext(resend, "Resend API", "Send test emails for\nEmail Template Builder")

    Rel(dev, platform, "Uses", "Browser (HTTPS)")
    Rel(platform, anthropic, "LLM inference", "HTTPS REST")
    Rel(platform, openai, "LLM fallback", "HTTPS REST")
    Rel(platform, upstash, "Vector search\n(RAG retrieval)", "HTTPS REST")
    Rel(platform, braintrust, "Trace + eval\nlogging", "HTTPS REST")
    Rel(platform, resend, "Send test email", "HTTPS REST")
```

---

## Container Diagram (C4 Level 2)

```mermaid
C4Container
    title Container Diagram — AI Platform Builder

    Person(dev, "Developer")

    Container_Boundary(browser, "Browser") {
        Container(spa, "React SPA", "React 19 + Vite 5\nTanStack Router", "8 builder panels,\nlive preview iframes,\nchat interface")
        Container(iframe, "Sandboxed iframes", "sandbox=allow-scripts\n(no allow-same-origin)", "Form / Layout / API /\nEmail live previews")
    }

    Container_Boundary(cf, "Cloudflare Edge") {
        Container(worker, "BuilderAgent", "Cloudflare Worker\nDurable Object", "One DO per user.\nWebSocket hibernation.\nmaxSteps:10 agentic loop.")
        Container(rag, "RAG Retriever", "Upstash Vector\nclient in Worker", "Semantic search over\ncorpus markdown docs")
    }

    Container_Boundary(pkgs, "Shared Packages") {
        Container(schemas, "@ai-builder/schemas", "Zod 4.x", "Single source of truth\nfor all data types")
        Container(serializers, "@ai-builder/serializers", "TypeScript", "Compact DSL per module\n+ tree utilities")
    }

    Rel(dev, spa, "Interacts", "HTTPS")
    Rel(spa, worker, "WebSocket\n(hibernation API)", "WS")
    Rel(spa, iframe, "Sets srcDoc\nwith generated HTML")
    Rel(worker, rag, "Vector search\non tool call")
    Rel(spa, schemas, "imports")
    Rel(spa, serializers, "imports")
    Rel(worker, schemas, "imports")
    Rel(worker, serializers, "imports")
```

---

## Key Interaction Flows

### Chat → Tool → Preview Flow

This is the primary user interaction: a message travels from the browser through the DO, triggers a tool call, and instantly updates the UI.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Chat as ChatPanel<br/>(React)
    participant WS as WebSocket
    participant DO as BuilderAgent<br/>(Durable Object)
    participant LLM as Claude Sonnet 4.6<br/>(Anthropic API)
    participant Tools as Tool Handler<br/>(Browser)
    participant Preview as Preview iframe

    User->>Chat: "Add a required email field"
    Chat->>WS: send chat message (JSON)
    WS->>DO: onMessage() → onChatMessage()

    Note over DO: 1. Derive mode from room name<br/>2. Build system prompt (mode + DSL + RAG)<br/>3. Merge sliding-window history (max 20 msgs)

    DO->>LLM: streamText({ model, system, tools, messages, maxSteps:10 })

    LLM-->>DO: stream: text delta "I'll add an email field..."
    DO-->>WS: text delta (forwarded to browser)
    WS-->>Chat: streaming assistant message

    LLM-->>DO: stream: tool_call { name:"addField", args:{...} }
    DO-->>WS: tool_call event (NO server execute)
    WS-->>Tools: onToolCall({ toolName, args })

    Note over Tools: 1. setActiveToolCall("addField") → ThinkingIndicator "Applying"<br/>2. Zod.safeParse(args) at boundary<br/>3. setFormSchema(prev => [...prev.fields, newField])

    Tools->>Preview: React re-render → iframe.srcDoc = generateFormHtml(schema)
    Note over Preview: Instant visual update (0ms network latency)

    Tools->>WS: addToolResult({ success: true, fieldId: "f_abc123" })
    WS->>DO: tool result received
    DO->>LLM: continue stream with tool result

    LLM-->>DO: stream: text "Done! I've added a required email field."
    DO-->>WS: text delta
    WS-->>Chat: final assistant message

    Note over Tools: setActiveToolCall(null) → ThinkingIndicator hidden
```

---

### Agent Stream Lifecycle

The `ThinkingIndicator` component reflects the agent's internal state through three distinct phases:

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Idle: page load

    Idle --> Thinking: user submits message\n(status = "submitted")
    Thinking --> Applying: LLM emits tool_call\n(activeToolCall set)
    Applying --> Responding: tool result returned\n(status = "streaming", activeToolCall = null)
    Responding --> Applying: LLM emits another tool_call\n(multi-step agentic loop)
    Responding --> Idle: stream completes\n(status = "idle")
    Thinking --> Idle: error / abort
    Applying --> Idle: error / abort

    state Thinking {
        direction LR
        [*] --> amber_dots
        amber_dots: ● ● ●\nThinking\n(elapsed timer)
    }
    state Applying {
        direction LR
        [*] --> blue_dots
        blue_dots: ● ● ●\nApplying · addField\n(elapsed timer)
    }
    state Responding {
        direction LR
        [*] --> green_dots
        green_dots: ● ● ●\nResponding\n(elapsed timer)
    }
```

---

### Multi-Step Agentic Loop

The agent runs up to `maxSteps: 10` tool calls before returning to the user. This enables complex multi-step operations ("set the title, add 5 endpoints, then add authentication schemas") in a single prompt:

```mermaid
sequenceDiagram
    participant DO as BuilderAgent DO
    participant LLM as Claude Sonnet 4.6
    participant Browser as Browser Tools

    DO->>LLM: streamText(system, messages, tools, maxSteps:10)

    Note over LLM: Step 1
    LLM-->>DO: tool_call: querySpec {}
    DO-->>Browser: dispatch querySpec
    Browser-->>DO: { dsl: "API: My API v1.0..." }
    DO->>LLM: addToolResult(dsl)

    Note over LLM: Step 2
    LLM-->>DO: tool_call: updateSpec { title, version }
    DO-->>Browser: dispatch updateSpec
    Browser-->>DO: { success: true }
    DO->>LLM: addToolResult

    Note over LLM: Steps 3–7
    LLM-->>DO: tool_call: addEndpoint (×5 in sequence)
    DO-->>Browser: dispatch each
    Browser-->>DO: { success: true, endpointId: "..." }

    Note over LLM: Step 8
    LLM-->>DO: tool_call: addSchemaObject { name:"AuthToken" }
    DO-->>Browser: dispatch
    Browser-->>DO: { success: true }

    Note over LLM: Final text response
    LLM-->>DO: "I've set up your API with 5 endpoints and an auth schema."
    DO-->>Browser: stream complete
```

---

### RAG Context Injection Flow

Every prompt includes semantically relevant documentation from an Upstash Vector index:

```mermaid
flowchart TD
    A[User prompt:\n'add a multipart file upload endpoint'] -->|1. Embed with text-embedding-3| B[Query Vector\n1536-dim embedding]
    B -->|2. Top-3 cosine similarity| C[Upstash Vector Index\n/corpus/api/, /tailwind/,\n/playwright/, /storybook/]
    C -->|3. Retrieved chunks| D[RAG context string\n~500 tokens]
    D --> E[System Prompt Builder]
    F[Current DSL state\n~200 tokens] --> E
    G[Mode-specific rules\n~300 tokens] --> E
    E -->|Total: ~1000 tokens| H[streamText call\nwith full context]
    H --> I[LLM emits tool_call\nusing retrieved patterns]
```

The `retrieveDocs` tool is the **only** server-side tool in the system. All other tools are client-only.

---

## Architecture Deep Dive

### Frontend Component Hierarchy

```mermaid
graph TD
    AP[AppProviders\nModeContext · ToolDispatchContext\nFormBuilderContext · LayoutBuilderContext\nEmailBuilderContext · ApiBuilderContext] --> RP[RouterProvider\nTanStack Router]
    RP --> AS[AppShell\nResizablePanelGroup]

    AS --> CP[ChatPanel\nuseAgentChat · messages]
    AS --> OUT[Router Outlet]
    AS --> PF[PreviewFrame\nsandboxed iframe]

    CP --> MI[ThinkingIndicator\nphase · elapsed · dotColor]
    CP --> TCS[ToolCallStatus\nactive tool name]
    CP --> ES[EmptyState\nper-mode hints · prompt chips]

    OUT --> FBP[FormBuilderPanel\n/form]
    OUT --> LBP[LayoutBuilderPanel\n/layout]
    OUT --> ASP[ApiSchemaBuilderPanel\n/api]
    OUT --> EBP[EmailBuilderPanel\n/email]
    OUT --> DBP[DbSchemaBuilderPanel\n/db]
    OUT --> SBP[ComponentStoryBuilderPanel\n/story]
    OUT --> I18NP[I18nManagerPanel\n/i18n]
    OUT --> E2EP[E2eTestGeneratorPanel\n/e2e]

    FBP --> FL[FieldList\ndnd-kit drag-reorder]
    FBP --> FE[FieldEditor\nSheet slide-over]
    FBP --> FPR[FormPreview → iframe]

    ASP --> EL[EndpointList]
    ASP --> SL[SchemaList]
    ASP --> LP[LintPanel\nhealthScore · issues]
    ASP --> SNP[SnapshotsPanel\nmax 5 named snapshots]

    E2EP --> TCL[TestCaseList\nstep delete · expand-all]
    E2EP --> SPV[SpecPreview\ncopy button]
    E2EP --> PCP[PlaywrightConfigPanel\nconfig generator]
    E2EP --> PPE[PresetsPanel\n5 preset test suites]
```

---

### State Architecture

No global state library. Each module owns its state via an isolated React hook. Some modules promote their state to Context so the AppShell can sync the DSL to the agent. State follows a consistent pattern across all 8 modules:

```mermaid
graph LR
    subgraph hook["useModuleState() hook"]
        direction TB
        P[past: State\[\]] --> PRS[present: State]
        PRS --> F[future: State\[\]]
        LS[(localStorage\npersistence)]
        PRS -- useEffect --> LS
        LS -- loadInitial --> PRS
    end

    subgraph ops["Operations"]
        direction TB
        SET["setState(next)\n→ push present to past\n→ clear future"]
        UND["undo()\n→ pop past\n→ push to future"]
        RED["redo()\n→ shift future\n→ push to past"]
        RST["reset()\n→ push present to past\n→ restore default"]
    end

    hook --> MT[useModuleTools\nZod-validated tool handlers]
    MT --> Panel[ModulePanel\nuseRegisterToolDispatch]
```

**History cap:** `MAX_HISTORY = 20` (story, i18n, e2e) or `MAX_HISTORY = 50` (api) — oldest entries are sliced off with `slice(-(MAX_HISTORY - 1))`.

---

### Tool Dispatch Architecture

A single mutable `dispatchRef` routes every tool call to whichever module panel is currently mounted. No re-renders. No stale closures. Safe across route transitions:

```mermaid
sequenceDiagram
    participant WS as WebSocket
    participant UA as useBuilderAgent
    participant DX as ToolDispatchContext\n(dispatchRef)
    participant FBP as FormBuilderPanel\n(mounted on /form)

    Note over FBP: On mount: useRegisterToolDispatch(handleToolCall)
    FBP->>DX: register(stableWrapper → fnRef.current)
    Note over DX: dispatchRef.current = stableWrapper\n(overwrites previous module's handler)

    WS->>UA: tool_call event arrives
    UA->>UA: setActiveToolCall("addField")
    UA->>DX: dispatchRef.current({ toolName:"addField", args })
    DX->>FBP: stableWrapper invokes fnRef.current
    FBP->>FBP: tools["addField"](args) → Zod.safeParse → setState
    FBP-->>UA: Promise<{ success: true, fieldId }>
    UA->>WS: addToolResult({ success: true })
    UA->>UA: setActiveToolCall(null)
```

```typescript
// Context value
interface ToolDispatchContextValue {
  dispatchRef: { current: ToolDispatcher };
  register: (fn: ToolDispatcher) => void; // useCallback — stable reference
}

// Registration in each module panel:
function useRegisterToolDispatch(fn: ToolDispatcher): void {
  const { register } = useToolDispatch();
  const fnRef = useRef<ToolDispatcher>(fn);
  fnRef.current = fn; // always current, no re-render trigger

  useEffect(() => {
    // Stable wrapper — fnRef.current is always the latest handler
    register((call) => fnRef.current(call));
  }, [register]); // runs once on mount
}
```

---

### Undo / Redo Architecture

Implemented as two stacks — O(1) push/pop, bounded to `MAX_HISTORY` entries:

```mermaid
stateDiagram-v2
    direction LR

    state "Initial State" as S0 {
        past0: past = []
        present0: present = A
        future0: future = []
    }

    state "After setState(B)" as S1 {
        past1: past = [A]
        present1: present = B
        future1: future = []
    }

    state "After setState(C)" as S2 {
        past2: past = [A, B]
        present2: present = C
        future2: future = []
    }

    state "After undo()" as S3 {
        past3: past = [A]
        present3: present = B
        future3: future = [C]
    }

    state "After redo()" as S4 {
        past4: past = [A, B]
        present4: present = C
        future4: future = []
    }

    S0 --> S1: setState(B)
    S1 --> S2: setState(C)
    S2 --> S3: undo()
    S3 --> S4: redo()
```

---

### Zod Validation Boundaries

There are exactly **three** Zod validation boundaries in the system. Each boundary is a trust gap between two actors:

```mermaid
flowchart TD
    LLM[LLM\ntool_call args] -->|Boundary 1| B1{"Zod.safeParse\non tool args"}
    B1 -- parsed.success --> SET[setState mutation]
    B1 -- parsed.error --> ERR[return error to agent\nfor self-correction]

    PM[postMessage\nfrom iframe] -->|Boundary 2| B2{"Zod.safeParse\non postMessage payload"}
    B2 -- valid --> PMACT[handle preview action]

    EXPORT[Export / Download] -->|Boundary 3| B3{"Zod.safeParse\non current state"}
    B3 -- valid --> FILE[generate output file]
    B3 -- invalid --> WARN[show validation warning]
```

**Critical pattern:** Agent-omitted optional fields must use `.nullable().default(null)` — not just `.nullable()`:

```typescript
// WRONG — agent omits `summary` → Zod throws "Required"
summary: z.string().nullable();

// CORRECT — agent omits `summary` → Zod coerces to null
summary: z.string().nullable().default(null);
```

---

### DSL Token Compression

Each module serializes its state into a hand-crafted compact DSL injected into every system prompt. This is the key mechanism enabling large schemas to fit within a single context window:

```mermaid
graph LR
    RS[React State\nOpenApiSpec JSON\n~4000 tokens] -->|serializeApiDSL| DS[Compact DSL\n~600 tokens\n85% reduction]
    DS --> SP[System Prompt]
    SP --> LLM[LLM Context Window]

    LLM -->|tool_call args| ZP[Zod.safeParse]
    ZP -->|valid| RS2[Updated React State]
    RS2 -->|next prompt| DS
```

**Token comparison across all 8 modules:**

| Module                   | Raw JSON      | Compact DSL | Reduction |
| ------------------------ | ------------- | ----------- | :-------: |
| Form — 10 fields         | ~2,000 tokens | ~200 tokens |  **90%**  |
| Layout — 20 nodes        | ~3,000 tokens | ~400 tokens |  **87%**  |
| API Spec — 15 routes     | ~4,000 tokens | ~600 tokens |  **85%**  |
| Email — 8 sections       | ~1,500 tokens | ~150 tokens |  **90%**  |
| DB Schema — 6 tables     | ~2,500 tokens | ~350 tokens |  **86%**  |
| Story File — 5 variants  | ~1,200 tokens | ~180 tokens |  **85%**  |
| i18n — 30 keys × 3 langs | ~3,500 tokens | ~400 tokens |  **89%**  |
| E2E — 8 test cases       | ~2,800 tokens | ~350 tokens |  **88%**  |

---

### Preview Sandbox Security

Generated HTML runs in a fully sandboxed iframe. The `allow-same-origin` attribute is intentionally omitted:

```mermaid
graph LR
    subgraph parent["Parent (React App) — https://app.example.com"]
        direction TB
        RS[React State]
        GH[generateHtml\nschema → HTML string]
        RS --> GH
    end

    subgraph sandbox["Sandboxed iframe — null origin"]
        direction TB
        DOM[Agent-generated DOM]
        CDN[Tailwind CDN scripts]
        DOM --- CDN
    end

    GH -->|iframe.srcDoc = html\nsandbox='allow-scripts'| sandbox

    subgraph blocked["Blocked by sandbox (no allow-same-origin)"]
        direction TB
        X1[❌ Read parent DOM]
        X2[❌ Access parent cookies]
        X3[❌ Access parent localStorage]
        X4[❌ Credentialed fetch]
        X5[❌ Navigate parent frame]
    end

    sandbox -.->|cannot| blocked
```

---

## Monorepo Package Graph

```mermaid
graph TD
    SCH[packages/schemas\nZod 4.x — all data types\nFormFieldSchema · LayoutNodeSchema\nOpenApiSpec · EmailTemplate\nDbSchema · StoryFile\nI18nStore · TestFile + TestManagerState]

    SER[packages/serializers\nDSL encode/decode per module\nTree utilities: findNode · insertNode\nremoveNode · moveNode · applyTheme\ngeneratePlaywrightSpec · generatePageObject\ngeneratePlaywrightConfig]

    SCH -->|workspace:*| SER
    SCH -->|workspace:*| WEB
    SCH -->|workspace:*| WORKER

    SER -->|workspace:*| WEB
    SER -->|workspace:*| WORKER

    subgraph WEB[apps/web\nReact 19 + Vite 5 + TanStack Router]
        direction TB
        ROUTES[routes/ — 8 module pages\n+ ChatPanel + PreviewFrame]
        MODULES[modules/ — 8 builder panels]
        HOOKS[hooks/ — useBuilderAgent · useMode]
        CTX[context/ — toolDispatch · per-module]
        ROUTES --- MODULES
        MODULES --- HOOKS
        MODULES --- CTX
    end

    subgraph WORKER[apps/worker\nCloudflare Worker + Durable Object]
        direction TB
        AGENT[agent.ts — BuilderAgent DO\nmode routing · streamText · maxSteps:10]
        PROMPTS[prompts/ — 8 system prompts]
        TOOLS[tools/ — 8 tool sets\nschema-only, no execute]
        RAG[rag/retrieve.ts\nUpstash Vector client]
        OBS[observability.ts\nBraintrust logger]
        AGENT --- PROMPTS
        AGENT --- TOOLS
        AGENT --- RAG
        AGENT --- OBS
    end
```

---

## Implementation Status

| Module                      | Schema | DSL | React UI | Tests | Worker Tools | Worker Prompt |
| --------------------------- | :----: | :-: | :------: | :---: | :----------: | :-----------: |
| **Form Builder**            |   ✅   | ✅  |    ✅    |  ✅   |      ✅      |      ✅       |
| **Layout Builder**          |   ✅   | ✅  |    ✅    |  ✅   |      ✅      |      ✅       |
| **API Schema Builder**      |   ✅   | ✅  |    ✅    |  ✅   |      ✅      |      ✅       |
| **Email Template Builder**  |   ✅   | ✅  |    ✅    |  🔲   |      ✅      |      ✅       |
| **DB Schema Builder**       |   ✅   | ✅  |    ✅    |  🔲   |      ✅      |      ✅       |
| **Component Story Builder** |   ✅   | ✅  |    ✅    |  🔲   |      ✅      |      ✅       |
| **i18n Manager**            |   ✅   | ✅  |    ✅    |  🔲   |      ✅      |      ✅       |
| **E2E Test Generator**      |   ✅   | ✅  |    ✅    |  🔲   |      ✅      |      ✅       |
| App Shell / Chat / Routing  |   —    |  —  |    ✅    |  ✅   |      —       |       —       |
| Eval Harness                |   —    |  —  |    —     |   —   |      🔲      |       —       |

✅ Complete · 🔲 Planned

---

## Module Reference

### Form Builder

Generates and edits typed HTML forms from natural language.

**Schema:** `FormField` (13 types) · `ValidationRule` (8 types) → `FormSchema`

**Tools:**

| Tool            | Args                       | Effect                         |
| --------------- | -------------------------- | ------------------------------ |
| `addField`      | `{ field, afterFieldId? }` | Insert Zod-validated field     |
| `removeField`   | `{ fieldId }`              | Delete field by ID             |
| `updateField`   | `{ fieldId, updates }`     | Partial field update           |
| `reorderFields` | `{ orderedIds }`           | Reorder all fields by ID array |
| `querySchema`   | —                          | Return compact DSL string      |

**Field types:** `text · email · password · number · tel · textarea · select · multiselect · checkbox · radio · date · file · hidden`

**Exports:** JSON Schema · React TSX (react-hook-form) · Semantic HTML

---

### Layout Builder

Builds Tailwind CSS page layouts as a typed recursive `LayoutNode` tree.

**Schema:** `LayoutNode` (16 types, `z.lazy` recursive) · `LayoutTree`

**Tools:**

| Tool                 | Args                                   | Effect                    |
| -------------------- | -------------------------------------- | ------------------------- |
| `addComponent`       | `{ node, parentId?, afterSiblingId? }` | Insert Zod-validated node |
| `removeComponent`    | `{ nodeId }`                           | Remove node + subtree     |
| `updateClasses`      | `{ nodeId, classes, mode }`            | replace / merge / remove  |
| `updateContent`      | `{ nodeId, content }`                  | Update text content       |
| `nestComponent`      | `{ nodeId, newParentId }`              | Move node to new parent   |
| `reorderComponents`  | `{ parentId, orderedIds }`             | Reorder children          |
| `duplicateComponent` | `{ nodeId }`                           | Clone at same level       |
| `applyTheme`         | `{ colorScheme?, accentColor? }`       | Walk tree, apply theme    |
| `queryLayout`        | —                                      | Return compact DSL string |

**Exports:** HTML (Tailwind CDN) · React JSX · JSON

---

### API Schema Builder

Builds OpenAPI 3.1 specifications. Includes undo/redo, named snapshots, built-in linter, and 7 export formats.

**Schema:** `OpenApiSpec` · `ApiEndpoint` · `ApiSchemaObject` · `SecurityScheme`

**Tools:** `querySpec · updateSpec · addEndpoint · removeEndpoint · updateEndpoint · reorderEndpoints · setRequestBody · addSchemaObject · updateSchemaObject · removeSchemaObject · addTag · removeTag · generateMockData · retrieveDocs`

**Built-in linter (8 rules, 3 severity levels):**

| Rule                               | Level   |
| ---------------------------------- | ------- |
| Duplicate method + path            | error   |
| GET by-ID without 404 response     | warning |
| Non-kebab-case path segment        | warning |
| Missing summary                    | warning |
| POST/PUT/PATCH without requestBody | info    |
| Mutating endpoint without auth     | info    |
| No 5xx response defined            | info    |
| Tag used but not defined           | warning |

Health score = `100 - (errors × 20) - (warnings × 5) - (infos × 1)`, clamped 0–100.

**Exports:** OpenAPI JSON · OpenAPI YAML · Postman Collection · DSL · TypeScript SDK · cURL Script · Python SDK

---

### Email Template Builder

Builds responsive HTML email templates section by section. Simulates 4 email clients.

**Schema:** `EmailSection` (discriminated union, 8 types) → `EmailTemplate`

**Tools:** `queryTemplate · updateSubject · addSection · updateSection · removeSection · reorderSections · setClientMode · clearTemplate`

**Client previews:** Desktop · Mobile · Outlook (MSO tables) · Dark mode (CSS injection)

**Exports:** HTML · DSL · JSON

---

### Component Story Builder

Generates Storybook CSF3 `.stories.tsx` files with multi-file management.

**Schema:** `StoryFile` (variants · argTypes · decorators · tags) → `StoryManagerState`

**Tools:** `queryStory · setComponent · addVariant · updateVariant · removeVariant · addArgType · removeArgType · addDecorator · addTag · createStoryFile · switchStoryFile · removeStoryFile`

**Features:** Undo/redo · localStorage persist · 5 presets · 8 decorator presets · import from `.stories.tsx` · 4-tab UI (Variants / Controls / Preview / Code)

---

### i18n Manager

Manages translation keys across multiple locales with namespace support.

**Schema:** `I18nKey` · `I18nNamespace` · `I18nStore` · `I18nManagerState` (multi-locale)

**Tools:** `queryStore · addLanguage · removeLanguage · addKey · updateTranslation · removeKey · addNamespace`

**Features:** Missing translation detection · namespace organisation · import from JSON · multi-file export

---

### E2E Test Generator

Generates Playwright `.spec.ts` test files with full multi-file management.

**Schema:** `TestStep` (13 action types) · `TestCase` (+ `beforeEach`) · `TestFile` → `TestManagerState`

**Step types:** `navigate · click · fill · select · check · hover · press · upload · scroll · wait · screenshot · axe · expect`

**Expect types:** `visible · hidden · text · url · count · value · attribute · enabled · disabled · checked`

**Tools:** `querySpec · setFileInfo · addTestCase · updateTestCase · removeTestCase · duplicateTestCase · addStep · updateStep · removeStep · reorderSteps · addBeforeEachStep · reorderTestCases · createTestFile · switchTestFile · removeTestFile · retrieveDocs`

**Features:** Undo/redo · localStorage persist · 5 preset test suites · expand-all/collapse-all · per-step delete · 3-tab UI (Tests / Code / Config)

**Exports:** `.spec.ts` · Page Object Model class · `playwright.config.ts` · DSL · JSON

---

## DSL Examples

### API DSL

```
API: Product API v1.0.0 | baseUrl:https://api.example.com | auth:BearerJWT

TAGS: products(Product catalog), orders(Order management)

GET     /products          → 200:Product[], 500:ServerError
POST    /products          → 201:Product, 400:ValidationError  [body:CreateProductInput] [auth]
GET     /products/{id}     → 200:Product, 404:NotFound
PUT     /products/{id}     → 200:Product, 404:NotFound  [body:UpdateProductInput] [auth]
DELETE  /products/{id}     → 204:NoContent, 404:NotFound  [auth]

SCHEMA Product
  id!: string
  name!: string
  price!: number
  category: string
```

### Email DSL

```
EMAIL: Welcome Campaign | subject:Welcome to {{company}}!
header | bg:#1a1a2e
  logo | src:{{logoUrl}} | alt:Logo | width:120
hero | headline:Welcome, {{firstName}}! | sub:You're in.
text | Let's get you set up in under 5 minutes.
button | label:Get Started | href:{{ctaUrl}} | bg:#6366f1
footer | company:{{company}} | year:2026
```

### Storybook DSL

```
STORY: Button | path:src/components/Button.tsx | layout:centered
TAGS: autodocs
ARGTYPE: label | text | default:"Click me"
ARGTYPE: variant | select | opts:primary,secondary,danger | default:primary
ARGTYPE: disabled | boolean | default:false
VARIANT: Primary | label:"Click me" | variant:primary
VARIANT: Disabled | label:"Click me" | disabled:true
DECORATOR: ThemeProvider
```

### E2E DSL

```
FILE: auth.spec.ts | url:http://localhost:3000
DESCRIBE: Authentication flows

TEST: User can log in with valid credentials [smoke,auth]
  NAVIGATE /login
  FILL [label="Email"] → "user@example.com"
  FILL [label="Password"] → "password123"
  CLICK [role="button"]
  EXPECT url "/dashboard"

TEST: User sees error with invalid credentials [auth]
  NAVIGATE /login
  FILL [label="Email"] → "wrong@example.com"
  FILL [label="Password"] → "wrongpass"
  CLICK [role="button"]
  EXPECT [text="Invalid credentials"] visible
```

### i18n DSL

```
STORE: 3 langs | en(default) · pl · de | 2 namespaces

NS: common
  KEY: app.title
    en: "AI Platform Builder"
    pl: "Konstruktor Platformy AI"
    de: "KI-Plattform-Builder"
  KEY: nav.login
    en: "Sign in"
    pl: "Zaloguj się"
    de: "Anmelden"

NS: auth
  KEY: login.email
    en: "Email address"
    pl: "Adres e-mail"
    de: "E-Mail-Adresse"
  KEY: login.submit
    en: "Sign in"
    pl: "Zaloguj"
    de: ⚠ MISSING
```

---

## Technology Stack

### Frontend

| Concern       | Technology             | Version | Notes                                      |
| ------------- | ---------------------- | ------- | ------------------------------------------ |
| Framework     | React                  | 19.x    | Concurrent features, strict mode           |
| Build         | Vite                   | 5.x     | Fast HMR, native ESM                       |
| Language      | TypeScript             | 5.x     | `strict: true`, zero `any`                 |
| Routing       | TanStack Router        | 1.x     | File-based, fully type-safe                |
| Styling       | Tailwind CSS           | 4.x     | Also the _output target_ of Layout Builder |
| Components    | shadcn/ui              | latest  | new-york style, neutral base               |
| Layout panels | react-resizable-panels | —       | 3-panel: Chat / Builder / Preview          |
| Drag & drop   | @dnd-kit               | 6.x     | Form fields + email sections               |
| ID generation | nanoid                 | 5.x     | `ep_abc123`, `f_xyz789`, `tc_def456`       |
| Markdown      | react-markdown         | —       | Assistant responses                        |

### Backend & Agent

| Concern           | Technology          | Notes                                                |
| ----------------- | ------------------- | ---------------------------------------------------- |
| Runtime           | Cloudflare Workers  | V8 isolates, globally distributed at edge            |
| Stateful sessions | Durable Objects     | One DO per user, WebSocket hibernation               |
| Agent SDK         | @cloudflare/ai-chat | `AIChatAgent` base class, `useAgentChat`             |
| AI SDK            | Vercel AI SDK 4.x   | `streamText`, `tool`, `maxSteps`                     |
| LLM primary       | Claude Sonnet 4.6   | Best tool-calling; used when `ANTHROPIC_API_KEY` set |
| LLM fallback      | OpenAI GPT-4o       | When only `OPENAI_API_KEY` is available              |
| Embeddings        | text-embedding-3    | 1536-dim, Upstash Vector indexing                    |

### Data & Validation

| Concern             | Technology     | Notes                                           |
| ------------------- | -------------- | ----------------------------------------------- |
| Schema validation   | Zod 4.x        | Types + runtime guards + tool params + exports  |
| Vector DB           | Upstash Vector | Serverless HTTP REST (CF Workers compatible)    |
| Context compression | Custom DSL     | 85–90% token reduction vs raw JSON              |
| Persistence         | localStorage   | Per-module state + named snapshots (max 5)      |
| Email delivery      | Resend API     | Send-test endpoint, Vite proxies `/api` → :8787 |

### Quality & Infrastructure

| Concern        | Technology            | Notes                                                     |
| -------------- | --------------------- | --------------------------------------------------------- |
| Unit tests     | Vitest 2.x            | jsdom, @testing-library/react, 161 passing                |
| Evals          | Braintrust            | Experiments, traces, prompt versioning                    |
| Linting        | ESLint 9              | Flat config, typescript-eslint strict, `--max-warnings=0` |
| Formatting     | Prettier 3            | `prettier-plugin-tailwindcss`                             |
| Git hooks      | Husky + lint-staged   | Pre-commit: ESLint · Pre-push: `tsc --noEmit`             |
| Commits        | Commitlint            | Conventional commits                                      |
| Monorepo       | pnpm workspaces       | `workspace:*` linking, single lockfile                    |
| Build pipeline | Turborepo 2.x         | Cached builds, parallel tasks, dependency-ordered         |
| CI/CD          | GitHub Actions        | PR: lint → type-check → test → build                      |
| Deployment     | Cloudflare Pages + DO | Automated on merge to `main`                              |

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
# Frontend only (localhost:5173) — uses mock agent responses
pnpm --filter @ai-builder/web dev

# Worker (Miniflare at localhost:8787)
pnpm --filter @ai-builder/worker dev

# Both concurrently (Vite proxies /api and /agents/* → :8787)
pnpm dev
```

### Build

```bash
# All packages — Turborepo resolves dependency order and uses build cache
pnpm build

# Single package
pnpm --filter @ai-builder/web build
pnpm --filter @ai-builder/schemas build
pnpm --filter @ai-builder/serializers build
```

### Deploy

```bash
# Set worker secrets
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put UPSTASH_URL
wrangler secret put UPSTASH_TOKEN
wrangler secret put BRAINTRUST_API_KEY
wrangler secret put RESEND_API_KEY

# Deploy worker
pnpm --filter @ai-builder/worker deploy

# Deploy frontend (Cloudflare Pages — or set up via GitHub integration)
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

# Type check (pre-push gate)
pnpm type-check

# Lint (pre-commit gate, zero warnings allowed)
pnpm lint
```

### Test Coverage by File

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

| #   | Decision                    | Choice                                              | Rationale                                                                                                      |
| --- | --------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | **Agent runtime**           | Cloudflare Durable Objects                          | One stateful session per user, globally distributed, WebSocket hibernation — CPU cost = 0 between frames       |
| 2   | **Tool execution location** | Client-side only (no `execute`)                     | Zero-latency preview updates; state stays in React; no round-trip serialization for large schemas              |
| 3   | **Context compression**     | Custom compact DSL per module                       | 85–90% token reduction vs raw JSON; fits multi-field specs in a single context window                          |
| 4   | **Schema validation**       | Zod everywhere with `.nullable().default(null)`     | Single schema → types + guards + tool params. `.default(null)` is critical: agent-omitted fields must not fail |
| 5   | **Preview isolation**       | `sandbox="allow-scripts"` (no `allow-same-origin`)  | Agent-generated HTML cannot access parent origin, cookies, or localStorage                                     |
| 6   | **Conversation history**    | Sliding window (max 20 messages)                    | Prevents unbounded context growth; DSL re-injected per message provides fresh state without replay             |
| 7   | **Primary LLM**             | Claude Sonnet 4.6 with GPT-4o fallback              | Claude's superior tool-calling and instruction-following; fallback ensures deployability without Anthropic key |
| 8   | **State management**        | Local React state + Context (no Redux/Zustand)      | Each module is isolated; no cross-module state; Context is sufficient; no additional bundle weight             |
| 9   | **Tool dispatcher**         | Single mutable ref via Context                      | No re-renders on register; always points to the mounted module's handler; safe across route transitions        |
| 10  | **Monorepo tooling**        | pnpm workspaces + Turborepo                         | Hard-linked installs, cached builds, incremental pipelines — `pnpm build` orders automatically                 |
| 11  | **Undo/redo**               | `past[]` / `future[]` arrays, `MAX_HISTORY = 20-50` | O(1) push/pop, bounded memory, no external library needed                                                      |
| 12  | **Multi-file state**        | `ManagerState = { files[], activeFileId }`          | Story Builder, i18n, E2E all need multiple output files; consistent pattern across all three                   |
| 13  | **Step IDs in E2E schema**  | Every `TestStep` has a stable `id`                  | Enables ID-based removal and update (`removeStep`, `updateStep`) instead of fragile index-based mutation       |
| 14  | **Agentic loop limit**      | `maxSteps: 10`                                      | Allows complex multi-tool sequences (e.g., set file + add 8 test cases + reorder) without infinite loops       |
