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
  timestamp: number;
}

export interface UseBuilderAgentOptions {
  mode: BuilderMode;
  onToolCall?: (call: ToolCall) => Promise<ToolResult>;
}

export type AgentStatus = "idle" | "submitted" | "streaming" | "error";

export interface UseBuilderAgentReturn {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e?: React.SyntheticEvent) => void;
  clearMessages: () => void;
  stop: () => void;
  isLoading: boolean;
  status: AgentStatus;
  activeToolCall: string | null;
  sendContext: (context: Record<string, string>) => void;
}
