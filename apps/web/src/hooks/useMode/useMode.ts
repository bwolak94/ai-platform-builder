import { useContext } from "react";
import { ModeContext } from "@/context/mode";
import type { UseModeReturn } from "./useMode.types";

export function useMode(): UseModeReturn {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useMode must be used inside ModeProvider");
  }
  return ctx;
}
