import { createContext, useContext } from "react";
import { useLayoutState } from "@/modules/layout-builder/hooks/useLayoutState";
import type { LayoutStateReturn } from "@/modules/layout-builder/hooks/useLayoutState";

const LayoutBuilderContext = createContext<LayoutStateReturn | null>(null);

export function LayoutBuilderProvider({ children }: { children: React.ReactNode }) {
  const state = useLayoutState();
  return <LayoutBuilderContext.Provider value={state}>{children}</LayoutBuilderContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLayoutBuilderContext(): LayoutStateReturn {
  const ctx = useContext(LayoutBuilderContext);
  if (!ctx) throw new Error("useLayoutBuilderContext must be used inside LayoutBuilderProvider");
  return ctx;
}
