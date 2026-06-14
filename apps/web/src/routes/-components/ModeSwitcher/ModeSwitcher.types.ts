import type { BuilderMode } from "@/types";

export interface ModeSwitcherProps {
  currentMode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
}
