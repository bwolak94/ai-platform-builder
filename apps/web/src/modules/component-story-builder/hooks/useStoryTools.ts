import { serializeStoriesDSL } from "@ai-builder/serializers";
import { StoryVariantSchema } from "@ai-builder/schemas";
import type { StoryFile, StoryVariant, ControlType } from "@ai-builder/schemas";
import type React from "react";
import { nanoid } from "nanoid";

type Setter = React.Dispatch<React.SetStateAction<StoryFile>>;
type ToolResult = Record<string, unknown>;

interface SimpleResult {
  success: true;
}

export function useStoryTools(storyFile: StoryFile, setStoryFile: Setter) {
  return {
    setComponent: ({
      componentName,
      componentPath,
      title,
    }: {
      componentName: string;
      componentPath: string;
      title?: string;
    }): Promise<SimpleResult> => {
      setStoryFile((prev) => ({
        ...prev,
        componentName,
        componentPath,
        title: title ?? componentName,
      }));
      return Promise.resolve({ success: true });
    },

    addVariant: ({ variant }: { variant: unknown }): Promise<ToolResult> => {
      const parsed = StoryVariantSchema.safeParse(variant);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setStoryFile((prev) => ({
        ...prev,
        variants: [...prev.variants, parsed.data],
      }));
      return Promise.resolve({ success: true, variantId: parsed.data.id });
    },

    updateVariant: ({
      variantId,
      updates,
    }: {
      variantId: string;
      updates: Partial<StoryVariant>;
    }): Promise<SimpleResult> => {
      setStoryFile((prev) => ({
        ...prev,
        variants: prev.variants.map((v) => (v.id === variantId ? { ...v, ...updates } : v)),
      }));
      return Promise.resolve({ success: true });
    },

    removeVariant: ({ variantId }: { variantId: string }): Promise<SimpleResult> => {
      setStoryFile((prev) => ({
        ...prev,
        variants: prev.variants.filter((v) => v.id !== variantId),
      }));
      return Promise.resolve({ success: true });
    },

    setDefaultArgs: ({ args }: { args: Record<string, unknown> }): Promise<SimpleResult> => {
      setStoryFile((prev) => ({ ...prev, defaultArgs: args }));
      return Promise.resolve({ success: true });
    },

    setLayout: ({ layout }: { layout: StoryFile["layout"] }): Promise<SimpleResult> => {
      setStoryFile((prev) => ({ ...prev, layout }));
      return Promise.resolve({ success: true });
    },

    addArgType: ({
      name,
      control,
      options,
      defaultValue,
      description,
    }: {
      name: string;
      control: ControlType;
      options?: string[] | null;
      defaultValue?: string | null;
      description?: string | null;
    }): Promise<SimpleResult> => {
      setStoryFile((prev) => ({
        ...prev,
        argTypes: [
          ...(prev.argTypes ?? []),
          {
            name,
            control,
            options: options ?? null,
            defaultValue: defaultValue ?? null,
            description: description ?? null,
          },
        ],
      }));
      return Promise.resolve({ success: true });
    },

    reset: (): Promise<SimpleResult> => {
      setStoryFile({
        id: "story_" + nanoid(6),
        componentName: "Component",
        componentPath: "src/components/Component.tsx",
        title: "Components/Component",
        layout: "centered",
        defaultArgs: null,
        argTypes: null,
        variants: [],
      });
      return Promise.resolve({ success: true });
    },

    queryStory: (): Promise<{ dsl: string }> => {
      return Promise.resolve({ dsl: serializeStoriesDSL(storyFile) });
    },
  };
}

export type StoryTools = ReturnType<typeof useStoryTools>;
