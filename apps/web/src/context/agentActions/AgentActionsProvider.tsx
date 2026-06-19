import { useRef, useCallback } from "react";
import { AgentActionsContext } from "./AgentActionsContext";
import type { AgentActions } from "./AgentActionsContext";

const noopActions: AgentActions = {
  setInput: () => undefined,
  sendMessage: () => undefined,
};

export function AgentActionsProvider({ children }: { children: React.ReactNode }) {
  const actionsRef = useRef<AgentActions>(noopActions);

  const register = useCallback((actions: AgentActions) => {
    actionsRef.current = actions;
  }, []);

  return (
    <AgentActionsContext.Provider value={{ actionsRef, register }}>
      {children}
    </AgentActionsContext.Provider>
  );
}
