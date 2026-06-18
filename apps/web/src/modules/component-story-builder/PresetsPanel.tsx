import { Wand2 } from "lucide-react";
import type { StoryFile } from "@ai-builder/schemas";
import { nanoid } from "nanoid";

interface StoryPreset {
  label: string;
  description: string;
  build: () => Partial<StoryFile> & { variants: StoryFile["variants"] };
}

const PRESETS: StoryPreset[] = [
  {
    label: "Button",
    description: "Primary, Secondary, Disabled, Loading variants",
    build: () => ({
      componentName: "Button",
      componentPath: "src/components/Button.tsx",
      title: "Components/Button",
      layout: "centered" as const,
      defaultArgs: { label: "Click me", variant: "primary" },
      tags: ["autodocs"],
      argTypes: [
        {
          name: "label",
          control: "text",
          options: null,
          defaultValue: "Click me",
          description: "Button label",
        },
        {
          name: "variant",
          control: "select",
          options: ["primary", "secondary", "danger", "ghost"],
          defaultValue: "primary",
          description: null,
        },
        {
          name: "disabled",
          control: "boolean",
          options: null,
          defaultValue: "false",
          description: null,
        },
        {
          name: "loading",
          control: "boolean",
          options: null,
          defaultValue: "false",
          description: null,
        },
      ],
      variants: [
        {
          id: "var_" + nanoid(6),
          name: "Primary",
          args: { label: "Click me", variant: "primary" },
          viewport: null,
          docs: "Default primary action button.",
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "Secondary",
          args: { label: "Cancel", variant: "secondary" },
          viewport: null,
          docs: null,
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "Danger",
          args: { label: "Delete", variant: "danger" },
          viewport: null,
          docs: null,
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "Disabled",
          args: { label: "Click me", variant: "primary", disabled: true },
          viewport: null,
          docs: "Non-interactive state.",
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "Loading",
          args: { label: "Saving...", variant: "primary", loading: true },
          viewport: null,
          docs: null,
          parameters: null,
        },
      ],
    }),
  },
  {
    label: "Input / Form Field",
    description: "Default, Error, Disabled, With label",
    build: () => ({
      componentName: "Input",
      componentPath: "src/components/Input.tsx",
      title: "Forms/Input",
      layout: "centered" as const,
      defaultArgs: { placeholder: "Enter value..." },
      tags: ["autodocs"],
      argTypes: [
        {
          name: "placeholder",
          control: "text",
          options: null,
          defaultValue: null,
          description: null,
        },
        {
          name: "error",
          control: "text",
          options: null,
          defaultValue: null,
          description: "Validation error message",
        },
        {
          name: "disabled",
          control: "boolean",
          options: null,
          defaultValue: "false",
          description: null,
        },
        { name: "label", control: "text", options: null, defaultValue: null, description: null },
      ],
      variants: [
        {
          id: "var_" + nanoid(6),
          name: "Default",
          args: { placeholder: "Enter value..." },
          viewport: null,
          docs: null,
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "WithError",
          args: { placeholder: "Enter value...", error: "This field is required" },
          viewport: null,
          docs: "Shows validation error state.",
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "Disabled",
          args: { placeholder: "Enter value...", disabled: true },
          viewport: null,
          docs: null,
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "WithLabel",
          args: { placeholder: "Enter value...", label: "Email address" },
          viewport: null,
          docs: null,
          parameters: null,
        },
      ],
    }),
  },
  {
    label: "Card",
    description: "Default, With footer, Loading skeleton",
    build: () => ({
      componentName: "Card",
      componentPath: "src/components/Card.tsx",
      title: "Layout/Card",
      layout: "padded" as const,
      defaultArgs: { title: "Card title", description: "Card description" },
      tags: ["autodocs"],
      argTypes: [
        { name: "title", control: "text", options: null, defaultValue: null, description: null },
        {
          name: "description",
          control: "text",
          options: null,
          defaultValue: null,
          description: null,
        },
        {
          name: "loading",
          control: "boolean",
          options: null,
          defaultValue: "false",
          description: null,
        },
      ],
      variants: [
        {
          id: "var_" + nanoid(6),
          name: "Default",
          args: { title: "Card title", description: "Some description here" },
          viewport: null,
          docs: null,
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "WithFooter",
          args: { title: "Card title", description: "Description", footer: "Footer content" },
          viewport: null,
          docs: null,
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "Loading",
          args: { loading: true },
          viewport: null,
          docs: "Skeleton loading state.",
          parameters: null,
        },
      ],
    }),
  },
  {
    label: "Badge / Chip",
    description: "All variants and sizes",
    build: () => ({
      componentName: "Badge",
      componentPath: "src/components/Badge.tsx",
      title: "Components/Badge",
      layout: "centered" as const,
      defaultArgs: { label: "Badge", variant: "default" },
      tags: ["autodocs"],
      argTypes: [
        { name: "label", control: "text", options: null, defaultValue: null, description: null },
        {
          name: "variant",
          control: "radio",
          options: ["default", "secondary", "destructive", "outline"],
          defaultValue: "default",
          description: null,
        },
      ],
      variants: [
        {
          id: "var_" + nanoid(6),
          name: "Default",
          args: { label: "Default", variant: "default" },
          viewport: null,
          docs: null,
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "Secondary",
          args: { label: "Secondary", variant: "secondary" },
          viewport: null,
          docs: null,
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "Destructive",
          args: { label: "Error", variant: "destructive" },
          viewport: null,
          docs: null,
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "Outline",
          args: { label: "Outline", variant: "outline" },
          viewport: null,
          docs: null,
          parameters: null,
        },
      ],
    }),
  },
  {
    label: "Modal / Dialog",
    description: "Open, Closed, With form",
    build: () => ({
      componentName: "Modal",
      componentPath: "src/components/Modal.tsx",
      title: "Overlays/Modal",
      layout: "fullscreen" as const,
      defaultArgs: { open: true, title: "Dialog title" },
      tags: ["autodocs"],
      argTypes: [
        {
          name: "open",
          control: "boolean",
          options: null,
          defaultValue: "true",
          description: null,
        },
        { name: "title", control: "text", options: null, defaultValue: null, description: null },
        {
          name: "description",
          control: "text",
          options: null,
          defaultValue: null,
          description: null,
        },
      ],
      variants: [
        {
          id: "var_" + nanoid(6),
          name: "Open",
          args: {
            open: true,
            title: "Are you sure?",
            description: "This action cannot be undone.",
          },
          viewport: null,
          docs: null,
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "Closed",
          args: { open: false, title: "Are you sure?" },
          viewport: null,
          docs: null,
          parameters: null,
        },
        {
          id: "var_" + nanoid(6),
          name: "WithForm",
          args: { open: true, title: "Edit profile", hasForm: true },
          viewport: null,
          docs: null,
          parameters: null,
        },
      ],
    }),
  },
];

interface PresetsPanelProps {
  onLoad: (partialFile: Partial<StoryFile> & { variants: StoryFile["variants"] }) => void;
}

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
            key={preset.label}
            type="button"
            onClick={() => {
              onLoad(preset.build());
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
