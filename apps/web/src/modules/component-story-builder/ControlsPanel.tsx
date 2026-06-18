import { useState, useCallback } from "react";
import { SlidersHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StoryFile, ArgType } from "@ai-builder/schemas";

interface ControlsPanelProps {
  file: StoryFile;
  selectedVariantId: string | null;
  onUpdateVariantArgs: (variantId: string, args: Record<string, unknown>) => void;
}

function inferControlType(value: unknown): ArgType["control"] {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "object" && value !== null) return "object";
  return "text";
}

interface ControlRowProps {
  name: string;
  value: unknown;
  controlType: ArgType["control"];
  options: string[] | null;
  description: string | null;
  onChange: (newValue: unknown) => void;
}

/** Safely coerce an unknown value to a string, avoiding [object Object]. */
function toStr(val: unknown, fallback = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return fallback;
}

function ControlRow({ name, value, controlType, options, description, onChange }: ControlRowProps) {
  const renderControl = () => {
    switch (controlType) {
      case "boolean":
        return (
          <input
            type="checkbox"
            checked={Boolean(value)}
            className="h-4 w-4 rounded border"
            onChange={(e) => {
              onChange(e.target.checked);
            }}
            aria-label={name}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={toStr(value)}
            className="h-6 w-24 px-2 py-0 font-mono text-xs"
            onChange={(e) => {
              onChange(Number(e.target.value));
            }}
            aria-label={name}
          />
        );

      case "range":
        return (
          <div className="flex items-center gap-2">
            <input
              type="range"
              value={typeof value === "number" ? value : 0}
              min={0}
              max={100}
              className="w-24"
              onChange={(e) => {
                onChange(Number(e.target.value));
              }}
              aria-label={name}
            />
            <span className="text-muted-foreground font-mono text-[11px]">{toStr(value, "0")}</span>
          </div>
        );

      case "color":
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={toStr(value, "#000000")}
              className="h-6 w-8 cursor-pointer rounded border p-0"
              onChange={(e) => {
                onChange(e.target.value);
              }}
              aria-label={name}
            />
            <span className="text-muted-foreground font-mono text-[11px]">{toStr(value)}</span>
          </div>
        );

      case "select":
        return (
          <select
            value={toStr(value)}
            className="border-input bg-background h-6 rounded-md border px-1.5 text-xs"
            onChange={(e) => {
              onChange(e.target.value);
            }}
            aria-label={name}
          >
            {options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "radio":
        return (
          <div className="flex flex-wrap gap-2">
            {options?.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-1 text-xs">
                <input
                  type="radio"
                  name={name}
                  value={opt}
                  checked={value === opt}
                  onChange={() => {
                    onChange(opt);
                  }}
                  className="h-3 w-3"
                />
                {opt}
              </label>
            ))}
          </div>
        );

      case "object":
        return (
          <textarea
            value={JSON.stringify(value, null, 2)}
            rows={3}
            className="border-input bg-background w-full rounded-md border p-1.5 font-mono text-[11px]"
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value) as unknown);
              } catch {
                /* ignore invalid JSON during typing */
              }
            }}
            aria-label={name}
          />
        );

      case "file":
        return (
          <span className="text-muted-foreground font-mono text-[11px] italic">
            {toStr(value) || "no file"}
          </span>
        );

      default:
        return (
          <Input
            type="text"
            value={toStr(value)}
            className="h-6 px-2 py-0 text-xs"
            onChange={(e) => {
              onChange(e.target.value);
            }}
            aria-label={name}
          />
        );
    }
  };

  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-0.5 py-1.5">
      <div className="min-w-0">
        <code className="text-[11px] font-medium text-rose-600">{name}</code>
        {description && <p className="text-muted-foreground truncate text-[10px]">{description}</p>}
      </div>
      <div className="flex items-center justify-end">{renderControl()}</div>
    </div>
  );
}

export function ControlsPanel({
  file,
  selectedVariantId,
  onUpdateVariantArgs,
}: ControlsPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const variant =
    (selectedVariantId ? file.variants.find((v) => v.id === selectedVariantId) : null) ??
    file.variants[0] ??
    null;

  const handleChange = useCallback(
    (key: string, newValue: unknown) => {
      if (!variant) return;
      onUpdateVariantArgs(variant.id, { ...variant.args, [key]: newValue });
    },
    [variant, onUpdateVariantArgs]
  );

  if (!variant) {
    return (
      <div className="flex items-center justify-center gap-1.5 py-3">
        <SlidersHorizontal className="text-muted-foreground h-3.5 w-3.5" />
        <p className="text-muted-foreground text-xs">No variants to control.</p>
      </div>
    );
  }

  const argTypes = file.argTypes ?? [];

  // Build merged set: defined argTypes first, then any extra args not in argTypes
  const argTypeKeys = new Set(argTypes.map((a) => a.name));
  const extraKeys = Object.keys(variant.args).filter((k) => !argTypeKeys.has(k));

  const allControls: { key: string; argType: ArgType | null }[] = [
    ...argTypes.map((at) => ({ key: at.name, argType: at })),
    ...extraKeys.map((k) => ({ key: k, argType: null })),
  ];

  if (allControls.length === 0) {
    return (
      <p className="text-muted-foreground py-2 text-center text-xs">
        No props for <strong>{variant.name}</strong>.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-left"
        onClick={() => {
          setCollapsed((v) => !v);
        }}
      >
        <SlidersHorizontal className="text-muted-foreground h-3 w-3" />
        <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
          Controls — {variant.name}
        </span>
        {collapsed ? (
          <ChevronRight className="text-muted-foreground ml-auto h-3 w-3" />
        ) : (
          <ChevronDown className="text-muted-foreground ml-auto h-3 w-3" />
        )}
      </button>

      {!collapsed && (
        <ScrollArea className="max-h-48 pr-1">
          <div className="divide-y">
            {allControls.map(({ key, argType }) => (
              <ControlRow
                key={key}
                name={key}
                value={variant.args[key]}
                controlType={argType?.control ?? inferControlType(variant.args[key])}
                options={argType?.options ?? null}
                description={argType?.description ?? null}
                onChange={(val) => {
                  handleChange(key, val);
                }}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
