import { describe, it, expect } from "vitest";
import {
  serializeLayoutDSL,
  deserializeLayoutDSL,
  findNode,
  insertNode,
  removeNode,
  updateNodeClasses,
  moveNode,
  collectAllClasses,
  collectAllTags,
  applyThemeToTree,
} from "../layout-dsl";
import type { LayoutTree, LayoutNode } from "@ai-builder/schemas";

function makeTree(): LayoutTree {
  return {
    id: "tree_test",
    root: {
      id: "root",
      tag: "div",
      classes: ["min-h-screen"],
      label: "Root",
      children: [
        {
          id: "hero",
          tag: "section",
          classes: ["py-20"],
          label: "Hero",
          children: [
            { id: "title", tag: "h1", classes: ["text-5xl"], content: "Hello World" },
            { id: "cta", tag: "button", classes: ["px-8"], content: "Get started", variant: null },
          ],
        },
      ],
    },
  };
}

describe("serializeLayoutDSL", () => {
  it("serializes a flat tree", () => {
    const tree: LayoutTree = {
      id: "t1",
      root: { id: "root", tag: "div", classes: ["flex"], label: null, children: null },
    };
    const dsl = serializeLayoutDSL(tree);
    expect(dsl).toContain("div#root");
    expect(dsl).toContain(".flex");
  });

  it("serializes nested tree with indentation", () => {
    const tree = makeTree();
    const dsl = serializeLayoutDSL(tree);
    const lines = dsl.split("\n");
    // Root is at depth 0
    expect(lines[0]).toMatch(/^div#root/);
    // Section is at depth 1 (2 spaces)
    const sectionLine = lines.find((l) => l.includes("section#hero"));
    expect(sectionLine).toMatch(/^ {2}section#hero/);
    // h1 is at depth 2 (4 spaces)
    const h1Line = lines.find((l) => l.includes("h1#title"));
    expect(h1Line).toMatch(/^ {4}h1#title/);
  });

  it("includes content in quotes for leaf nodes", () => {
    const tree = makeTree();
    const dsl = serializeLayoutDSL(tree);
    expect(dsl).toContain('"Hello World"');
    expect(dsl).toContain('"Get started"');
  });

  it("serializes img node with src and alt", () => {
    const tree: LayoutTree = {
      id: "t",
      root: {
        id: "root",
        tag: "div",
        classes: null,
        label: null,
        children: [{ id: "img1", tag: "img", classes: null, src: "/logo.png", alt: "Logo" }],
      },
    };
    const dsl = serializeLayoutDSL(tree);
    expect(dsl).toContain('src="/logo.png"');
    expect(dsl).toContain('alt="Logo"');
  });
});

describe("deserializeLayoutDSL", () => {
  it("round-trips through serialize → deserialize", () => {
    const tree = makeTree();
    const dsl = serializeLayoutDSL(tree);
    const restored = deserializeLayoutDSL(dsl);

    expect(restored.root.tag).toBe("div");
    expect(restored.root.id).toBe("root");

    if (!("children" in restored.root) || !restored.root.children) {
      throw new Error("root should have children");
    }
    const section = restored.root.children[0];
    expect(section?.tag).toBe("section");

    if (!section || !("children" in section) || !section.children) {
      throw new Error("section should have children");
    }
    expect(section.children[0]?.tag).toBe("h1");
  });

  it("returns empty tree for empty DSL", () => {
    const restored = deserializeLayoutDSL("");
    expect(restored.root.tag).toBe("div");
  });
});

describe("findNode", () => {
  it("finds root by id", () => {
    const tree = makeTree();
    const node = findNode(tree, "root");
    expect(node?.id).toBe("root");
  });

  it("finds nested node by id", () => {
    const tree = makeTree();
    const node = findNode(tree, "title");
    expect(node?.id).toBe("title");
    expect(node?.tag).toBe("h1");
  });

  it("returns null for non-existent id", () => {
    const tree = makeTree();
    expect(findNode(tree, "nonexistent")).toBeNull();
  });
});

describe("insertNode", () => {
  it("appends node to root when parentId is null", () => {
    const tree = makeTree();
    const newNode: LayoutNode = {
      id: "footer1",
      tag: "footer",
      classes: null,
      label: null,
      children: null,
    };
    const updated = insertNode(tree, newNode, null, null);

    if (!("children" in updated.root) || !updated.root.children) {
      throw new Error("root should have children");
    }
    const last = updated.root.children[updated.root.children.length - 1];
    expect(last?.id).toBe("footer1");
  });

  it("inserts node after sibling", () => {
    const tree = makeTree();
    const newNode: LayoutNode = { id: "sub", tag: "p", classes: null, content: "Sub" };
    const updated = insertNode(tree, newNode, "hero", "title");

    const hero = findNode(updated, "hero");
    if (!hero || !("children" in hero) || !hero.children) throw new Error("hero missing");
    const idx = hero.children.findIndex((c) => c.id === "sub");
    const titleIdx = hero.children.findIndex((c) => c.id === "title");
    expect(idx).toBe(titleIdx + 1);
  });
});

describe("removeNode", () => {
  it("removes a leaf node", () => {
    const tree = makeTree();
    const updated = removeNode(tree, "title");
    expect(findNode(updated, "title")).toBeNull();
  });

  it("removes a subtree", () => {
    const tree = makeTree();
    const updated = removeNode(tree, "hero");
    expect(findNode(updated, "hero")).toBeNull();
    expect(findNode(updated, "title")).toBeNull();
  });

  it("does not remove root (no-op for unknown id)", () => {
    const tree = makeTree();
    const updated = removeNode(tree, "nonexistent");
    expect(updated.root.id).toBe("root");
  });
});

describe("updateNodeClasses", () => {
  it("replaces classes", () => {
    const tree = makeTree();
    const updated = updateNodeClasses(tree, "title", ["text-6xl", "font-bold"], "replace");
    const node = findNode(updated, "title");
    expect(node?.classes).toEqual(["text-6xl", "font-bold"]);
  });

  it("merges classes without duplicates", () => {
    const tree = makeTree();
    const updated = updateNodeClasses(tree, "title", ["text-5xl", "font-bold"], "merge");
    const node = findNode(updated, "title");
    expect(node?.classes).toContain("font-bold");
    // no duplicate text-5xl
    expect(node?.classes?.filter((c) => c === "text-5xl")).toHaveLength(1);
  });

  it("removes specified class while keeping others", () => {
    const tree = makeTree();
    // hero section has ["py-20"] — merge another class first, then remove one
    const withExtra = updateNodeClasses(tree, "hero", ["bg-white"], "merge");
    const updated = updateNodeClasses(withExtra, "hero", ["py-20"], "remove");
    const node = findNode(updated, "hero");
    expect(node?.classes).not.toContain("py-20");
    expect(node?.classes).toContain("bg-white");
  });

  it("sets classes to null when all classes are removed", () => {
    const tree = makeTree();
    const updated = updateNodeClasses(tree, "title", ["text-5xl"], "remove");
    const node = findNode(updated, "title");
    expect(node?.classes).toBeNull();
  });
});

describe("moveNode", () => {
  it("moves a node to a new parent", () => {
    const tree = makeTree();
    // Move cta (button) to root
    const updated = moveNode(tree, "cta", "root");
    expect(findNode(updated, "cta")).not.toBeNull();

    const hero = findNode(updated, "hero");
    if (!hero || !("children" in hero)) throw new Error("hero missing");
    const heroChildren = hero.children ?? [];
    expect(heroChildren.find((c) => c.id === "cta")).toBeUndefined();
  });

  it("does not move node into itself", () => {
    const tree = makeTree();
    const updated = moveNode(tree, "hero", "hero");
    // Should be unchanged - hero is still in root
    expect(findNode(updated, "hero")).not.toBeNull();
  });
});

describe("collectAllClasses / collectAllTags", () => {
  it("collects all classes from tree", () => {
    const tree = makeTree();
    const classes = collectAllClasses(tree.root);
    expect(classes).toContain("min-h-screen");
    expect(classes).toContain("py-20");
    expect(classes).toContain("text-5xl");
    expect(classes).toContain("px-8");
  });

  it("collects all tags from tree", () => {
    const tree = makeTree();
    const tags = collectAllTags(tree.root);
    expect(tags).toContain("div");
    expect(tags).toContain("section");
    expect(tags).toContain("h1");
    expect(tags).toContain("button");
  });
});

describe("applyThemeToTree", () => {
  it("applies colorScheme to container and text nodes", () => {
    const tree = makeTree();
    const updated = applyThemeToTree(tree, { colorScheme: "slate" });
    const section = findNode(updated, "hero");
    expect(section?.classes).toContain("bg-slate-900");
  });

  it("applies accentColor to buttons", () => {
    const tree = makeTree();
    const updated = applyThemeToTree(tree, { accentColor: "violet" });
    const btn = findNode(updated, "cta");
    expect(btn?.classes).toContain("bg-violet-600");
  });

  it("applies rounded to buttons", () => {
    const tree = makeTree();
    const updated = applyThemeToTree(tree, { rounded: "xl" });
    const btn = findNode(updated, "cta");
    expect(btn?.classes).toContain("rounded-xl");
  });
});
