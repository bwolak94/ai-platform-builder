import { createContext } from "react";
import type { ModeContextValue } from "./ModeContext.types";

export const ModeContext = createContext<ModeContextValue | null>(null);
