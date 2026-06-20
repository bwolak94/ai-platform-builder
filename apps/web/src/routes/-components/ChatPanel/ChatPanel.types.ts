import type { ChatMessage, AgentStatus } from "@/hooks/useBuilderAgent/useBuilderAgent.types";
import type { BuilderMode } from "@/types";

export interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  status?: AgentStatus;
  activeToolCall: string | null;
  mode?: BuilderMode;
  onInputChange: (value: string) => void;
  onSubmit: (e?: React.SyntheticEvent) => void;
  onClear: () => void;
  onStop: () => void;
}
