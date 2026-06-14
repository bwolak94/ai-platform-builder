import { useState } from "react";
import { nanoid } from "nanoid";
import type { LayoutTree } from "@ai-builder/schemas";

export function makeEmptyTree(): LayoutTree {
  return {
    id: "tree_" + nanoid(6),
    root: {
      id: "root",
      tag: "div",
      classes: ["min-h-screen", "bg-white"],
      children: null,
      label: "Page root",
    },
  };
}

export function useLayoutState() {
  const [layoutTree, setLayoutTree] = useState<LayoutTree>(makeEmptyTree);
  return { layoutTree, setLayoutTree };
}
