import { useCallback } from "react";
import { useToolDispatch } from "@/context/toolDispatch";
import { useChatTools } from "./hooks/useChatTools";
import { ArtifactBoard } from "./ArtifactBoard";
import type { ToolCall } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

export function GeneralChatPanel() {
  const { register } = useToolDispatch();
  const { dispatch } = useChatTools();

  const toolDispatch = useCallback(
    async (call: ToolCall): Promise<unknown> => dispatch(call),
    [dispatch]
  );

  register(toolDispatch);

  return <ArtifactBoard />;
}
