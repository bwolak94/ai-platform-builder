import { BUILDER_MODES } from "@/utils";
import { cn } from "@/utils";
import type { ModeSwitcherProps } from "./ModeSwitcher.types";

export function ModeSwitcher({ currentMode, onModeChange }: ModeSwitcherProps) {
  return (
    <nav className="flex flex-wrap gap-1 p-2" aria-label="Builder modes">
      {BUILDER_MODES.map((config) => (
        <button
          key={config.id}
          type="button"
          onClick={() => {
            onModeChange(config.id);
          }}
          title={config.description}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            currentMode === config.id
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent text-muted-foreground hover:text-foreground"
          )}
        >
          {config.label}
        </button>
      ))}
    </nav>
  );
}
