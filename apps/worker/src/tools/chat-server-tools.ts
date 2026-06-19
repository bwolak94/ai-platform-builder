import { tool, generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

// ─── Brave Search response schema ─────────────────────────────────────────────

const BraveWebResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string().optional().default(""),
});
const BraveResponseSchema = z.object({
  web: z.object({ results: z.array(BraveWebResultSchema) }).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractJson(text: string): string {
  const m = /(\{[\s\S]*\}|\[[\s\S]*\])/.exec(text);
  return m ? m[0] : text;
}

async function llm(
  anthropic: ReturnType<typeof createAnthropic>,
  prompt: string,
  maxTokens = 2048
): Promise<string> {
  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    prompt,
    maxOutputTokens: maxTokens,
  });
  return text.trim();
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function buildChatServerTools(anthropicApiKey: string, braveApiKey?: string) {
  const anthropic = createAnthropic({ apiKey: anthropicApiKey });

  return {
    // ── 1. searchWeb ──────────────────────────────────────────────────────────
    searchWeb: tool({
      description:
        "Search the web for real-time information using Brave Search. " +
        "Returns the top results with title, URL, and description. " +
        "Use for current events, documentation, and facts that may be beyond training data.",
      inputSchema: z.object({
        query: z.string().describe("Search query"),
        count: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .default(5)
          .describe("Number of results (1–10)"),
      }),
      execute: async ({ query, count }) => {
        if (!braveApiKey) {
          return {
            error:
              "BRAVE_API_KEY is not configured on the worker. " +
              "Add it as a secret: wrangler secret put BRAVE_API_KEY",
            results: [],
          };
        }
        try {
          const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${String(count)}`;
          const res = await fetch(url, {
            headers: {
              Accept: "application/json",
              "Accept-Encoding": "gzip",
              "X-Subscription-Token": braveApiKey,
            },
          });
          if (!res.ok) {
            return { error: `Brave Search returned ${String(res.status)}`, results: [] };
          }
          const raw: unknown = await res.json();
          const parsed = BraveResponseSchema.safeParse(raw);
          if (!parsed.success) {
            return { error: "Unexpected Brave Search response format", results: [] };
          }
          const results = (parsed.data.web?.results ?? []).map((r) => ({
            title: r.title,
            url: r.url,
            description: r.description,
          }));
          return { query, results };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Search failed", results: [] };
        }
      },
    }),

    // ── 2. fetchPage ──────────────────────────────────────────────────────────
    fetchPage: tool({
      description:
        "Fetch the content of a public web page and return the main text as plain prose. " +
        "Strips scripts, styles, and navigation boilerplate. Content is capped at 8 000 chars.",
      inputSchema: z.object({
        url: z.url().describe("The URL to fetch"),
      }),
      execute: async ({ url }) => {
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; AIBuilder/1.0)" },
            redirect: "follow",
          });
          if (!res.ok) return { error: `HTTP ${String(res.status)}`, url, title: "", content: "" };
          const html = await res.text();
          const titleMatch = /<title[^>]*>([^<]{1,200})<\/title>/i.exec(html);
          const title = titleMatch?.[1]?.trim() ?? "";
          const content = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim()
            .slice(0, 8000);
          return { url, title, content };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Fetch failed",
            url,
            title: "",
            content: "",
          };
        }
      },
    }),

    // ── 3. generateMockData ───────────────────────────────────────────────────
    generateMockData: tool({
      description:
        "Generate a JSON array of realistic fake data based on a plain-English schema description. " +
        "E.g. '10 users with id, name, email, role (admin|viewer), createdAt'",
      inputSchema: z.object({
        description: z
          .string()
          .describe(
            "Plain-English description of the data, e.g. '5 products with id, name, price, category'"
          ),
        count: z.number().int().min(1).max(50).optional().default(5),
      }),
      execute: async ({ description, count }) => {
        const prompt =
          `Generate exactly ${String(count)} realistic JSON objects matching this schema: ${description}\n\n` +
          `Return ONLY a valid JSON array — no explanation, no markdown fences. ` +
          `Use realistic values (real-sounding names, valid emails, plausible prices, etc).`;
        try {
          const text = await llm(anthropic, prompt, 2048);
          const json = extractJson(text);
          return { data: json, count };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Generation failed", data: "[]" };
        }
      },
    }),

    // ── 4. formatCode ─────────────────────────────────────────────────────────
    formatCode: tool({
      description:
        "Reformat / prettify a code snippet according to standard conventions for the given language. " +
        "Handles TypeScript, JavaScript, Python, SQL, JSON, CSS, HTML, and more.",
      inputSchema: z.object({
        code: z.string().describe("Code to format"),
        language: z.string().describe("Language name, e.g. typescript, python, sql"),
      }),
      execute: async ({ code, language }) => {
        const prompt =
          `Reformat the following ${language} code according to standard conventions. ` +
          `Return ONLY the formatted code — no explanation, no markdown fences.\n\n${code}`;
        try {
          const formatted = await llm(anthropic, prompt, 2048);
          return { formatted, language };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Formatting failed",
            formatted: code,
          };
        }
      },
    }),

    // ── 5. generateTests ─────────────────────────────────────────────────────
    generateTests: tool({
      description:
        "Generate unit tests for a function, class, or module. " +
        "Returns a complete test file with happy-path, edge-case, and error-case tests.",
      inputSchema: z.object({
        code: z.string().describe("The source code to test"),
        framework: z
          .enum(["vitest", "jest", "mocha", "pytest", "go-test"])
          .optional()
          .default("vitest")
          .describe("Test framework"),
        context: z.string().optional().describe("Extra context about what the code should do"),
      }),
      execute: async ({ code, framework, context }) => {
        const ctx = context ? `\nContext: ${context}` : "";
        const prompt =
          `Write comprehensive ${framework} unit tests for the following code.${ctx}\n\n` +
          `Include happy-path tests, edge cases, and error cases. ` +
          `Return ONLY the test file content — no explanation, no markdown fences.\n\n${code}`;
        try {
          const tests = await llm(anthropic, prompt, 3000);
          return { tests, framework };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Generation failed", tests: "" };
        }
      },
    }),

    // ── 6. convertCode ────────────────────────────────────────────────────────
    convertCode: tool({
      description:
        "Transpile or port code from one language/framework to another. " +
        "E.g. Python → TypeScript, Mongoose schema → Prisma schema, REST handler → tRPC procedure.",
      inputSchema: z.object({
        code: z.string().describe("Source code to convert"),
        from: z.string().describe("Source language/framework, e.g. python, mongoose, REST"),
        to: z.string().describe("Target language/framework, e.g. typescript, prisma, trpc"),
      }),
      execute: async ({ code, from, to }) => {
        const prompt =
          `Convert the following ${from} code to ${to}. ` +
          `Preserve all logic, add idiomatic ${to} patterns, and keep comments. ` +
          `Return ONLY the converted code — no explanation, no markdown fences.\n\n${code}`;
        try {
          const converted = await llm(anthropic, prompt, 3000);
          return { converted, from, to };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Conversion failed", converted: "" };
        }
      },
    }),

    // ── 7. explainError ───────────────────────────────────────────────────────
    explainError: tool({
      description:
        "Analyse an error message and optional stack trace, then return a root-cause explanation, " +
        "a concrete fix, and relevant documentation hints.",
      inputSchema: z.object({
        error: z.string().describe("The error message"),
        stack: z.string().optional().describe("Stack trace (optional)"),
        context: z.string().optional().describe("Code or environment context"),
      }),
      execute: async ({ error, stack, context }) => {
        const stackPart = stack ? `\n\nStack trace:\n${stack}` : "";
        const ctxPart = context ? `\n\nContext:\n${context}` : "";
        const prompt =
          `Analyse this error and provide:\n1. Root cause (1–2 sentences)\n2. Concrete fix (code snippet if helpful)\n3. Docs/search terms\n\n` +
          `Error: ${error}${stackPart}${ctxPart}\n\n` +
          `Format the response as JSON: {"cause":"...","fix":"...","docs":"..."}`;
        try {
          const text = await llm(anthropic, prompt, 1024);
          const json = extractJson(text);
          const parsed = JSON.parse(json) as { cause: string; fix: string; docs?: string };
          return parsed;
        } catch {
          return { cause: "Could not parse structured response", fix: "", docs: "" };
        }
      },
    }),

    // ── 8. summarize ─────────────────────────────────────────────────────────
    summarize: tool({
      description:
        "Condense a long piece of text to a target length. " +
        "Supports bullet-point, paragraph, and ELI5 styles.",
      inputSchema: z.object({
        text: z.string().describe("Text to summarise"),
        maxWords: z
          .number()
          .int()
          .min(20)
          .max(500)
          .optional()
          .default(100)
          .describe("Target summary length in words"),
        style: z
          .enum(["paragraph", "bullets", "eli5"])
          .optional()
          .default("paragraph")
          .describe("Summary style"),
      }),
      execute: async ({ text, maxWords, style }) => {
        const styleInstr =
          style === "bullets"
            ? "as concise bullet points"
            : style === "eli5"
              ? "as if explaining to a 10-year-old"
              : "as a single paragraph";
        const prompt =
          `Summarise the following text ${styleInstr} in at most ${String(maxWords)} words. ` +
          `Return ONLY the summary — no preamble.\n\n${text}`;
        try {
          const summary = await llm(anthropic, prompt, 1024);
          return { summary, style, wordCount: summary.split(/\s+/).length };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Summarisation failed",
            summary: "",
          };
        }
      },
    }),

    // ── 9. translateText ──────────────────────────────────────────────────────
    translateText: tool({
      description:
        "Translate text into any language with optional formality control. " +
        "Returns the translation and detected source language.",
      inputSchema: z.object({
        text: z.string().describe("Text to translate"),
        targetLanguage: z
          .string()
          .describe("Target language name or ISO code, e.g. 'French', 'de', 'ja'"),
        formality: z
          .enum(["formal", "informal", "neutral"])
          .optional()
          .default("neutral")
          .describe("Tone of the translation"),
      }),
      execute: async ({ text, targetLanguage, formality }) => {
        const formalityNote = formality !== "neutral" ? ` Use a ${formality} register.` : "";
        const prompt =
          `Translate the following text into ${targetLanguage}.${formalityNote} ` +
          `Return a JSON object: {"translation":"...","detectedSource":"..."}. No explanation.\n\n${text}`;
        try {
          const raw = await llm(anthropic, prompt, 1024);
          const json = extractJson(raw);
          const parsed = JSON.parse(json) as { translation: string; detectedSource: string };
          return { ...parsed, targetLanguage, formality };
        } catch {
          return {
            translation: "",
            detectedSource: "unknown",
            targetLanguage,
            error: "Translation parsing failed",
          };
        }
      },
    }),

    // ── 10. extractStructuredData ─────────────────────────────────────────────
    extractStructuredData: tool({
      description:
        "Extract typed fields from unstructured text according to a plain-English schema. " +
        "E.g. extract {title, salary, stack[]} from a job posting.",
      inputSchema: z.object({
        text: z.string().describe("Unstructured source text"),
        schema: z
          .string()
          .describe(
            "Plain-English schema description, e.g. '{name: string, price: number, tags: string[]}'"
          ),
      }),
      execute: async ({ text, schema }) => {
        const prompt =
          `Extract data from the text below matching this schema: ${schema}\n\n` +
          `Return ONLY a valid JSON object — no explanation, no markdown.\n\n${text}`;
        try {
          const raw = await llm(anthropic, prompt, 1024);
          const json = extractJson(raw);
          return { data: json };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Extraction failed", data: "{}" };
        }
      },
    }),

    // ── 11. generateMermaid ───────────────────────────────────────────────────
    generateMermaid: tool({
      description:
        "Generate a Mermaid.js diagram from a plain-English description. " +
        "Supports flowchart, sequence, ERD, gantt, class, and mindmap diagrams.",
      inputSchema: z.object({
        description: z.string().describe("What the diagram should depict"),
        type: z
          .enum(["flowchart", "sequence", "erd", "gantt", "class", "mindmap", "auto"])
          .optional()
          .default("auto")
          .describe("Diagram type — use 'auto' to let the model choose"),
      }),
      execute: async ({ description, type }) => {
        const typeHint = type === "auto" ? "" : ` Use the Mermaid ${type} diagram type.`;
        const prompt =
          `Create a Mermaid.js diagram for the following:${typeHint}\n\n${description}\n\n` +
          `Return ONLY the raw Mermaid diagram code starting with the diagram type keyword ` +
          `(e.g. 'flowchart TD', 'sequenceDiagram'). No markdown fences, no explanation.`;
        try {
          const diagram = await llm(anthropic, prompt, 2048);
          return { diagram, type };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Generation failed", diagram: "" };
        }
      },
    }),

    // ── 12. generateChangelog ─────────────────────────────────────────────────
    generateChangelog: tool({
      description:
        "Generate a structured CHANGELOG.md section from a list of commit messages. " +
        "Groups changes by feat, fix, chore, docs, and breaking changes.",
      inputSchema: z.object({
        commits: z
          .array(z.string())
          .min(1)
          .describe("Array of commit messages, e.g. ['feat: add login', 'fix: null crash']"),
        version: z
          .string()
          .optional()
          .describe("Version string for the changelog header, e.g. '2.1.0'"),
        date: z.string().optional().describe("Release date in YYYY-MM-DD format"),
      }),
      execute: async ({ commits, version, date }) => {
        const header = version
          ? `## [${version}] — ${date ?? new Date().toISOString().slice(0, 10)}`
          : `## Unreleased — ${date ?? new Date().toISOString().slice(0, 10)}`;
        const prompt =
          `Format these git commits into a CHANGELOG section. ` +
          `Group under ### Added, ### Fixed, ### Changed, ### Removed, ### Breaking as appropriate. ` +
          `Use Keep-a-Changelog format. Header: ${header}\n\nCommits:\n${commits.map((c) => `- ${c}`).join("\n")}\n\n` +
          `Return ONLY the markdown changelog section.`;
        try {
          const changelog = await llm(anthropic, prompt, 1024);
          return { changelog, version, commitCount: commits.length };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Generation failed", changelog: "" };
        }
      },
    }),

    // ── 13. colorPalette ──────────────────────────────────────────────────────
    colorPalette: tool({
      description:
        "Generate an accessible colour palette from a brand description or seed colour. " +
        "Returns hex values, OKLCH equivalents, and WCAG contrast ratios.",
      inputSchema: z.object({
        description: z
          .string()
          .describe(
            "Brand/theme description or a seed hex colour, e.g. 'modern fintech, seed #0066ff'"
          ),
        count: z
          .number()
          .int()
          .min(3)
          .max(12)
          .optional()
          .default(6)
          .describe("Number of colours in the palette"),
      }),
      execute: async ({ description, count }) => {
        const prompt =
          `Generate ${String(count)} accessible brand colours for: ${description}\n\n` +
          `Return a JSON array: [{name, hex, oklch, contrastOnWhite, contrastOnBlack}]. ` +
          `hex = "#rrggbb", oklch = "oklch(L C H)", contrastOnWhite and contrastOnBlack are WCAG 2.1 contrast ratios (e.g. 4.52). ` +
          `No explanation, just the JSON array.`;
        try {
          const raw = await llm(anthropic, prompt, 1024);
          const json = extractJson(raw);
          const palette = JSON.parse(json) as {
            name: string;
            hex: string;
            oklch: string;
            contrastOnWhite: number;
            contrastOnBlack: number;
          }[];
          return { palette, count: palette.length };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Generation failed", palette: [] };
        }
      },
    }),

    // ── 14. createTaskBreakdown ───────────────────────────────────────────────
    createTaskBreakdown: tool({
      description:
        "Decompose a feature description into subtasks with acceptance criteria, " +
        "definition of done, and effort estimates. Returns a markdown checklist.",
      inputSchema: z.object({
        feature: z.string().describe("Feature or user story to break down"),
        stack: z.string().optional().describe("Tech stack context, e.g. 'React, Node, Postgres'"),
        granularity: z
          .enum(["high", "medium", "fine"])
          .optional()
          .default("medium")
          .describe("Level of detail: high = epics, medium = stories, fine = tasks"),
      }),
      execute: async ({ feature, stack, granularity }) => {
        const stackNote = stack ? ` Tech stack: ${stack}.` : "";
        const prompt =
          `Break down this feature into ${granularity}-granularity implementation tasks.${stackNote}\n\nFeature: ${feature}\n\n` +
          `For each task include: task name, acceptance criteria, estimated effort (XS/S/M/L/XL), and technical notes. ` +
          `Format as a markdown checklist. Return ONLY the markdown.`;
        try {
          const tasks = await llm(anthropic, prompt, 2048);
          return { tasks, granularity };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Breakdown failed", tasks: "" };
        }
      },
    }),

    // ── 15. estimateComplexity ────────────────────────────────────────────────
    estimateComplexity: tool({
      description:
        "Estimate the complexity and effort for a feature or change. " +
        "Returns a story-point estimate, risk factors, assumptions, and open questions.",
      inputSchema: z.object({
        feature: z.string().describe("Feature description to estimate"),
        stack: z.string().optional().describe("Tech stack, e.g. 'Next.js, Prisma, Redis'"),
        teamSize: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe("Team size for capacity context"),
      }),
      execute: async ({ feature, stack, teamSize }) => {
        const stackNote = stack ? ` Stack: ${stack}.` : "";
        const teamNote = teamSize ? ` Team size: ${String(teamSize)}.` : "";
        const prompt =
          `Estimate the complexity and effort for this feature:${stackNote}${teamNote}\n\nFeature: ${feature}\n\n` +
          `Return a JSON report: {storyPoints: number, tShirt: "XS"|"S"|"M"|"L"|"XL", ` +
          `risks: string[], assumptions: string[], openQuestions: string[], summary: string}. ` +
          `Use Fibonacci for story points (1,2,3,5,8,13,21). No explanation — only JSON.`;
        try {
          const raw = await llm(anthropic, prompt, 1024);
          const json = extractJson(raw);
          const report = JSON.parse(json) as {
            storyPoints: number;
            tShirt: string;
            risks: string[];
            assumptions: string[];
            openQuestions: string[];
            summary: string;
          };
          return report;
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Estimation failed",
            storyPoints: 0,
            tShirt: "M",
            risks: [],
            assumptions: [],
            openQuestions: [],
            summary: "",
          };
        }
      },
    }),
  };
}
