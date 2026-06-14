import { useState } from "react";
import { ModeContext } from "./ModeContext";
import { DEFAULT_MODE } from "@/utils";
import type { BuilderMode } from "@/types";
import type { ModeProviderProps } from "./ModeContext.types";

export function ModeProvider({ children }: ModeProviderProps) {
  const [mode, setMode] = useState<BuilderMode>(DEFAULT_MODE);

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}
