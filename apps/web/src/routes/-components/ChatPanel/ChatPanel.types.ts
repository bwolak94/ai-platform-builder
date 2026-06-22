import type { ChatMessage, AgentStatus } from "@/hooks/useBuilderAgent/useBuilderAgent.types";
import type { BuilderMode } from "@/types";
import type { Branch } from "@/context/branches/BranchContext";

export type { Branch };

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
  // Feature 1 — Context window pressure gauge
  onRequestSummary?: () => void;
  // Feature 2 — Conversation forking
  branches?: Branch[];
  activeBranchId?: string;
  onFork?: () => void;
  onSwitchBranch?: (id: string) => void;
  // Feature 3 — Memory pins
  pinnedIds?: Set<string>;
  onPin?: (msg: ChatMessage) => void;
  onUnpin?: (id: string) => void;
  // Feature 5 — Save artifact from code blocks
  onSaveArtifact?: (content: string, lang: string, title: string) => void;
  // Feature 6 — Inline message edit + regenerate
  onEditAndResubmit?: (content: string) => void;
  // Feature 7 — @-mention context slot injection
  contextSlots?: { key: string; label: string; value: string }[];
}
