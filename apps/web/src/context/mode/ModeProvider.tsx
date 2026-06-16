import { useState } from "react";
import { ModeContext } from "./ModeContext";
import { DEFAULT_MODE, BUILDER_MODES } from "@/utils";
import type { BuilderMode } from "@/types";
import type { ModeProviderProps } from "./ModeContext.types";

function getInitialMode(): BuilderMode {
  const path = window.location.pathname.replace(/^\//, "").split("/")[0];
  const match = BUILDER_MODES.find((m) => m.id === path);
  return match ? match.id : DEFAULT_MODE;
}

export function ModeProvider({ children }: ModeProviderProps) {
  const [mode, setMode] = useState<BuilderMode>(getInitialMode);

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}
