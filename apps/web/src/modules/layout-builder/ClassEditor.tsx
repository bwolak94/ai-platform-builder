import { useState, useRef, useId, useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { LayoutNode } from "@ai-builder/schemas";

// ─── Grouped Tailwind class definitions ───────────────────────────────────────

const CLASS_GROUPS: { label: string; classes: string[] }[] = [
  {
    label: "Layout",
    classes: [
      "flex",
      "flex-col",
      "flex-row",
      "flex-wrap",
      "grid",
      "hidden",
      "block",
      "inline-flex",
      "items-center",
      "items-start",
      "items-end",
      "items-stretch",
      "justify-center",
      "justify-start",
      "justify-end",
      "justify-between",
      "gap-1",
      "gap-2",
      "gap-4",
      "gap-6",
      "gap-8",
    ],
  },
  {
    label: "Sizing",
    classes: [
      "w-full",
      "w-1/2",
      "w-1/3",
      "w-auto",
      "w-fit",
      "h-full",
      "h-screen",
      "h-auto",
      "min-h-screen",
      "max-w-sm",
      "max-w-md",
      "max-w-lg",
      "max-w-xl",
      "max-w-2xl",
      "max-w-4xl",
      "max-w-6xl",
      "max-w-7xl",
    ],
  },
  {
    label: "Spacing",
    classes: [
      "p-2",
      "p-4",
      "p-6",
      "p-8",
      "p-12",
      "px-4",
      "px-6",
      "px-8",
      "py-4",
      "py-8",
      "py-12",
      "py-20",
      "mx-auto",
      "mx-4",
      "my-4",
      "mt-4",
      "mb-4",
      "space-y-2",
      "space-y-4",
      "space-x-4",
    ],
  },
  {
    label: "Typography",
    classes: [
      "text-xs",
      "text-sm",
      "text-base",
      "text-lg",
      "text-xl",
      "text-2xl",
      "text-3xl",
      "text-4xl",
      "text-5xl",
      "text-6xl",
      "font-light",
      "font-normal",
      "font-medium",
      "font-semibold",
      "font-bold",
      "leading-tight",
      "leading-normal",
      "leading-relaxed",
      "tracking-tight",
      "tracking-wide",
      "tracking-widest",
      "text-center",
      "text-left",
      "text-right",
      "uppercase",
      "lowercase",
      "capitalize",
      "truncate",
    ],
  },
  {
    label: "Colors",
    classes: [
      "text-white",
      "text-black",
      "text-gray-500",
      "text-gray-700",
      "text-gray-900",
      "text-blue-500",
      "text-blue-700",
      "text-indigo-600",
      "text-green-600",
      "text-red-500",
      "text-muted-foreground",
      "text-foreground",
      "text-primary",
      "bg-white",
      "bg-black",
      "bg-transparent",
      "bg-gray-50",
      "bg-gray-100",
      "bg-gray-800",
      "bg-gray-900",
      "bg-blue-500",
      "bg-blue-600",
      "bg-indigo-600",
      "bg-green-500",
      "bg-red-500",
      "bg-primary",
      "bg-secondary",
      "bg-muted",
    ],
  },
  {
    label: "Border",
    classes: [
      "border",
      "border-0",
      "border-2",
      "border-gray-200",
      "border-border",
      "rounded",
      "rounded-sm",
      "rounded-md",
      "rounded-lg",
      "rounded-xl",
      "rounded-2xl",
      "rounded-full",
      "shadow",
      "shadow-sm",
      "shadow-md",
      "shadow-lg",
      "shadow-xl",
    ],
  },
  {
    label: "Effects",
    classes: [
      "opacity-0",
      "opacity-50",
      "opacity-75",
      "opacity-100",
      "transition",
      "transition-all",
      "transition-colors",
      "duration-150",
      "duration-200",
      "duration-300",
      "cursor-pointer",
      "cursor-not-allowed",
      "select-none",
      "overflow-hidden",
      "overflow-auto",
      "relative",
      "absolute",
      "fixed",
      "sticky",
      "inset-0",
      "z-10",
      "z-50",
    ],
  },
];

const ALL_SUGGESTIONS = CLASS_GROUPS.flatMap((g) => g.classes);

interface ClassEditorProps {
  node: LayoutNode;
  onUpdate: (classes: string[]) => void;
}

export function ClassEditor({ node, onUpdate }: ClassEditorProps) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const currentClasses = useMemo(() => node.classes ?? [], [node.classes]);

  const addClass = useCallback(
    (cls: string) => {
      const trimmed = cls.trim();
      if (!trimmed || currentClasses.includes(trimmed)) return;
      onUpdate([...currentClasses, trimmed]);
      setInputValue("");
      setOpen(false);
      inputRef.current?.focus();
    },
    [currentClasses, onUpdate]
  );

  function removeClass(cls: string) {
    onUpdate(currentClasses.filter((c) => c !== cls));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) addClass(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && currentClasses.length > 0) {
      const last = currentClasses[currentClasses.length - 1];
      if (last) removeClass(last);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const groupsToShow = inputValue.trim()
    ? [
        {
          label: "Suggestions",
          classes: ALL_SUGGESTIONS.filter(
            (c) => c.includes(inputValue.trim()) && !currentClasses.includes(c)
          ).slice(0, 30),
        },
      ]
    : CLASS_GROUPS.map((g) => ({
        ...g,
        classes: g.classes.filter((c) => !currentClasses.includes(c)),
      })).filter((g) => g.classes.length > 0);

  return (
    <div className="space-y-2">
      <Label id={labelId} className="text-xs font-medium">
        Tailwind Classes
      </Label>

      {/* Current class badges */}
      {currentClasses.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {currentClasses.map((cls) => (
            <Badge key={cls} variant="secondary" className="gap-1 pr-1 font-mono text-[11px]">
              {cls}
              <button
                className="hover:bg-muted-foreground/20 ml-0.5 rounded-full"
                onClick={() => {
                  removeClass(cls);
                }}
                aria-label={`Remove class ${cls}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Popover with grouped class picker */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Input
            ref={inputRef}
            aria-labelledby={labelId}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Add class… (Enter or ,)"
            className="h-7 font-mono text-xs"
            autoComplete="off"
          />
        </PopoverTrigger>
        <PopoverContent
          className="w-72 p-0"
          align="start"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <Command>
            <CommandInput
              placeholder="Search classes…"
              value={inputValue}
              onValueChange={setInputValue}
              className="h-8 text-xs"
            />
            <CommandList className="max-h-60">
              <CommandEmpty>No match — press Enter to add custom.</CommandEmpty>
              {groupsToShow.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.classes.map((cls) => (
                    <CommandItem
                      key={cls}
                      value={cls}
                      onSelect={() => {
                        addClass(cls);
                      }}
                      className="font-mono text-xs"
                    >
                      {cls}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <p className="text-muted-foreground text-[10px]">
        Enter or , to add · Backspace to remove last
      </p>
    </div>
  );
}
