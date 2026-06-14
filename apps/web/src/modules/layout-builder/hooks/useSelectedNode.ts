import { useState } from "react";
import type { LayoutNode } from "@ai-builder/schemas";

export function useSelectedNode() {
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
  return { selectedNode, setSelectedNode };
}
