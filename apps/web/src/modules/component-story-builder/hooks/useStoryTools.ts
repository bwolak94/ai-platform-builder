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

    // ── Backfilled tools ─────────────────────────────────────────────────────

    addPlayFunction: (_args: {
      variantName: string;
      steps: { description: string; code: string }[];
    }): Promise<ToolResult> => {
      // Play function — acknowledged; agent outputs play function code in chat
      return Promise.resolve({ success: true });
    },

    addMSWDecorator: (args: {
      variantName?: string | null;
      handlers: {
        method: string;
        url: string;
        status: number;
        response: Record<string, unknown>;
      }[];
    }): Promise<ToolResult> => {
      const handlerSummary = args.handlers.map((h) => `${h.method} ${h.url}`).join(", ");
      const decoratorStr = `(Story) => { /* MSW: ${handlerSummary} */ return Story(); }`;
      if (!args.variantName) {
        setActiveFile((prev) => ({
          ...prev,
          decorators: [...(prev.decorators ?? []), decoratorStr],
        }));
      } else {
        setActiveFile((prev) => ({
          ...prev,
          variants: prev.variants.map((v) =>
            v.name === args.variantName
              ? { ...v, parameters: { ...(v.parameters ?? {}), msw: args.handlers } }
              : v
          ),
        }));
      }
      return Promise.resolve({ success: true });
    },

    inferStoriesFromInterface: (_args: { interfaceSource: string }): Promise<ToolResult> => {
      return Promise.resolve({ success: true });
    },

    generateDesignTokenStory: (_args: { title: string }): Promise<ToolResult> => {
      return Promise.resolve({ success: true });
    },

    // ── New tools ────────────────────────────────────────────────────────────

    generateA11yTests: (_args: {
      variantName: string;
      context?: string | null;
    }): Promise<ToolResult> => {
      // Accessibility test — acknowledged; agent outputs axe play function in chat
      return Promise.resolve({ success: true });
    },

    addResponsiveStory: (args: { baseVariantName: string }): Promise<ToolResult> => {
      const viewports: StoryVariant["viewport"][] = ["mobile1", "tablet", "desktop"];
      const names: Record<NonNullable<StoryVariant["viewport"]>, string> = {
        mobile1: "Mobile",
        mobile2: "MobileSmall",
        tablet: "Tablet",
        desktop: "Desktop",
      };
      setActiveFile((prev) => {
        const base = prev.variants.find((v) => v.name === args.baseVariantName);
        if (!base) return prev;
        const newVariants = viewports.map((vp) => ({
          ...base,
          id: "var_" + nanoid(6),
          name: `${args.baseVariantName}${vp ? names[vp] : ""}`,
          viewport: vp,
        }));
        return { ...prev, variants: [...prev.variants, ...newVariants] };
      });
      return Promise.resolve({ success: true });
    },

    generateSnapshotTest: (): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeStoriesDSL(activeFile) });
    },

    addChromatiConfig: (_args: {
      projectToken?: string;
      viewports: number[];
      diffThreshold: number;
    }): Promise<ToolResult> => {
      // Chromatic config — acknowledged; agent outputs config snippet in chat
      return Promise.resolve({ success: true });
    },

    inferStoriesFromProps: (_args: {
      props: { name: string; type: string; required?: boolean }[];
    }): Promise<ToolResult> => {
      return Promise.resolve({ success: true });
    },

    generateInteractionTest: (_args: {
      variantName: string;
      interactions: string[];
    }): Promise<ToolResult> => {
      // Interaction test — acknowledged; agent outputs play function code in chat
      return Promise.resolve({ success: true });
    },

    exportToMDX: (): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeStoriesDSL(activeFile) });
    },

    generateDocsPage: (_args: {
      description?: string;
      includeUsageExamples: boolean;
    }): Promise<ToolResult> => {
      return Promise.resolve({ success: true, dsl: serializeStoriesDSL(activeFile) });
    },

    addThemeVariants: (args: {
      baseVariantName: string;
      themes: ("light" | "dark" | "high-contrast")[];
    }): Promise<ToolResult> => {
      setActiveFile((prev) => {
        const base = prev.variants.find((v) => v.name === args.baseVariantName);
        if (!base) return prev;
        const themeVariants = args.themes.map((theme) => ({
          ...base,
          id: "var_" + nanoid(6),
          name: `${args.baseVariantName}${theme.charAt(0).toUpperCase() + theme.slice(1).replace("-", "")}`,
          parameters: { ...(base.parameters ?? {}), backgrounds: { default: theme } },
        }));
        return { ...prev, variants: [...prev.variants, ...themeVariants] };
      });
      return Promise.resolve({ success: true });
    },

    generatePropMatrix: (_args: {
      props: { name: string; values: unknown[] }[];
    }): Promise<ToolResult> => {
      // Prop matrix generation is complex; agent outputs variant list from DSL context
      return Promise.resolve({ success: true, dsl: serializeStoriesDSL(activeFile) });
    },

    addI18nDecorator: (args: {
      library: "react-intl" | "i18next";
      locales: string[];
    }): Promise<ToolResult> => {
      const localeList = args.locales.join(", ");
      const decoratorStr = `(Story, context) => { /* ${args.library} i18n decorator — locales: ${localeList} */ return Story(context); }`;
      setActiveFile((prev) => ({
        ...prev,
        decorators: [...(prev.decorators ?? []), decoratorStr],
      }));
      return Promise.resolve({ success: true });
    },

    inferFromDesignToken: (_args: { tokens: Record<string, unknown> }): Promise<ToolResult> => {
      // Design token inference — agent generates argTypes and updates default args in chat
      return Promise.resolve({ success: true, dsl: serializeStoriesDSL(activeFile) });
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
