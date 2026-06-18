import { serializeStoriesDSL } from "@ai-builder/serializers";
import { StoryVariantSchema } from "@ai-builder/schemas";
import type { StoryFile, StoryVariant, StoryManagerState, ControlType } from "@ai-builder/schemas";
import type React from "react";
import { nanoid } from "nanoid";
import { createDefaultStoryFile } from "./useStoryState";

type ActiveFileSetter = React.Dispatch<React.SetStateAction<StoryFile>>;
type ManagerSetter = (
  updater: StoryManagerState | ((prev: StoryManagerState) => StoryManagerState)
) => void;

type ToolResult = Record<string, unknown>;

export function useStoryTools(
  activeFile: StoryFile,
  setActiveFile: (updater: StoryFile | ((prev: StoryFile) => StoryFile)) => void,
  managerState: StoryManagerState,
  setManagerState: ManagerSetter
) {
  return {
    // ── Query ────────────────────────────────────────────────────────────────

    queryStory: (): Promise<{ dsl: string; fileCount: number; activeFile: string }> =>
      Promise.resolve({
        dsl: serializeStoriesDSL(activeFile),
        fileCount: managerState.files.length,
        activeFile: activeFile.componentName,
      }),

    // ── Component ────────────────────────────────────────────────────────────

    setComponent: ({
      componentName,
      componentPath,
      title,
    }: {
      componentName: string;
      componentPath: string;
      title?: string;
    }): Promise<ToolResult> => {
      setActiveFile((prev) => ({
        ...prev,
        componentName,
        componentPath,
        title: title ?? componentName,
      }));
      return Promise.resolve({ success: true });
    },

    // ── Variants ─────────────────────────────────────────────────────────────

    addVariant: ({
      name,
      args,
      viewport,
      docs,
      parameters,
    }: {
      name: string;
      args: Record<string, unknown>;
      viewport?: StoryVariant["viewport"];
      docs?: string;
      parameters?: Record<string, unknown>;
    }): Promise<ToolResult> => {
      const newVariant: StoryVariant = {
        id: "var_" + nanoid(6),
        name,
        args,
        viewport: viewport ?? null,
        docs: docs ?? null,
        parameters: parameters ?? null,
      };
      const parsed = StoryVariantSchema.safeParse(newVariant);
      if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
      setActiveFile((prev) => ({
        ...prev,
        variants: [...prev.variants, parsed.data],
      }));
      return Promise.resolve({ success: true, variantId: newVariant.id });
    },

    updateVariant: ({
      name,
      args,
      docs,
      viewport,
      parameters,
    }: {
      name: string;
      args?: Record<string, unknown>;
      docs?: string;
      viewport?: StoryVariant["viewport"];
      parameters?: Record<string, unknown>;
    }): Promise<ToolResult> => {
      setActiveFile((prev) => ({
        ...prev,
        variants: prev.variants.map((v) =>
          v.name === name
            ? {
                ...v,
                ...(args !== undefined ? { args } : {}),
                ...(docs !== undefined ? { docs } : {}),
                ...(viewport !== undefined ? { viewport } : {}),
                ...(parameters !== undefined ? { parameters } : {}),
              }
            : v
        ),
      }));
      return Promise.resolve({ success: true });
    },

    removeVariant: ({ name }: { name: string }): Promise<ToolResult> => {
      setActiveFile((prev) => ({
        ...prev,
        variants: prev.variants.filter((v) => v.name !== name),
      }));
      return Promise.resolve({ success: true });
    },

    // ── Meta ─────────────────────────────────────────────────────────────────

    setDefaultArgs: ({ args }: { args: Record<string, unknown> }): Promise<ToolResult> => {
      setActiveFile((prev) => ({ ...prev, defaultArgs: args }));
      return Promise.resolve({ success: true });
    },

    setLayout: ({ layout }: { layout: StoryFile["layout"] }): Promise<ToolResult> => {
      setActiveFile((prev) => ({ ...prev, layout }));
      return Promise.resolve({ success: true });
    },

    addArgType: ({
      argType,
    }: {
      argType: {
        name: string;
        control: { type: string; options?: string[] };
        defaultValue?: unknown;
        description?: string;
      };
    }): Promise<ToolResult> => {
      setActiveFile((prev) => ({
        ...prev,
        argTypes: [
          ...(prev.argTypes ?? []),
          {
            name: argType.name,
            control: argType.control.type as ControlType,
            options: argType.control.options ?? null,
            defaultValue:
              argType.defaultValue !== undefined &&
              (typeof argType.defaultValue === "string" ||
                typeof argType.defaultValue === "number" ||
                typeof argType.defaultValue === "boolean")
                ? String(argType.defaultValue)
                : null,
            description: argType.description ?? null,
          },
        ],
      }));
      return Promise.resolve({ success: true });
    },

    addDecorator: ({ decorator }: { decorator: string }): Promise<ToolResult> => {
      setActiveFile((prev) => ({
        ...prev,
        decorators: [...(prev.decorators ?? []), decorator],
      }));
      return Promise.resolve({ success: true });
    },

    addTag: ({ tag }: { tag: string }): Promise<ToolResult> => {
      setActiveFile((prev) => {
        if (prev.tags?.includes(tag)) return prev;
        return { ...prev, tags: [...(prev.tags ?? []), tag] };
      });
      return Promise.resolve({ success: true });
    },

    // ── Multi-file ────────────────────────────────────────────────────────────

    createStoryFile: ({
      componentName,
      componentPath,
      title,
    }: {
      componentName: string;
      componentPath: string;
      title?: string;
    }): Promise<ToolResult> => {
      const newFile = createDefaultStoryFile();
      const patched: StoryFile = {
        ...newFile,
        componentName,
        componentPath,
        title: title ?? componentName,
        defaultArgs: null,
        variants: [],
      };
      setManagerState((state) => ({
        files: [...state.files, patched],
        activeFileId: patched.id,
      }));
      return Promise.resolve({ success: true, fileId: patched.id });
    },

    switchStoryFile: ({ componentName }: { componentName: string }): Promise<ToolResult> => {
      const target = managerState.files.find((f) => f.componentName === componentName);
      if (!target) {
        return Promise.resolve({
          error: `No story file found for component "${componentName}"`,
          availableFiles: managerState.files.map((f) => f.componentName),
        });
      }
      setManagerState((state) => ({ ...state, activeFileId: target.id }));
      return Promise.resolve({ success: true, activeFile: componentName });
    },

    removeStoryFile: ({ componentName }: { componentName: string }): Promise<ToolResult> => {
      if (managerState.files.length <= 1) {
        return Promise.resolve({ error: "Cannot remove the last story file." });
      }
      const target = managerState.files.find((f) => f.componentName === componentName);
      if (!target) {
        return Promise.resolve({ error: `No story file found for "${componentName}"` });
      }
      setManagerState((state) => {
        const remaining = state.files.filter((f) => f.id !== target.id);
        const newActiveId =
          state.activeFileId === target.id ? (remaining[0]?.id ?? "") : state.activeFileId;
        return { files: remaining, activeFileId: newActiveId };
      });
      return Promise.resolve({ success: true });
    },

    // ── Legacy client-side reset ──────────────────────────────────────────────

    reset: (): Promise<ToolResult> => {
      setActiveFile(createDefaultStoryFile());
      return Promise.resolve({ success: true });
    },
  };
}

export type StoryTools = ReturnType<typeof useStoryTools>;

// Satisfy the ActiveFileSetter type export for other consumers
export type { ActiveFileSetter };
