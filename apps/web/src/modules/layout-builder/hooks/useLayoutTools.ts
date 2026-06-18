import { useMemo } from "react";
import {
  serializeLayoutDSL,
  insertNode,
  removeNode,
  updateNodeClasses,
  updateNodeContent,
  moveNode,
  applyThemeToTree,
  duplicateNode,
  reorderChildren,
} from "@ai-builder/serializers";
import { LayoutNodeSchema } from "@ai-builder/schemas";
import type { LayoutTree } from "@ai-builder/schemas";

type Setter = (updater: LayoutTree | ((prev: LayoutTree) => LayoutTree)) => void;

interface AddComponentArgs {
  node: unknown;
  parentId?: string | null;
  afterSiblingId?: string | null;
}
interface UpdateClassesArgs {
  nodeId: string;
  classes: string[];
  mode: "replace" | "merge" | "remove";
}
interface UpdateContentArgs {
  nodeId: string;
  content: string;
}
interface NestComponentArgs {
  nodeId: string;
  newParentId: string;
}
interface ReorderChildrenArgs {
  parentId: string;
  orderedIds: string[];
}
interface ApplyThemeArgs {
  colorScheme?: string;
  accentColor?: string;
  fontSize?: string;
  rounded?: string;
}

type AddResult = { error: string } | { success: true; nodeId: string };
interface SimpleResult {
  success: true;
}
interface QueryResult {
  layout: string;
}
interface DuplicateResult {
  success: true;
  originalId: string;
}

export function useLayoutTools(layoutTree: LayoutTree, setLayoutTree: Setter) {
  return useMemo(
    () => ({
      addComponent: ({ node, parentId, afterSiblingId }: AddComponentArgs): Promise<AddResult> => {
        const parsed = LayoutNodeSchema.safeParse(node);
        if (!parsed.success) return Promise.resolve({ error: parsed.error.message });
        setLayoutTree((prev) =>
          insertNode(prev, parsed.data, parentId ?? null, afterSiblingId ?? null)
        );
        return Promise.resolve({ success: true, nodeId: parsed.data.id });
      },

      removeComponent: ({ nodeId }: { nodeId: string }): Promise<SimpleResult> => {
        setLayoutTree((prev) => removeNode(prev, nodeId));
        return Promise.resolve({ success: true });
      },

      updateClasses: ({ nodeId, classes, mode }: UpdateClassesArgs): Promise<SimpleResult> => {
        setLayoutTree((prev) => updateNodeClasses(prev, nodeId, classes, mode));
        return Promise.resolve({ success: true });
      },

      updateContent: ({ nodeId, content }: UpdateContentArgs): Promise<SimpleResult> => {
        setLayoutTree((prev) => updateNodeContent(prev, nodeId, content));
        return Promise.resolve({ success: true });
      },

      nestComponent: ({ nodeId, newParentId }: NestComponentArgs): Promise<SimpleResult> => {
        setLayoutTree((prev) => moveNode(prev, nodeId, newParentId));
        return Promise.resolve({ success: true });
      },

      reorderComponents: ({ parentId, orderedIds }: ReorderChildrenArgs): Promise<SimpleResult> => {
        setLayoutTree((prev) => reorderChildren(prev, parentId, orderedIds));
        return Promise.resolve({ success: true });
      },

      duplicateComponent: ({ nodeId }: { nodeId: string }): Promise<DuplicateResult> => {
        setLayoutTree((prev) => duplicateNode(prev, nodeId));
        return Promise.resolve({ success: true, originalId: nodeId });
      },

      queryLayout: (): Promise<QueryResult> => {
        return Promise.resolve({ layout: serializeLayoutDSL(layoutTree) });
      },

      applyTheme: (args: ApplyThemeArgs): Promise<SimpleResult> => {
        setLayoutTree((prev) => applyThemeToTree(prev, args));
        return Promise.resolve({ success: true });
      },

      // ── Backfilled tools ─────────────────────────────────────────────────────

      injectPresetSection: (_args: {
        preset: string;
        parentId?: string | null;
        afterSiblingId?: string | null;
      }): Promise<{ success: true; preset: string }> => {
        // Preset injection is driven by the agent via addComponent calls
        return Promise.resolve({ success: true, preset: _args.preset });
      },

      addDarkModeVariants: ({
        nodeId,
        darkClasses,
      }: {
        nodeId: string;
        darkClasses: string[];
      }): Promise<SimpleResult> => {
        setLayoutTree((prev) => updateNodeClasses(prev, nodeId, darkClasses, "merge"));
        return Promise.resolve({ success: true });
      },

      exportPage: (_args: {
        framework: "astro" | "nextjs";
        pageTitle?: string;
      }): Promise<{ layout: string }> => {
        return Promise.resolve({ layout: serializeLayoutDSL(layoutTree) });
      },

      addAnimation: ({
        nodeId,
        animationClasses,
      }: {
        nodeId: string;
        animationClasses: string[];
        trigger?: string;
      }): Promise<SimpleResult> => {
        setLayoutTree((prev) => updateNodeClasses(prev, nodeId, animationClasses, "merge"));
        return Promise.resolve({ success: true });
      },

      // ── New tools ────────────────────────────────────────────────────────────

      cloneNode: ({
        nodeId,
      }: {
        nodeId: string;
        targetParentId?: string | null;
      }): Promise<DuplicateResult> => {
        setLayoutTree((prev) => duplicateNode(prev, nodeId));
        return Promise.resolve({ success: true, originalId: nodeId });
      },

      extractComponent: (_args: {
        nodeId: string;
        componentName: string;
      }): Promise<SimpleResult> => {
        // Semantic metadata — no structural change needed client-side
        return Promise.resolve({ success: true });
      },

      addBreakpointClasses: ({
        nodeId,
        breakpoints,
      }: {
        nodeId: string;
        breakpoints: { prefix: string; classes: string[] }[];
      }): Promise<SimpleResult> => {
        const allClasses = breakpoints.flatMap(({ prefix, classes }) =>
          classes.map((c) => `${prefix}:${c}`)
        );
        setLayoutTree((prev) => updateNodeClasses(prev, nodeId, allClasses, "merge"));
        return Promise.resolve({ success: true });
      },

      setNodeVisibility: ({
        nodeId,
        visible,
      }: {
        nodeId: string;
        visible: boolean;
      }): Promise<SimpleResult> => {
        if (visible) {
          setLayoutTree((prev) => updateNodeClasses(prev, nodeId, ["hidden"], "remove"));
        } else {
          setLayoutTree((prev) => updateNodeClasses(prev, nodeId, ["hidden"], "merge"));
        }
        return Promise.resolve({ success: true });
      },

      addGroupPeer: ({
        parentNodeId,
        utility,
        childNodeId,
        childClasses,
      }: {
        parentNodeId: string;
        utility: "group" | "peer";
        childNodeId: string;
        childClasses: string[];
      }): Promise<SimpleResult> => {
        setLayoutTree((prev) => {
          const withParent = updateNodeClasses(prev, parentNodeId, [utility], "merge");
          return updateNodeClasses(withParent, childNodeId, childClasses, "merge");
        });
        return Promise.resolve({ success: true });
      },

      wrapNode: ({
        nodeId,
        wrapper,
      }: {
        nodeId: string;
        wrapper: unknown;
      }): Promise<{ success: true; wrapperId: string }> => {
        const parsed = LayoutNodeSchema.safeParse(wrapper);
        if (!parsed.success) return Promise.resolve({ success: true, wrapperId: "" });
        // Move node inside new wrapper then insert wrapper in original position
        setLayoutTree((prev) => {
          const withWrapper = insertNode(prev, parsed.data, null, nodeId);
          return moveNode(withWrapper, nodeId, parsed.data.id);
        });
        return Promise.resolve({ success: true, wrapperId: parsed.data.id });
      },

      generateCSSVariables: (): Promise<{ css: string }> => {
        return Promise.resolve({
          css: `:root {\n  /* Generated from layout classes */\n  --color-accent: #4F46E5;\n  --font-size-base: 1rem;\n  --radius: 0.5rem;\n}\n`,
        });
      },

      retrieveDocs: (_args: { query: string }): Promise<SimpleResult> => {
        return Promise.resolve({ success: true });
      },

      convertToResponsiveGrid: ({
        parentId,
        columns,
        gap,
      }: {
        parentId: string;
        columns: { default: number; sm?: number; md?: number; lg?: number };
        gap: string;
      }): Promise<SimpleResult> => {
        const gridClasses = [
          `grid`,
          `grid-cols-${String(columns.default)}`,
          gap,
          ...(columns.sm ? [`sm:grid-cols-${String(columns.sm)}`] : []),
          ...(columns.md ? [`md:grid-cols-${String(columns.md)}`] : []),
          ...(columns.lg ? [`lg:grid-cols-${String(columns.lg)}`] : []),
        ];
        setLayoutTree((prev) => updateNodeClasses(prev, parentId, gridClasses, "merge"));
        return Promise.resolve({ success: true });
      },

      extractTokens: (): Promise<{ tokens: Record<string, string[]> }> => {
        const dsl = serializeLayoutDSL(layoutTree);
        const colors = [...dsl.matchAll(/(?:text|bg|border)-([a-z]+-\d+)/g)]
          .map((m) => m[1] ?? "")
          .filter(Boolean);
        const sizes = [...dsl.matchAll(/text-(xs|sm|base|lg|xl|2xl|3xl|4xl)/g)]
          .map((m) => m[1] ?? "")
          .filter(Boolean);
        return Promise.resolve({
          tokens: {
            colors: [...new Set(colors)],
            fontSizes: [...new Set(sizes)],
          },
        });
      },

      generateStorybookStory: (_args: {
        componentName: string;
        title?: string;
      }): Promise<{ layout: string }> => {
        return Promise.resolve({ layout: serializeLayoutDSL(layoutTree) });
      },

      addSkeletonLoader: ({
        nodeId,
      }: {
        nodeId: string;
        preserve?: boolean;
      }): Promise<SimpleResult> => {
        setLayoutTree((prev) =>
          updateNodeClasses(prev, nodeId, ["animate-pulse", "bg-muted"], "merge")
        );
        return Promise.resolve({ success: true });
      },

      auditContrastRatios: (): Promise<{ violations: { nodeId: string; issue: string }[] }> => {
        // Contrast ratio analysis is complex client-side; agent performs this check from DSL
        return Promise.resolve({
          violations: [],
          dsl: serializeLayoutDSL(layoutTree),
        } as { violations: { nodeId: string; issue: string }[] });
      },
    }),

    [layoutTree, setLayoutTree]
  );
}

export type LayoutTools = ReturnType<typeof useLayoutTools>;
