import { useRef, useCallback } from "react";
import { ToolDispatchContext, type ToolDispatcher } from "./index";

interface ToolDispatchProviderProps {
  children: React.ReactNode;
}

const noop: ToolDispatcher = () => Promise.resolve({ error: "No dispatcher" });

export function ToolDispatchProvider({ children }: ToolDispatchProviderProps) {
  const dispatchRef = useRef<ToolDispatcher>(noop);

  const register = useCallback((fn: ToolDispatcher) => {
    dispatchRef.current = fn;
  }, []);

  return (
    <ToolDispatchContext.Provider value={{ dispatchRef, register }}>
      {children}
    </ToolDispatchContext.Provider>
  );
}
