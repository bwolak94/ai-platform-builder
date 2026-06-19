import { createContext, useContext, useEffect, useRef } from "react";

export interface AgentActions {
  /** Pre-fill the chat input without submitting */
  setInput: (text: string) => void;
  /** Submit a message directly, bypassing the input field */
  sendMessage: (text: string) => void;
}

interface AgentActionsRef {
  current: AgentActions;
}

interface AgentActionsContextValue {
  actionsRef: AgentActionsRef;
  register: (actions: AgentActions) => void;
}

const noopActions: AgentActions = {
  setInput: () => undefined,
  sendMessage: () => undefined,
};

export const AgentActionsContext = createContext<AgentActionsContextValue>({
  actionsRef: { current: noopActions },
  register: () => undefined,
});

export function useAgentActionsContext(): AgentActionsContextValue {
  return useContext(AgentActionsContext);
}

/** Hook for consumers that want to call agent actions from deep in the tree */
export function useAgentActions(): AgentActions {
  const { actionsRef } = useAgentActionsContext();
  return {
    setInput: (text) => {
      actionsRef.current.setInput(text);
    },
    sendMessage: (text) => {
      actionsRef.current.sendMessage(text);
    },
  };
}

/**
 * Called once in AppShell to register the live agent action handlers.
 * Uses a ref so deep consumers never cause re-renders.
 */
export function useRegisterAgentActions(actions: AgentActions): void {
  const { register } = useAgentActionsContext();
  const actionsRef = useRef<AgentActions>(actions);
  actionsRef.current = actions;

  useEffect(() => {
    register({
      setInput: (text) => {
        actionsRef.current.setInput(text);
      },
      sendMessage: (text) => {
        actionsRef.current.sendMessage(text);
      },
    });
  }, [register]);
}
