import type { ChatMessage } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

export interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  activeToolCall: string | null;
  onInputChange: (value: string) => void;
  onSubmit: (e?: React.SyntheticEvent) => void;
  onClear: () => void;
}
