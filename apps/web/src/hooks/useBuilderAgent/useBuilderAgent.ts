import { useEffect, useRef, useCallback, useMemo } from "react";
import { useAgent } from "@cloudflare/agents/react";
import { useAgentChat } from "@cloudflare/agents/ai-react";
import { AGENT_URL } from "@/utils";
import type {
  UseBuilderAgentOptions,
  UseBuilderAgentReturn,
  ChatMessage,
  ToolCall,
} from "./useBuilderAgent.types";

interface RawMessage {
  id: string;
  role: string;
  content: unknown;
}

function extractContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part)
          return String((part as Record<string, unknown>).text);
        return "";
      })
      .join("");
  }
  return "";
}

function toWsUrl(base: string): string {
  const url = base.replace(/\/$/, "");
  if (url.startsWith("http://")) return url.replace("http://", "ws://");
  if (url.startsWith("https://")) return url.replace("https://", "wss://");
  return url;
}

function normalizeMessages(msgs: RawMessage[]): ChatMessage[] {
  return msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: extractContent(m.content),
    }));
}

export function useBuilderAgent({
  mode,
  onToolCall,
}: UseBuilderAgentOptions): UseBuilderAgentReturn {
  const activeToolCallRef = useRef<string | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Break circular reference: addToolResult is returned by useAgentChat but needed inside onToolCall
  const addToolResultRef = useRef<((p: { toolCallId: string; result: unknown }) => void) | null>(
    null
  );

  // If AGENT_URL is not set, omit host so PartySocket defaults to window.location.host
  // and the Vite dev proxy forwards /agents/* → localhost:8787
  const agentHost = useMemo(() => (AGENT_URL ? toWsUrl(AGENT_URL) : undefined), []);

  const agent = useAgent({
    agent: "builder-agent",
    ...(agentHost ? { host: agentHost } : {}),
  });

  const {
    messages: rawMessages,
    input,
    setInput,
    handleSubmit,
    addToolResult,
    isLoading,
  } = useAgentChat({
    agent,
    onToolCall: useCallback(
      async ({
        toolCall,
      }: {
        toolCall: { toolCallId: string; toolName: string; args: unknown };
      }) => {
        activeToolCallRef.current = toolCall.toolName;
        try {
          const call: ToolCall = { toolName: toolCall.toolName, args: toolCall.args };
          const result = onToolCall ? await onToolCall(call) : { error: "No handler registered" };
          addToolResultRef.current?.({ toolCallId: toolCall.toolCallId, result });
        } finally {
          activeToolCallRef.current = null;
        }
      },
      [onToolCall]
    ),
  });

  // Keep ref in sync so the callback above always has the latest function
  addToolResultRef.current = addToolResult;

  // Notify the Durable Object when mode changes
  useEffect(() => {
    agent.send(JSON.stringify({ type: "set_mode", mode }));
  }, [agent, mode]);

  const messages = useMemo(
    () => normalizeMessages(rawMessages as unknown as RawMessage[]),
    [rawMessages]
  );

  return {
    messages,
    input,
    setInput,
    handleSubmit: useCallback(
      (e?: React.SyntheticEvent) => {
        e?.preventDefault();
        handleSubmit(e);
      },
      [handleSubmit]
    ),
    isLoading,
    activeToolCall: activeToolCallRef.current,
  };
}
