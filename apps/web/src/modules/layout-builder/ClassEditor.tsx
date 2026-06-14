import { useState, useRef, useId } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LayoutNode } from "@ai-builder/schemas";

// Common Tailwind class suggestions
const TAILWIND_SUGGESTIONS = [
  // Layout
  "flex",
  "flex-col",
  "flex-row",
  "flex-wrap",
  "grid",
  "hidden",
  "block",
  "inline",
  "inline-flex",
  "inline-block",
  "items-center",
  "items-start",
  "items-end",
  "items-stretch",
  "justify-center",
  "justify-start",
  "justify-end",
  "justify-between",
  "justify-around",
  "gap-1",
  "gap-2",
  "gap-3",
  "gap-4",
  "gap-6",
  "gap-8",
  // Sizing
  "w-full",
  "w-1/2",
  "w-1/3",
  "w-1/4",
  "w-auto",
  "w-fit",
  "w-screen",
  "h-full",
  "h-screen",
  "h-auto",
  "h-fit",
  "min-h-screen",
  "max-w-sm",
  "max-w-md",
  "max-w-lg",
  "max-w-xl",
  "max-w-2xl",
  "max-w-4xl",
  "max-w-6xl",
  "max-w-7xl",
  // Spacing
  "p-2",
  "p-4",
  "p-6",
  "p-8",
  "p-12",
  "p-16",
  "px-4",
  "px-6",
  "px-8",
  "py-4",
  "py-8",
  "py-12",
  "py-20",
  "m-0",
  "m-auto",
  "mx-auto",
  "mx-4",
  "my-4",
  "mt-4",
  "mb-4",
  "ml-4",
  "mr-4",
  // Typography
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
  "font-extrabold",
  "leading-tight",
  "leading-snug",
  "leading-normal",
  "leading-relaxed",
  "leading-loose",
  "tracking-tight",
  "tracking-normal",
  "tracking-wide",
  "tracking-wider",
  "tracking-widest",
  "text-left",
  "text-center",
  "text-right",
  "text-justify",
  "uppercase",
  "lowercase",
  "capitalize",
  "truncate",
  "line-clamp-2",
  "line-clamp-3",
  // Colors — text
  "text-white",
  "text-black",
  "text-gray-500",
  "text-gray-700",
  "text-gray-900",
  "text-slate-500",
  "text-slate-700",
  "text-slate-900",
  "text-blue-500",
  "text-blue-700",
  "text-indigo-600",
  "text-violet-600",
  "text-green-600",
  "text-red-500",
  "text-red-600",
  "text-orange-500",
  "text-muted-foreground",
  "text-foreground",
  "text-primary",
  "text-secondary",
  // Colors — background
  "bg-white",
  "bg-black",
  "bg-transparent",
  "bg-gray-50",
  "bg-gray-100",
  "bg-gray-200",
  "bg-gray-800",
  "bg-gray-900",
  "bg-slate-50",
  "bg-slate-100",
  "bg-slate-800",
  "bg-slate-900",
  "bg-blue-50",
  "bg-blue-500",
  "bg-blue-600",
  "bg-blue-700",
  "bg-indigo-50",
  "bg-indigo-500",
  "bg-indigo-600",
  "bg-green-50",
  "bg-green-500",
  "bg-red-50",
  "bg-red-500",
  "bg-primary",
  "bg-secondary",
  "bg-accent",
  "bg-muted",
  "bg-background",
  // Border
  "border",
  "border-0",
  "border-2",
  "border-4",
  "border-gray-200",
  "border-gray-300",
  "border-slate-200",
  "border-border",
  "rounded",
  "rounded-sm",
  "rounded-md",
  "rounded-lg",
  "rounded-xl",
  "rounded-2xl",
  "rounded-full",
  "rounded-none",
  // Shadow
  "shadow",
  "shadow-sm",
  "shadow-md",
  "shadow-lg",
  "shadow-xl",
  "shadow-2xl",
  "shadow-none",
  // Position
  "relative",
  "absolute",
  "fixed",
  "sticky",
  "inset-0",
  "top-0",
  "bottom-0",
  "left-0",
  "right-0",
  "z-10",
  "z-50",
  // Overflow
  "overflow-hidden",
  "overflow-auto",
  "overflow-scroll",
  "overflow-x-auto",
  "overflow-y-auto",
  // Other
  "container",
  "transition",
  "transition-all",
  "transition-colors",
  "duration-150",
  "duration-200",
  "duration-300",
  "cursor-pointer",
  "cursor-not-allowed",
  "select-none",
  "pointer-events-none",
  "opacity-0",
  "opacity-50",
  "opacity-75",
  "opacity-100",
  "ring-1",
  "ring-2",
  "ring-primary",
  "ring-offset-2",
  "divide-y",
  "divide-gray-200",
  "space-y-2",
  "space-y-4",
  "space-x-2",
  "space-x-4",
];

interface ClassEditorProps {
  node: LayoutNode;
  onUpdate: (classes: string[]) => void;
}

export function ClassEditor({ node, onUpdate }: ClassEditorProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const currentClasses = node.classes ?? [];

  const filtered =
    inputValue.trim().length > 0
      ? TAILWIND_SUGGESTIONS.filter(
          (c) => c.includes(inputValue.trim()) && !currentClasses.includes(c)
        ).slice(0, 20)
      : [];

  function addClass(cls: string) {
    const trimmed = cls.trim();
    if (!trimmed || currentClasses.includes(trimmed)) return;
    onUpdate([...currentClasses, trimmed]);
    setInputValue("");
    inputRef.current?.focus();
  }

  function removeClass(cls: string) {
    onUpdate(currentClasses.filter((c) => c !== cls));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addClass(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && currentClasses.length > 0) {
      const last = currentClasses[currentClasses.length - 1];
      if (last) removeClass(last);
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Tailwind Classes</Label>

      {/* Class badges */}
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

      {/* Input with datalist */}
      <div className="relative">
        <Input
          ref={inputRef}
          list={listId}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) addClass(inputValue);
          }}
          placeholder="Add class… (Enter or ,)"
          className="h-7 font-mono text-xs"
          aria-label="Add Tailwind class"
        />
        <datalist id={listId}>
          {filtered.map((cls) => (
            <option key={cls} value={cls} />
          ))}
        </datalist>
      </div>

      <p className="text-muted-foreground text-[10px]">
        Press Enter or comma to add. Backspace to remove last.
      </p>
    </div>
  );
}
