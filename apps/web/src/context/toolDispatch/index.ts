import { createContext, useContext, useEffect, useRef } from "react";
import type { ToolCall, ToolResult } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

export type ToolDispatcher = (call: ToolCall) => Promise<ToolResult>;

// Plain mutable container — avoids the deprecated MutableRefObject import
interface DispatcherRef {
  current: ToolDispatcher;
}

const noopDispatcher: ToolDispatcher = () =>
  Promise.resolve({ error: "No tool dispatcher registered" });

interface ToolDispatchContextValue {
  dispatchRef: DispatcherRef;
  register: (fn: ToolDispatcher) => void;
}

export const ToolDispatchContext = createContext<ToolDispatchContextValue>({
  dispatchRef: { current: noopDispatcher },
  register: () => undefined,
});

export function useToolDispatch(): ToolDispatchContextValue {
  return useContext(ToolDispatchContext);
}

/**
 * Call inside a module panel to register its tool dispatch function.
 * Uses a ref internally so the AppShell always calls the latest implementation
 * without triggering re-renders.
 */
export function useRegisterToolDispatch(fn: ToolDispatcher): void {
  const { register } = useToolDispatch();
  const fnRef = useRef<ToolDispatcher>(fn);
  fnRef.current = fn;

  useEffect(() => {
    // Register a stable wrapper — fnRef.current is always up-to-date
    register((call) => fnRef.current(call));
  }, [register]);
}
