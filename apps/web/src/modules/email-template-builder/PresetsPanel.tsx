import { Wand2 } from "lucide-react";
import type { PresetName } from "@ai-builder/serializers";

interface PresetsPanelProps {
  onLoad: (name: PresetName) => void;
}

const PRESETS: { name: PresetName; label: string; description: string }[] = [
  {
    name: "welcome",
    label: "Welcome Email",
    description: "Onboarding for new users with CTA",
  },
  {
    name: "password-reset",
    label: "Password Reset",
    description: "Transactional security email",
  },
  {
    name: "order-confirmation",
    label: "Order Confirmation",
    description: "Purchase receipt with order tracking",
  },
  {
    name: "newsletter",
    label: "Newsletter",
    description: "Marketing digest with 2-column layout",
  },
  {
    name: "promotional",
    label: "Promotional",
    description: "Marketing offer with urgency",
  },
];

export function PresetsPanel({ onLoad }: PresetsPanelProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        <Wand2 className="h-3 w-3" />
        Start from preset
      </p>
      <div className="grid grid-cols-1 gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => {
              onLoad(preset.name);
            }}
            className="border-border hover:border-primary hover:bg-muted/50 flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{preset.label}</p>
              <p className="text-muted-foreground text-[11px]">{preset.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
