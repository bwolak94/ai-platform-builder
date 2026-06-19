import { AIChatAgent } from "@cloudflare/ai-chat";
import type { Connection, WSMessage } from "agents";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { nanoid } from "nanoid";
import type { Env, BuilderMode, Context, SnapshotEntry } from "./types";
import { IncomingMessageSchema, BUILDER_MODES } from "./types";
import { buildSystemPrompt } from "./prompts";
import { getToolsForMode } from "./tools";
import { buildRetrieveDocsTool } from "./rag/retrieve";
import { buildI18nServerTools } from "./tools/i18n-server-tools";
import { buildChatServerTools } from "./tools/chat-server-tools";
import { createLogger } from "./observability";

const MAX_SNAPSHOTS = 20;
const SNAPSHOTS_KEY = "snapshots";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export class BuilderAgent extends AIChatAgent<Env> {
  private mode: BuilderMode = "form";
  private context: Context = {};

  // ─── Snapshot storage ───────────────────────────────────────────────────────

  private async loadSnapshots(): Promise<SnapshotEntry[]> {
    const stored = await this.ctx.storage.get<SnapshotEntry[]>(SNAPSHOTS_KEY);
    return stored ?? [];
  }

  private async persistSnapshots(entries: SnapshotEntry[]): Promise<void> {
    await this.ctx.storage.put(SNAPSHOTS_KEY, entries);
  }

  private async handleListSnapshots(): Promise<Response> {
    const entries = await this.loadSnapshots();
    return json(entries);
  }

  private async handleSaveSnapshot(request: Request): Promise<Response> {
    let body: { name?: unknown; context?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (typeof body.name !== "string" || !body.name.trim()) {
      return json({ error: "name is required" }, 400);
    }

    const entry: SnapshotEntry = {
      id: `snap_${nanoid(8)}`,
      name: body.name.trim(),
      createdAt: Date.now(),
      context:
        typeof body.context === "object" && body.context !== null ? body.context : this.context,
    };

    const existing = await this.loadSnapshots();
    // Prepend newest, cap at MAX_SNAPSHOTS
    const updated = [entry, ...existing].slice(0, MAX_SNAPSHOTS);
    await this.persistSnapshots(updated);

    return json(entry, 201);
  }

  private async handleDeleteSnapshot(id: string): Promise<Response> {
    const existing = await this.loadSnapshots();
    const updated = existing.filter((s) => s.id !== id);

    if (updated.length === existing.length) {
      return json({ error: "Snapshot not found" }, 404);
    }

    await this.persistSnapshots(updated);
    return json({ deleted: id });
  }

  // ─── DO fetch — intercept snapshot HTTP routes ───────────────────────────────

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === "/snapshots") {
      if (request.method === "GET") return this.handleListSnapshots();
      if (request.method === "POST") return this.handleSaveSnapshot(request);
    }

    if (url.pathname.startsWith("/snapshots/") && request.method === "DELETE") {
      const id = url.pathname.slice("/snapshots/".length);
      if (id) return this.handleDeleteSnapshot(id);
    }

    return super.fetch(request);
  }

  override async onMessage(connection: Connection, message: WSMessage): Promise<void> {
    const raw = typeof message === "string" ? message : null;
    if (!raw) {
      return super.onMessage(connection, message);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return super.onMessage(connection, message);
    }

    const result = IncomingMessageSchema.safeParse(parsed);
    if (!result.success) {
      return super.onMessage(connection, message);
    }

    const data = result.data;

    if (data.type === "set_mode") {
      this.mode = data.mode;
      return;
    }

    if (data.type === "update_context") {
      this.context = { ...this.context, ...data.context };
      return;
    }

    if (data.type === "save_snapshot") {
      const entry: SnapshotEntry = {
        id: `snap_${nanoid(8)}`,
        name: data.name,
        createdAt: Date.now(),
        context: this.context,
      };
      const existing = await this.loadSnapshots();
      await this.persistSnapshots([entry, ...existing].slice(0, MAX_SNAPSHOTS));
      return;
    }

    return super.onMessage(connection, message);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override async onChatMessage(onFinish: any, _options?: any): Promise<Response | undefined> {
    console.log("[BuilderAgent] onChatMessage called, messages:", this.messages.length);
    try {
      const startMs = Date.now();
      const { context, env } = this;

      // Derive mode from the DO room name (set to mode in useAgent({ name: mode })).
      // This is always reliable and eliminates the set_mode race condition where the
      // DO defaults to "form" before the set_mode WebSocket message arrives.
      const roomName = this.name as BuilderMode | undefined;
      const mode: BuilderMode = roomName && BUILDER_MODES.includes(roomName) ? roomName : this.mode;

      const logger = createLogger(env);
      const systemPrompt = buildSystemPrompt(mode, context);
      const modeTools = getToolsForMode(mode);

      // retrieveDocs runs server-side (calls Upstash); all other tools are client-side
      const retrieveDocsTool = buildRetrieveDocsTool(env.UPSTASH_URL, env.UPSTASH_TOKEN);

      // autoTranslate is a server-side i18n-only tool — only added in i18n mode
      const i18nServerTools =
        mode === "i18n" && env.ANTHROPIC_API_KEY ? buildI18nServerTools(env.ANTHROPIC_API_KEY) : {};

      // Chat server tools: 15 tools that run on the worker (web search, LLM sub-calls, etc.)
      const chatServerTools =
        mode === "chat" && env.ANTHROPIC_API_KEY
          ? buildChatServerTools(env.ANTHROPIC_API_KEY, env.BRAVE_API_KEY)
          : {};

      // Prefer Claude when ANTHROPIC_API_KEY is set, fall back to GPT-4o
      const model = env.ANTHROPIC_API_KEY
        ? createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })("claude-sonnet-4-6")
        : createOpenAI({ apiKey: env.OPENAI_API_KEY })("gpt-4o");

      console.log(
        "[BuilderAgent] using model:",
        env.ANTHROPIC_API_KEY ? "claude-sonnet-4-6" : "gpt-4o"
      );

      // ai@6: convertToModelMessages handles UIMessage → ModelMessage conversion natively
      const messages = await convertToModelMessages(this.messages);

      console.log("[BuilderAgent] messages count:", messages.length);

      const result = streamText({
        model,
        system: systemPrompt,
        messages,
        tools: {
          ...modeTools,
          retrieveDocs: retrieveDocsTool,
          ...i18nServerTools,
          ...chatServerTools,
        },
        stopWhen: stepCountIs(10),
        onFinish: async (finishResult) => {
          console.log("[BuilderAgent] stream finished, finish reason:", finishResult.finishReason);
          logger?.logSpan({
            mode,
            messageCount: this.messages.length,
            usage: {
              promptTokens: finishResult.usage.inputTokens ?? 0,
              completionTokens: finishResult.usage.outputTokens ?? 0,
            },
            durationMs: Date.now() - startMs,
          });
          // Notify the base class so it can persist messages
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          await onFinish(finishResult);
        },
      });

      return result.toUIMessageStreamResponse();
    } catch (err) {
      console.error("[BuilderAgent] onChatMessage error:", err);
      throw err;
    }
  }
}
