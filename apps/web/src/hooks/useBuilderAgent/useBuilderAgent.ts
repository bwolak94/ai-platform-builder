import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { AGENT_URL } from "@/utils";
import type {
  UseBuilderAgentOptions,
  UseBuilderAgentReturn,
  AgentStatus,
  ChatMessage,
  ToolCall,
} from "./useBuilderAgent.types";

// ai@6 UIMessage — parts-based format
interface UIMessagePart {
  type: string;
  text?: string;
}
interface UIMessage {
  id: string;
  role: string;
  parts?: UIMessagePart[];
  content?: string;
}

function extractContent(msg: UIMessage): string {
  // Prefer parts (ai@6 format)
  if (Array.isArray(msg.parts)) {
    const text = msg.parts
      .filter(
        (p): p is UIMessagePart & { text: string } =>
          p.type === "text" && typeof p.text === "string"
      )
      .map((p) => p.text)
      .join("");
    if (text) return text;

    // When only tool calls, show a summary so the message isn't invisible
    // In ai@6, tool parts have type "tool-{toolName}" (e.g. "tool-addField")
    const toolCalls = msg.parts.filter((p) => p.type.startsWith("tool-"));
    if (toolCalls.length > 0) {
      const names = [...new Set(toolCalls.map((p) => p.type.slice("tool-".length)))].join(", ");
      return `✓ Applied: ${names}`;
    }
  }
  // Fallback to content string
  if (typeof msg.content === "string") return msg.content;
  return "";
}

function normalizeMessages(msgs: UIMessage[]): ChatMessage[] {
  return msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: extractContent(m),
    }))
    .filter((m) => m.content.trim().length > 0);
}

function toWsUrl(base: string): string {
  const url = base.replace(/\/$/, "");
  if (url.startsWith("http://")) return url.replace("http://", "ws://");
  if (url.startsWith("https://")) return url.replace("https://", "wss://");
  return url;
}

export function useBuilderAgent({
  mode,
  onToolCall,
}: UseBuilderAgentOptions): UseBuilderAgentReturn {
  const onToolCallRef = useRef(onToolCall);
  onToolCallRef.current = onToolCall;
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null);
  // Track processed toolCallIds to prevent duplicate addToolOutput calls caused
  // by stream replay when the WebSocket reconnects (e.g. Vite HMR)
  const processedToolCallIds = useRef<Set<string>>(new Set());
  const inputRef = useRef("");
  const [input, setInputState] = useState("");

  const agentHost = useMemo(() => (AGENT_URL ? toWsUrl(AGENT_URL) : undefined), []);

  // Each mode gets its own DO room so conversations are isolated
  const agent = useAgent({
    agent: "builder-agent",
    name: mode,
    ...(agentHost ? { host: agentHost } : {}),
  }) as unknown as {
    send: (msg: string) => void;
    addEventListener: (e: string, h: (ev: MessageEvent) => void) => void;
    removeEventListener: (e: string, h: (ev: MessageEvent) => void) => void;
  };

  const {
    messages: rawMessages,
    sendMessage,
    clearHistory,
    status,
  } = useAgentChat({
    agent: agent as unknown as Parameters<typeof useAgentChat>[0]["agent"],
    onToolCall: useCallback(
      async ({
        toolCall,
        addToolOutput,
      }: {
        toolCall: { toolCallId: string; toolName: string; input: unknown };
        addToolOutput: (opts: { toolCallId: string; output: unknown }) => void;
      }) => {
        // Stream replay on WebSocket reconnect (Vite HMR, network blip) causes
        // the same toolCallId to fire multiple times. Only process each ID once.
        if (processedToolCallIds.current.has(toolCall.toolCallId)) {
          return;
        }
        processedToolCallIds.current.add(toolCall.toolCallId);

        setActiveToolCall(toolCall.toolName);
        console.log("[useBuilderAgent] onToolCall fired:", toolCall.toolName);
        try {
          const call: ToolCall = { toolName: toolCall.toolName, args: toolCall.input };
          const result = onToolCallRef.current
            ? await onToolCallRef.current(call)
            : { error: "No handler registered" };

          addToolOutput({ toolCallId: toolCall.toolCallId, output: result });
        } finally {
          setActiveToolCall(null);
        }
      },

      [setActiveToolCall]
    ),
  });

  const messages = useMemo(
    () => normalizeMessages(rawMessages as unknown as UIMessage[]),
    [rawMessages]
  );

  // Notify the DO when mode changes
  useEffect(() => {
    agent.send(JSON.stringify({ type: "set_mode", mode }));
  }, [agent, mode]);

  const sendContext = useCallback(
    (context: Record<string, string>) => {
      agent.send(JSON.stringify({ type: "update_context", context }));
    },
    [agent]
  );

  const setInput = useCallback((value: string) => {
    setInputState(value);
    inputRef.current = value;
  }, []);

  const handleSubmit = useCallback(
    (e?: React.SyntheticEvent) => {
      e?.preventDefault();
      const text = inputRef.current.trim();
      if (!text) return;
      // Re-send mode before every message to eliminate the DO race condition
      // where mode defaults to "form" and set_mode may arrive after the first chat message
      agent.send(JSON.stringify({ type: "set_mode", mode }));
      void sendMessage({ role: "user", parts: [{ type: "text", text }] });
      setInput("");
    },
    [sendMessage, setInput, agent, mode]
  );

  const isLoading = status === "submitted" || status === "streaming";

  const clearMessages = useCallback(() => {
    processedToolCallIds.current.clear();
    clearHistory();
  }, [clearHistory]);

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    clearMessages,
    isLoading,
    status: status as AgentStatus,
    activeToolCall,
    sendContext,
  };
}
