import type { ReactNode } from "react";
import type { BuilderMode } from "@/types";

export interface ModeContextValue {
  mode: BuilderMode;
  setMode: (mode: BuilderMode) => void;
}

export interface ModeProviderProps {
  children: ReactNode;
}
