import { describe, it, expect } from "vitest";
import {
  serializeLayoutDSL,
  deserializeLayoutDSL,
  findNode,
  insertNode,
  removeNode,
  updateNodeClasses,
  updateNodeContent,
  moveNode,
  reorderChildren,
  duplicateNode,
  collectAllClasses,
  collectAllTags,
  applyThemeToTree,
  escapeHTML,
  renderNodeToHTML,
  renderNodeToJSX,
  generatePreviewHTML,
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

// ─── serializeLayoutDSL ───────────────────────────────────────────────────────

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
    expect(lines[0]).toMatch(/^div#root/);
    const sectionLine = lines.find((l) => l.includes("section#hero"));
    expect(sectionLine).toMatch(/^ {2}section#hero/);
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

// ─── deserializeLayoutDSL ─────────────────────────────────────────────────────

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

// ─── findNode ─────────────────────────────────────────────────────────────────

describe("findNode", () => {
  it("finds root by id", () => {
    const tree = makeTree();
    expect(findNode(tree, "root")?.id).toBe("root");
  });

  it("finds nested node by id", () => {
    const tree = makeTree();
    const node = findNode(tree, "title");
    expect(node?.tag).toBe("h1");
  });

  it("returns null for non-existent id", () => {
    expect(findNode(makeTree(), "nonexistent")).toBeNull();
  });
});

// ─── insertNode ───────────────────────────────────────────────────────────────

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
    if (!("children" in updated.root) || !updated.root.children)
      throw new Error("root should have children");
    expect(updated.root.children.at(-1)?.id).toBe("footer1");
  });

  it("inserts node after sibling", () => {
    const tree = makeTree();
    const newNode: LayoutNode = { id: "sub", tag: "p", classes: null, content: "Sub" };
    const updated = insertNode(tree, newNode, "hero", "title");
    const hero = findNode(updated, "hero");
    if (!hero || !("children" in hero) || !hero.children) throw new Error("hero missing");
    const idx = hero.children.findIndex((c) => c.id === "sub");
    expect(idx).toBe(hero.children.findIndex((c) => c.id === "title") + 1);
  });
});

// ─── removeNode ───────────────────────────────────────────────────────────────

describe("removeNode", () => {
  it("removes a leaf node", () => {
    expect(findNode(removeNode(makeTree(), "title"), "title")).toBeNull();
  });

  it("removes a subtree", () => {
    const updated = removeNode(makeTree(), "hero");
    expect(findNode(updated, "hero")).toBeNull();
    expect(findNode(updated, "title")).toBeNull();
  });

  it("no-op for unknown id", () => {
    expect(removeNode(makeTree(), "nonexistent").root.id).toBe("root");
  });
});

// ─── updateNodeClasses ────────────────────────────────────────────────────────

describe("updateNodeClasses", () => {
  it("replaces classes", () => {
    const node = findNode(
      updateNodeClasses(makeTree(), "title", ["text-6xl", "font-bold"], "replace"),
      "title"
    );
    expect(node?.classes).toEqual(["text-6xl", "font-bold"]);
  });

  it("merges classes without duplicates", () => {
    const node = findNode(
      updateNodeClasses(makeTree(), "title", ["text-5xl", "font-bold"], "merge"),
      "title"
    );
    expect(node?.classes).toContain("font-bold");
    expect(node?.classes?.filter((c) => c === "text-5xl")).toHaveLength(1);
  });

  it("removes specified class", () => {
    const withExtra = updateNodeClasses(makeTree(), "hero", ["bg-white"], "merge");
    const node = findNode(updateNodeClasses(withExtra, "hero", ["py-20"], "remove"), "hero");
    expect(node?.classes).not.toContain("py-20");
    expect(node?.classes).toContain("bg-white");
  });

  it("sets classes to null when all removed", () => {
    const node = findNode(updateNodeClasses(makeTree(), "title", ["text-5xl"], "remove"), "title");
    expect(node?.classes).toBeNull();
  });
});

// ─── updateNodeContent ────────────────────────────────────────────────────────

describe("updateNodeContent", () => {
  it("updates text content of a text node", () => {
    const updated = updateNodeContent(makeTree(), "title", "New Heading");
    const node = findNode(updated, "title");
    if (!node) throw new Error("node not found");
    expect("content" in node && node.content).toBe("New Heading");
  });

  it("updates button content", () => {
    const updated = updateNodeContent(makeTree(), "cta", "Sign up");
    const node = findNode(updated, "cta");
    if (!node) throw new Error("node not found");
    expect("content" in node && node.content).toBe("Sign up");
  });

  it("updates img alt text", () => {
    const tree: LayoutTree = {
      id: "t",
      root: {
        id: "root",
        tag: "div",
        classes: null,
        label: null,
        children: [{ id: "img1", tag: "img", classes: null, src: null, alt: "Old alt" }],
      },
    };
    const updated = updateNodeContent(tree, "img1", "New alt");
    const node = findNode(updated, "img1");
    if (!node) throw new Error("node not found");
    expect("alt" in node && node.alt).toBe("New alt");
  });

  it("is a no-op for container nodes", () => {
    const tree = makeTree();
    const updated = updateNodeContent(tree, "root", "ignored");
    expect(findNode(updated, "root")?.tag).toBe("div");
  });
});

// ─── moveNode ─────────────────────────────────────────────────────────────────

describe("moveNode", () => {
  it("moves a node to a new parent", () => {
    const updated = moveNode(makeTree(), "cta", "root");
    const hero = findNode(updated, "hero");
    if (!hero || !("children" in hero)) throw new Error("hero missing");
    expect((hero.children ?? []).find((c) => c.id === "cta")).toBeUndefined();
    expect(findNode(updated, "cta")).not.toBeNull();
  });

  it("does not move node into itself", () => {
    const updated = moveNode(makeTree(), "hero", "hero");
    expect(findNode(updated, "hero")).not.toBeNull();
  });
});

// ─── reorderChildren ─────────────────────────────────────────────────────────

describe("reorderChildren", () => {
  it("reorders children of a container", () => {
    const updated = reorderChildren(makeTree(), "hero", ["cta", "title"]);
    const hero = findNode(updated, "hero");
    if (!hero || !("children" in hero) || !hero.children) throw new Error("hero missing");
    expect(hero.children[0]?.id).toBe("cta");
    expect(hero.children[1]?.id).toBe("title");
  });

  it("appends unlisted children at the end", () => {
    const updated = reorderChildren(makeTree(), "hero", ["cta"]); // title not listed
    const hero = findNode(updated, "hero");
    if (!hero || !("children" in hero) || !hero.children) throw new Error("hero missing");
    expect(hero.children[0]?.id).toBe("cta");
    expect(hero.children[1]?.id).toBe("title");
  });

  it("is a no-op for unknown parentId", () => {
    const tree = makeTree();
    const updated = reorderChildren(tree, "nonexistent", ["cta", "title"]);
    expect(findNode(updated, "hero")).not.toBeNull();
  });
});

// ─── duplicateNode ────────────────────────────────────────────────────────────

describe("duplicateNode", () => {
  it("inserts a copy immediately after the original", () => {
    const updated = duplicateNode(makeTree(), "hero");
    const root = updated.root;
    if (!("children" in root) || !root.children) throw new Error("root missing children");
    expect(root.children).toHaveLength(2);
    expect(root.children[0]?.id).toBe("hero");
    // Clone gets a different id
    expect(root.children[1]?.id).not.toBe("hero");
  });

  it("deep-clones children with new ids", () => {
    const updated = duplicateNode(makeTree(), "hero");
    const root = updated.root;
    if (!("children" in root) || !root.children) throw new Error();
    const clone = root.children[1];
    if (!clone || !("children" in clone) || !clone.children)
      throw new Error("clone missing children");
    // None of the cloned node ids should match originals
    expect(clone.children[0]?.id).not.toBe("title");
    expect(clone.children[1]?.id).not.toBe("cta");
  });

  it("duplicates a leaf node", () => {
    const updated = duplicateNode(makeTree(), "title");
    const hero = findNode(updated, "hero");
    if (!hero || !("children" in hero) || !hero.children) throw new Error();
    expect(hero.children).toHaveLength(3);
    expect(hero.children[0]?.id).toBe("title");
    // Index 1 is the clone
    expect(hero.children[1]?.id).not.toBe("title");
    expect(hero.children[2]?.id).toBe("cta");
  });

  it("is a no-op for unknown nodeId", () => {
    const tree = makeTree();
    const updated = duplicateNode(tree, "nonexistent");
    const root = updated.root;
    if (!("children" in root) || !root.children) throw new Error();
    expect(root.children).toHaveLength(1);
  });
});

// ─── collectAllClasses / collectAllTags ───────────────────────────────────────

describe("collectAllClasses / collectAllTags", () => {
  it("collects all classes", () => {
    const classes = collectAllClasses(makeTree().root);
    expect(classes).toContain("min-h-screen");
    expect(classes).toContain("py-20");
    expect(classes).toContain("text-5xl");
    expect(classes).toContain("px-8");
  });

  it("collects all tags", () => {
    const tags = collectAllTags(makeTree().root);
    expect(tags).toContain("div");
    expect(tags).toContain("section");
    expect(tags).toContain("h1");
    expect(tags).toContain("button");
  });
});

// ─── applyThemeToTree ─────────────────────────────────────────────────────────

describe("applyThemeToTree", () => {
  it("applies colorScheme to container nodes", () => {
    const section = findNode(applyThemeToTree(makeTree(), { colorScheme: "slate" }), "hero");
    expect(section?.classes).toContain("bg-slate-900");
  });

  it("applies accentColor to buttons", () => {
    const btn = findNode(applyThemeToTree(makeTree(), { accentColor: "violet" }), "cta");
    expect(btn?.classes).toContain("bg-violet-600");
  });

  it("applies rounded to buttons", () => {
    const btn = findNode(applyThemeToTree(makeTree(), { rounded: "xl" }), "cta");
    expect(btn?.classes).toContain("rounded-xl");
  });
});

// ─── escapeHTML ───────────────────────────────────────────────────────────────

describe("escapeHTML", () => {
  it('escapes &, <, >, " characters', () => {
    expect(escapeHTML("a & b")).toBe("a &amp; b");
    expect(escapeHTML("<div>")).toBe("&lt;div&gt;");
    expect(escapeHTML('"hello"')).toBe("&quot;hello&quot;");
  });

  it("leaves safe strings untouched", () => {
    expect(escapeHTML("Hello World")).toBe("Hello World");
  });
});

// ─── renderNodeToHTML ─────────────────────────────────────────────────────────

describe("renderNodeToHTML", () => {
  it("renders h1 with class and escaped content", () => {
    const node: LayoutNode = {
      id: "t",
      tag: "h1",
      classes: ["text-5xl"],
      content: "Hello <World>",
    };
    const html = renderNodeToHTML(node, 0);
    expect(html).toBe('<h1 class="text-5xl">Hello &lt;World&gt;</h1>');
  });

  it("renders button", () => {
    const node: LayoutNode = {
      id: "b",
      tag: "button",
      classes: null,
      content: "Click",
      variant: null,
    };
    expect(renderNodeToHTML(node, 0)).toBe("<button>Click</button>");
  });

  it("renders self-closing img", () => {
    const node: LayoutNode = { id: "i", tag: "img", classes: null, src: "/a.png", alt: "Alt" };
    expect(renderNodeToHTML(node, 0)).toContain('src="/a.png"');
    expect(renderNodeToHTML(node, 0)).toContain('alt="Alt"');
  });

  it("renders container with children", () => {
    const node: LayoutNode = {
      id: "c",
      tag: "div",
      classes: ["flex"],
      label: null,
      children: [{ id: "p1", tag: "p", classes: null, content: "text" }],
    };
    const html = renderNodeToHTML(node, 0);
    expect(html).toContain('<div class="flex">');
    expect(html).toContain("<p>text</p>");
    expect(html).toContain("</div>");
  });

  it("renders empty container as self-closing pair", () => {
    const node: LayoutNode = { id: "c", tag: "div", classes: null, label: null, children: [] };
    expect(renderNodeToHTML(node, 0)).toBe("<div></div>");
  });
});

// ─── renderNodeToJSX ─────────────────────────────────────────────────────────

describe("renderNodeToJSX", () => {
  it("uses className instead of class", () => {
    const node: LayoutNode = { id: "t", tag: "h1", classes: ["text-xl"], content: "Hi" };
    expect(renderNodeToJSX(node, 0)).toBe('<h1 className="text-xl">Hi</h1>');
  });

  it("renders empty container as self-closing", () => {
    const node: LayoutNode = { id: "c", tag: "div", classes: null, label: null, children: [] };
    expect(renderNodeToJSX(node, 0)).toBe("<div />");
  });
});

// ─── generatePreviewHTML ─────────────────────────────────────────────────────

describe("generatePreviewHTML", () => {
  it("includes postMessage listener script", () => {
    const html = generatePreviewHTML(makeTree());
    expect(html).toContain("UPDATE_LAYOUT");
    expect(html).toContain("window.addEventListener");
  });

  it("includes Tailwind CDN script", () => {
    const html = generatePreviewHTML(makeTree());
    expect(html).toContain("cdn.tailwindcss.com");
  });

  it("includes the root node html", () => {
    const html = generatePreviewHTML(makeTree());
    expect(html).toContain("min-h-screen");
  });
});
