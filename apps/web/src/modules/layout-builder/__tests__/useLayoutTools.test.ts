import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLayoutState } from "../hooks/useLayoutState";
import { useLayoutTools } from "../hooks/useLayoutTools";
import type { LayoutNode } from "@ai-builder/schemas";

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

function useSubject() {
  const { layoutTree, setLayoutTree } = useLayoutState();
  const tools = useLayoutTools(layoutTree, setLayoutTree);
  return { layoutTree, tools };
}

describe("useLayoutTools", () => {
  it("addComponent appends a valid node to root", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: divNode });
    });
    const root = result.current.layoutTree.root;
    if (!("children" in root) || !root.children) throw new Error("root should have children");
    expect(root.children).toHaveLength(1);
    expect(root.children[0]?.id).toBe("box1");
  });

  it("addComponent returns error for invalid node", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.addComponent({ node: { tag: "invalid" } });
    expect(response).toMatchObject({ error: expect.any(String) });
  });

  it("addComponent returns success result with nodeId", async () => {
    const { result } = renderHook(() => useSubject());
    let response: Awaited<ReturnType<typeof result.current.tools.addComponent>> | undefined;
    await act(async () => {
      response = await result.current.tools.addComponent({ node: h1Node });
    });
    expect(response).toMatchObject({ success: true, nodeId: "title1" });
  });

  it("removeComponent removes a node by id", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: divNode });
      await result.current.tools.removeComponent({ nodeId: "box1" });
    });
    const root = result.current.layoutTree.root;
    if (!("children" in root)) throw new Error("root should be container");
    const children = root.children ?? [];
    expect(children.find((c) => c.id === "box1")).toBeUndefined();
  });

  it("updateClasses replaces classes on a node", async () => {
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
    if (!("children" in root) || !root.children) throw new Error("root should have children");
    const node = root.children.find((c) => c.id === "box1");
    expect(node?.classes).toEqual(["grid", "gap-4"]);
  });

  it("nestComponent moves a node to a new parent", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.addComponent({ node: divNode });
      await result.current.tools.addComponent({ node: h1Node });
      await result.current.tools.nestComponent({ nodeId: "title1", newParentId: "box1" });
    });
    const root = result.current.layoutTree.root;
    if (!("children" in root) || !root.children) throw new Error("root should have children");
    // h1 should no longer be direct child of root
    expect(root.children.find((c) => c.id === "title1")).toBeUndefined();
    // h1 should be child of box1
    const box = root.children.find((c) => c.id === "box1");
    if (!box || !("children" in box) || !box.children) throw new Error("box1 should have children");
    expect(box.children.find((c) => c.id === "title1")).toBeDefined();
  });

  it("queryLayout returns serialized DSL", async () => {
    const { result } = renderHook(() => useSubject());
    const response = await result.current.tools.queryLayout();
    expect(response).toMatchObject({ layout: expect.stringContaining("div#root") });
  });

  it("applyTheme applies theme options to the tree", async () => {
    const { result } = renderHook(() => useSubject());
    await act(async () => {
      await result.current.tools.applyTheme({ colorScheme: "slate" });
    });
    const root = result.current.layoutTree.root;
    // applyTheme adds bg-slate-900 to div/section/main nodes
    expect(root.classes).toContain("bg-slate-900");
  });
});
