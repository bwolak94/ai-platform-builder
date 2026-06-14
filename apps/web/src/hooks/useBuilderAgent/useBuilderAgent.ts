import { useState } from "react";
import { AGENT_URL } from "@/utils";
import type {
  UseBuilderAgentOptions,
  UseBuilderAgentReturn,
  ChatMessage,
} from "./useBuilderAgent.types";

// Full implementation in TASK-005 when @cloudflare/agents WebSocket is wired up.
// This stub maintains the correct interface so all components compile and render.
export function useBuilderAgent({
  mode,
  onToolCall,
}: UseBuilderAgentOptions): UseBuilderAgentReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null);

  // Suppress unused variable warnings until real agent is wired up
  void mode;
  void onToolCall;
  void AGENT_URL;
  void setActiveToolCall;

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Stub: echo response. Replaced in TASK-005.
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Agent not yet connected. Received: "${userMessage.content}"`,
        },
      ]);
      setIsLoading(false);
    }, 600);
  }

  return { messages, input, setInput, handleSubmit, isLoading, activeToolCall };
}
