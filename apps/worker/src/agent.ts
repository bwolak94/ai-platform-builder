import { AIChatAgent } from "@cloudflare/ai-chat";
import type { Connection, WSMessage } from "agents";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { Env, BuilderMode, Context } from "./types";
import { IncomingMessageSchema, BUILDER_MODES } from "./types";
import { buildSystemPrompt } from "./prompts";
import { getToolsForMode } from "./tools";
import { buildRetrieveDocsTool } from "./rag/retrieve";
import { buildI18nServerTools } from "./tools/i18n-server-tools";
import { createLogger } from "./observability";

export class BuilderAgent extends AIChatAgent<Env> {
  private mode: BuilderMode = "form";
  private context: Context = {};

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
        tools: { ...modeTools, retrieveDocs: retrieveDocsTool, ...i18nServerTools },
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
