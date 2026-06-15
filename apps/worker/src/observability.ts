import type { Env } from "./types";

export interface SpanData {
  mode: string;
  messageCount: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  durationMs?: number;
}

export interface Logger {
  logSpan: (data: SpanData) => void;
}

let braintrustLogger: Logger | null = null;

export function createLogger(env: Env): Logger | null {
  if (env.APP_ENV !== "production") {
    return null;
  }

  if (!env.BRAINTRUST_API_KEY) {
    return null;
  }

  if (braintrustLogger) {
    return braintrustLogger;
  }

  // Braintrust logging — lazy import to avoid issues in non-production
  braintrustLogger = {
    logSpan: (data: SpanData) => {
      // Fire-and-forget: log to Braintrust without blocking the response
      queueMicrotask(() => {
        try {
          const payload = {
            project_name: "ai-platform-builder",
            experiment_name: `prod-${new Date().toISOString().slice(0, 10)}`,
            input: { mode: data.mode, messageCount: data.messageCount },
            metadata: {
              promptTokens: data.usage?.promptTokens ?? 0,
              completionTokens: data.usage?.completionTokens ?? 0,
              totalTokens: data.usage?.totalTokens ?? 0,
              durationMs: data.durationMs ?? 0,
            },
          };

          void fetch("https://api.braintrust.dev/v1/experiment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.BRAINTRUST_API_KEY}`,
            },
            body: JSON.stringify(payload),
          });
        } catch {
          // Observability must not crash the agent
        }
      });
    },
  };

  return braintrustLogger;
}
