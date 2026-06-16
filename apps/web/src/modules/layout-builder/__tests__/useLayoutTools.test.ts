import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLayoutState } from "../hooks/useLayoutState";
import { useLayoutTools } from "../hooks/useLayoutTools";
import type { LayoutNode } from "@ai-builder/schemas";

// ─── localStorage stub ────────────────────────────────────────────────────────

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
  vi.clearAllTimers();
});

// ─── Fixture nodes ────────────────────────────────────────────────────────────

const divNode: LayoutNode = {
  id: "box1",
  tag: "div",
  classes: ["flex"],
  label: "Box 1",
  children: null,
};

const h1Node: LayoutNode = {
  id: "title1",
  tag: "h1",
  classes: null,
  content: "Hello",
};

const pNode: LayoutNode = {
  id: "para1",
  tag: "p",
  classes: null,
  content: "Paragraph",
};

const btnNode: LayoutNode = {
  id: "btn1",
  tag: "button",
  classes: null,
  content: "Click me",
  variant: null,
};

function useSubject() {
  const state = useLayoutState();
  const tools = useLayoutTools(state.layoutTree, state.setLayoutTree);
  return { ...state, tools };
}

// ─── addComponent ─────────────────────────────────────────────────────────────

describe("addComponent", () => {
  it("appends a valid node to root", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: divNode });
    });
    const root = result.current.layoutTree.root;
    if (!("children" in root) || !root.children) throw new Error("root should have children");
    expect(root.children).toHaveLength(1);
    expect(root.children[0]?.id).toBe("box1");
  });

  it("returns error for invalid node", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addComponent({ node: { tag: "invalid" } });
    expect(response).toMatchObject({ error: expect.any(String) });
  });

  it("returns success result with nodeId", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Awaited<ReturnType<typeof result.current.tools.addComponent>> | undefined;
    await act(async () => {
      response = await result.current.tools.addComponent({ node: h1Node });
    });
    expect(response).toMatchObject({ success: true, nodeId: "title1" });
  });
});

// ─── removeComponent ──────────────────────────────────────────────────────────

describe("removeComponent", () => {
  it("removes a node by id", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: divNode });
      await result.current.tools.removeComponent({ nodeId: "box1" });
    });
    const root = result.current.layoutTree.root;
    if (!("children" in root)) throw new Error("root should be container");
    expect((root.children ?? []).find((c) => c.id === "box1")).toBeUndefined();
  });
});

// ─── updateClasses ────────────────────────────────────────────────────────────

describe("updateClasses", () => {
  it("replaces classes on a node", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: divNode });
      await result.current.tools.updateClasses({
        nodeId: "box1",
        classes: ["grid", "gap-4"],
        mode: "replace",
      });
    });
    const root = result.current.layoutTree.root;
    if (!("children" in root) || !root.children) throw new Error();
    expect(root.children.find((c) => c.id === "box1")?.classes).toEqual(["grid", "gap-4"]);
  });

  it("merges classes without duplicates", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: divNode }); // has ["flex"]
      await result.current.tools.updateClasses({
        nodeId: "box1",
        classes: ["flex", "gap-4"],
        mode: "merge",
      });
    });
    const root = result.current.layoutTree.root;
    if (!("children" in root) || !root.children) throw new Error();
    const node = root.children.find((c) => c.id === "box1");
    expect(node?.classes?.filter((c) => c === "flex")).toHaveLength(1);
    expect(node?.classes).toContain("gap-4");
  });
});

// ─── updateContent ────────────────────────────────────────────────────────────

describe("updateContent", () => {
  it("updates text content of a leaf node", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: h1Node });
      await result.current.tools.updateContent({ nodeId: "title1", content: "Updated heading" });
    });
    const root = result.current.layoutTree.root;
    if (!("children" in root) || !root.children) throw new Error();
    const node = root.children.find((c) => c.id === "title1");
    if (!node) throw new Error("node not found");
    expect("content" in node && node.content).toBe("Updated heading");
  });

  it("updates button content", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: btnNode });
      await result.current.tools.updateContent({ nodeId: "btn1", content: "Submit" });
    });
    const root = result.current.layoutTree.root;
    if (!("children" in root) || !root.children) throw new Error();
    const node = root.children.find((c) => c.id === "btn1");
    if (!node) throw new Error("node not found");
    expect("content" in node && node.content).toBe("Submit");
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: h1Node });
    });
    let response: Awaited<ReturnType<typeof result.current.tools.updateContent>> | undefined;
    await act(async () => {
      response = await result.current.tools.updateContent({ nodeId: "title1", content: "x" });
    });
    expect(response).toMatchObject({ success: true });
  });
});

// ─── nestComponent ────────────────────────────────────────────────────────────

describe("nestComponent", () => {
  it("moves a node to a new parent", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: divNode });
      await result.current.tools.addComponent({ node: h1Node });
      await result.current.tools.nestComponent({ nodeId: "title1", newParentId: "box1" });
    });
    const root = result.current.layoutTree.root;
    if (!("children" in root) || !root.children) throw new Error();
    expect(root.children.find((c) => c.id === "title1")).toBeUndefined();
    const box = root.children.find((c) => c.id === "box1");
    if (!box || !("children" in box) || !box.children) throw new Error();
    expect(box.children.find((c) => c.id === "title1")).toBeDefined();
  });
});

// ─── reorderComponents ────────────────────────────────────────────────────────

describe("reorderComponents", () => {
  it("reorders children of a container", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: h1Node });
      await result.current.tools.addComponent({ node: pNode });
      await result.current.tools.reorderComponents({
        parentId: result.current.layoutTree.root.id,
        orderedIds: ["para1", "title1"],
      });
    });
    const root = result.current.layoutTree.root;
    if (!("children" in root) || !root.children) throw new Error();
    expect(root.children[0]?.id).toBe("para1");
    expect(root.children[1]?.id).toBe("title1");
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Awaited<ReturnType<typeof result.current.tools.reorderComponents>> | undefined;
    await act(async () => {
      response = await result.current.tools.reorderComponents({ parentId: "root", orderedIds: [] });
    });
    expect(response).toMatchObject({ success: true });
  });
});

// ─── duplicateComponent ───────────────────────────────────────────────────────

describe("duplicateComponent", () => {
  it("inserts a clone after the original", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: h1Node });
      await result.current.tools.duplicateComponent({ nodeId: "title1" });
    });
    const root = result.current.layoutTree.root;
    if (!("children" in root) || !root.children) throw new Error();
    expect(root.children).toHaveLength(2);
    expect(root.children[0]?.id).toBe("title1");
    expect(root.children[1]?.id).not.toBe("title1");
  });

  it("returns success with originalId", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: h1Node });
    });
    let response: Awaited<ReturnType<typeof result.current.tools.duplicateComponent>> | undefined;
    await act(async () => {
      response = await result.current.tools.duplicateComponent({ nodeId: "title1" });
    });
    expect(response).toMatchObject({ success: true, originalId: "title1" });
  });
});

// ─── queryLayout ──────────────────────────────────────────────────────────────

describe("queryLayout", () => {
  it("returns serialized DSL", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.queryLayout();
    expect(response).toMatchObject({ layout: expect.stringContaining("div#root") });
  });
});

// ─── applyTheme ───────────────────────────────────────────────────────────────

describe("applyTheme", () => {
  it("applies colorScheme to tree", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.applyTheme({ colorScheme: "slate" });
    });
    expect(result.current.layoutTree.root.classes).toContain("bg-slate-900");
  });

  it("returns success", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Awaited<ReturnType<typeof result.current.tools.applyTheme>> | undefined;
    await act(async () => {
      response = await result.current.tools.applyTheme({});
    });
    expect(response).toMatchObject({ success: true });
  });
});
