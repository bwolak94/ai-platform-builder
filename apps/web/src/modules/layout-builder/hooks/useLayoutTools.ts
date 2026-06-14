import {
  serializeLayoutDSL,
  insertNode,
  removeNode,
  updateNodeClasses,
  moveNode,
  applyThemeToTree,
} from "@ai-builder/serializers";
import { LayoutNodeSchema } from "@ai-builder/schemas";
import type { LayoutTree } from "@ai-builder/schemas";

type Setter = React.Dispatch<React.SetStateAction<LayoutTree>>;

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
interface NestComponentArgs {
  nodeId: string;
  newParentId: string;
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

export function useLayoutTools(layoutTree: LayoutTree, setLayoutTree: Setter) {
  return {
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

    nestComponent: ({ nodeId, newParentId }: NestComponentArgs): Promise<SimpleResult> => {
      setLayoutTree((prev) => moveNode(prev, nodeId, newParentId));
      return Promise.resolve({ success: true });
    },

    queryLayout: (): Promise<QueryResult> => {
      return Promise.resolve({ layout: serializeLayoutDSL(layoutTree) });
    },

    applyTheme: (args: ApplyThemeArgs): Promise<SimpleResult> => {
      setLayoutTree((prev) => applyThemeToTree(prev, args));
      return Promise.resolve({ success: true });
    },
  };
}

export type LayoutTools = ReturnType<typeof useLayoutTools>;
