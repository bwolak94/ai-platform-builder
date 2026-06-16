import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import type { LayoutTree } from "@ai-builder/schemas";

const STORAGE_KEY = "layout-builder-tree";
const MAX_HISTORY = 50;

export function makeEmptyTree(): LayoutTree {
  return {
    id: "tree_" + nanoid(6),
    root: {
      id: "root",
      tag: "div",
      classes: ["min-h-screen", "bg-white"],
      children: [],
      label: "Page root",
    },
  };
}

function loadPersistedTree(): LayoutTree {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LayoutTree;
  } catch {
    // ignore parse errors
  }
  return makeEmptyTree();
}

function persistTree(tree: LayoutTree): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
  } catch {
    // ignore quota errors
  }
}

export interface LayoutStateReturn {
  layoutTree: LayoutTree;
  setLayoutTree: (updater: LayoutTree | ((prev: LayoutTree) => LayoutTree)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetTree: () => void;
}

export function useLayoutState(): LayoutStateReturn {
  const [present, setPresent] = useState<LayoutTree>(loadPersistedTree);
  const [past, setPast] = useState<LayoutTree[]>([]);
  const [future, setFuture] = useState<LayoutTree[]>([]);

  const setLayoutTree = useCallback((updater: LayoutTree | ((prev: LayoutTree) => LayoutTree)) => {
    setPresent((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setPast((p) => [...p.slice(-MAX_HISTORY + 1), prev]);
      setFuture([]);
      persistTree(next);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p.at(-1);
      if (previous === undefined) return p;
      const newPast = p.slice(0, -1);
      setPresent((current) => {
        setFuture((f) => [current, ...f]);
        persistTree(previous);
        return previous;
      });
      return newPast;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f.at(0);
      if (next === undefined) return f;
      const newFuture = f.slice(1);
      setPresent((current) => {
        setPast((p) => [...p, current]);
        persistTree(next);
        return next;
      });
      return newFuture;
    });
  }, []);

  const resetTree = useCallback(() => {
    const fresh = makeEmptyTree();
    setPast([]);
    setFuture([]);
    persistTree(fresh);
    setPresent(fresh);
  }, []);

  return {
    layoutTree: present,
    setLayoutTree,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    resetTree,
  };
}
