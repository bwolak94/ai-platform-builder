import { AIChatAgent } from "@cloudflare/agents/ai-chat-agent";
import type { Connection, WSMessage } from "@cloudflare/agents";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { StreamTextOnFinishCallback, ToolSet } from "ai";
import type { Env, BuilderMode, Context } from "./types";
import { IncomingMessageSchema } from "./types";
import { buildSystemPrompt } from "./prompts";
import { getToolsForMode } from "./tools";
import { buildRetrieveDocsTool } from "./rag/retrieve";
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

  // eslint-disable-next-line @typescript-eslint/require-await
  override async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>
  ): Promise<Response | undefined> {
    const startMs = Date.now();
    const { mode, context, env } = this;

    const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
    const logger = createLogger(env);
    const systemPrompt = buildSystemPrompt(mode, context);
    const modeTools = getToolsForMode(mode);

    // retrieveDocs is server-executed (calls Upstash); all other tools are client-side
    const retrieveDocsTool = buildRetrieveDocsTool(env.UPSTASH_URL, env.UPSTASH_TOKEN);

    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: this.messages,
      tools: { ...modeTools, retrieveDocs: retrieveDocsTool },
      maxSteps: 10,
      onFinish: async (finishResult) => {
        logger?.logSpan({
          mode,
          messageCount: this.messages.length,
          usage: {
            promptTokens: finishResult.usage.promptTokens,
            completionTokens: finishResult.usage.completionTokens,
          },
          durationMs: Date.now() - startMs,
        });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
        await (onFinish as any)(finishResult);
      },
    });

    return result.toDataStreamResponse();
  }
}
