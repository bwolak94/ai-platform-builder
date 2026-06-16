import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLayoutState, makeEmptyTree } from "../hooks/useLayoutState";
import type { LayoutTree } from "@ai-builder/schemas";

// ─── localStorage mock ────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      store = Object.fromEntries(Object.entries(store).filter(([k]) => k !== key));
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
});

// ─── makeEmptyTree ────────────────────────────────────────────────────────────

describe("makeEmptyTree", () => {
  it("creates a tree with a root div", () => {
    const tree = makeEmptyTree();
    expect(tree.root.tag).toBe("div");
    expect(tree.root.id).toBe("root");
  });

  it("root starts with children as empty array", () => {
    const tree = makeEmptyTree();
    if (!("children" in tree.root)) throw new Error("root should be container");
    expect(tree.root.children).toEqual([]);
  });
});

// ─── initial state ────────────────────────────────────────────────────────────

describe("useLayoutState initial state", () => {
  it("starts with canUndo=false, canRedo=false", () => {
    const { result } = renderHook(() => useLayoutState());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("loads persisted tree from localStorage", () => {
    const saved: LayoutTree = {
      id: "tree_saved",
      root: { id: "root", tag: "div", classes: ["bg-red-500"], label: null, children: [] },
    };
    localStorageMock.setItem("layout-builder-tree", JSON.stringify(saved));

    const { result } = renderHook(() => useLayoutState());
    expect(result.current.layoutTree.root.classes).toContain("bg-red-500");
  });

  it("falls back to empty tree if localStorage is invalid JSON", () => {
    localStorageMock.setItem("layout-builder-tree", "{{not json}}");
    const { result } = renderHook(() => useLayoutState());
    expect(result.current.layoutTree.root.tag).toBe("div");
  });
});

// ─── setLayoutTree ────────────────────────────────────────────────────────────

describe("setLayoutTree", () => {
  it("accepts an updater function", () => {
    const { result } = renderHook(() => useLayoutState());
    act(() => {
      result.current.setLayoutTree((prev) => ({
        ...prev,
        root: { ...prev.root, classes: ["updated"] },
      }));
    });
    expect(result.current.layoutTree.root.classes).toContain("updated");
  });

  it("accepts a plain tree value", () => {
    const { result } = renderHook(() => useLayoutState());
    const newTree = makeEmptyTree();
    newTree.root = { ...newTree.root, classes: ["direct"] };
    act(() => {
      result.current.setLayoutTree(newTree);
    });
    expect(result.current.layoutTree.root.classes).toContain("direct");
  });

  it("persists tree to localStorage on each update", () => {
    const { result } = renderHook(() => useLayoutState());
    act(() => {
      result.current.setLayoutTree((prev) => ({
        ...prev,
        root: { ...prev.root, classes: ["persisted"] },
      }));
    });
    const stored = JSON.parse(
      localStorageMock.getItem("layout-builder-tree") ?? "null"
    ) as LayoutTree;
    expect(stored.root.classes).toContain("persisted");
  });

  it("enables canUndo after first change", () => {
    const { result } = renderHook(() => useLayoutState());
    act(() => {
      result.current.setLayoutTree(makeEmptyTree());
    });
    expect(result.current.canUndo).toBe(true);
  });
});

// ─── undo / redo ─────────────────────────────────────────────────────────────

describe("undo / redo", () => {
  it("undo restores previous state", () => {
    const { result } = renderHook(() => useLayoutState());
    const original = result.current.layoutTree;

    act(() => {
      result.current.setLayoutTree((prev) => ({
        ...prev,
        root: { ...prev.root, classes: ["changed"] },
      }));
    });
    expect(result.current.layoutTree.root.classes).toContain("changed");

    act(() => {
      result.current.undo();
    });
    expect(result.current.layoutTree.root.classes).toEqual(original.root.classes);
  });

  it("redo re-applies undone change", () => {
    const { result } = renderHook(() => useLayoutState());
    act(() => {
      result.current.setLayoutTree((prev) => ({
        ...prev,
        root: { ...prev.root, classes: ["changed"] },
      }));
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });
    expect(result.current.layoutTree.root.classes).toContain("changed");
  });

  it("canUndo toggles correctly", () => {
    const { result } = renderHook(() => useLayoutState());
    expect(result.current.canUndo).toBe(false);
    act(() => {
      result.current.setLayoutTree(makeEmptyTree());
    });
    expect(result.current.canUndo).toBe(true);
    act(() => {
      result.current.undo();
    });
    expect(result.current.canUndo).toBe(false);
  });

  it("canRedo toggles correctly", () => {
    const { result } = renderHook(() => useLayoutState());
    act(() => {
      result.current.setLayoutTree(makeEmptyTree());
    });
    expect(result.current.canRedo).toBe(false);
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
    act(() => {
      result.current.redo();
    });
    expect(result.current.canRedo).toBe(false);
  });

  it("new change after undo clears redo stack", () => {
    const { result } = renderHook(() => useLayoutState());
    act(() => {
      result.current.setLayoutTree(makeEmptyTree());
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
    act(() => {
      result.current.setLayoutTree(makeEmptyTree());
    });
    expect(result.current.canRedo).toBe(false);
  });

  it("undo is a no-op when history is empty", () => {
    const { result } = renderHook(() => useLayoutState());
    const before = result.current.layoutTree;
    act(() => {
      result.current.undo();
    });
    expect(result.current.layoutTree).toBe(before);
  });

  it("redo is a no-op when future is empty", () => {
    const { result } = renderHook(() => useLayoutState());
    const before = result.current.layoutTree;
    act(() => {
      result.current.redo();
    });
    expect(result.current.layoutTree).toBe(before);
  });
});

// ─── resetTree ────────────────────────────────────────────────────────────────

describe("resetTree", () => {
  it("resets to a fresh empty tree", () => {
    const { result } = renderHook(() => useLayoutState());
    act(() => {
      result.current.setLayoutTree((prev) => ({
        ...prev,
        root: { ...prev.root, classes: ["custom"] },
      }));
    });
    act(() => {
      result.current.resetTree();
    });
    expect(result.current.layoutTree.root.classes).toEqual(["min-h-screen", "bg-white"]);
  });

  it("clears undo/redo history on reset", () => {
    const { result } = renderHook(() => useLayoutState());
    act(() => {
      result.current.setLayoutTree(makeEmptyTree());
    });
    act(() => {
      result.current.resetTree();
    });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});

// ─── setTimeout mock cleanup ──────────────────────────────────────────────────

afterEach(() => {
  vi.clearAllTimers();
});
