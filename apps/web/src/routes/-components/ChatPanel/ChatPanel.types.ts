import type { ChatMessage, AgentStatus } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

export interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  status?: AgentStatus;
  activeToolCall: string | null;
  onInputChange: (value: string) => void;
  onSubmit: (e?: React.SyntheticEvent) => void;
  onClear: () => void;
}
