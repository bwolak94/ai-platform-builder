import type { BuilderMode } from "@/types";

export interface ToolCall {
  toolName: string;
  args: unknown;
}

export type ToolResult = unknown;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
}

export interface UseBuilderAgentOptions {
  mode: BuilderMode;
  onToolCall?: (call: ToolCall) => Promise<ToolResult>;
}

export interface UseBuilderAgentReturn {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e?: React.FormEvent) => void;
  isLoading: boolean;
  activeToolCall: string | null;
}
