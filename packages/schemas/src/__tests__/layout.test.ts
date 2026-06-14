import { describe, it, expect } from "vitest";
import { LayoutNodeSchema, LayoutTreeSchema, TailwindClassSchema } from "../layout";

describe("TailwindClassSchema", () => {
  it("accepts valid Tailwind classes", () => {
    expect(TailwindClassSchema.safeParse("flex").success).toBe(true);
    expect(TailwindClassSchema.safeParse("text-xl").success).toBe(true);
    expect(TailwindClassSchema.safeParse("bg-slate-900").success).toBe(true);
    expect(TailwindClassSchema.safeParse("hover:text-blue-500").success).toBe(true);
    expect(TailwindClassSchema.safeParse("w-[200px]").success).toBe(true);
    expect(TailwindClassSchema.safeParse("md:grid-cols-3").success).toBe(true);
  });

  it("rejects invalid class names", () => {
    expect(TailwindClassSchema.safeParse("has spaces").success).toBe(false);
    expect(TailwindClassSchema.safeParse("UPPERCASE").success).toBe(false);
    expect(TailwindClassSchema.safeParse("").success).toBe(false);
  });
});

describe("LayoutNodeSchema — container nodes", () => {
  it("accepts a valid div node", () => {
    const result = LayoutNodeSchema.safeParse({
      id: "root",
      tag: "div",
      classes: ["flex", "flex-col"],
      children: null,
      label: "Container",
    });
    expect(result.success).toBe(true);
  });

  it("accepts nested div with children", () => {
    const result = LayoutNodeSchema.safeParse({
      id: "parent",
      tag: "div",
      classes: null,
      label: null,
      children: [{ id: "child", tag: "p", classes: null, content: "Hello" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts all container tags", () => {
    const tags = ["div", "section", "nav", "header", "main", "footer", "article", "aside"] as const;
    for (const tag of tags) {
      const result = LayoutNodeSchema.safeParse({
        id: "n",
        tag,
        classes: null,
        children: null,
        label: null,
      });
      expect(result.success, `tag ${tag} should be valid`).toBe(true);
    }
  });

  it("rejects container node missing required fields", () => {
    const result = LayoutNodeSchema.safeParse({ id: "n", tag: "div" });
    expect(result.success).toBe(false);
  });
});

describe("LayoutNodeSchema — leaf nodes", () => {
  it("accepts heading nodes", () => {
    for (const tag of ["h1", "h2", "h3", "h4"] as const) {
      const result = LayoutNodeSchema.safeParse({ id: "n", tag, classes: null, content: "Title" });
      expect(result.success, `${tag} should be valid`).toBe(true);
    }
  });

  it("accepts p and span nodes", () => {
    expect(
      LayoutNodeSchema.safeParse({ id: "n", tag: "p", classes: null, content: "text" }).success
    ).toBe(true);
    expect(
      LayoutNodeSchema.safeParse({ id: "n", tag: "span", classes: null, content: "text" }).success
    ).toBe(true);
  });

  it("accepts img node", () => {
    const result = LayoutNodeSchema.safeParse({
      id: "n",
      tag: "img",
      classes: null,
      src: "/img.png",
      alt: "An image",
    });
    expect(result.success).toBe(true);
  });

  it("accepts img node with null src", () => {
    const result = LayoutNodeSchema.safeParse({
      id: "n",
      tag: "img",
      classes: null,
      src: null,
      alt: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts button node with variant", () => {
    const result = LayoutNodeSchema.safeParse({
      id: "n",
      tag: "button",
      classes: null,
      content: "Click me",
      variant: "primary",
    });
    expect(result.success).toBe(true);
  });

  it("accepts button node with null variant", () => {
    const result = LayoutNodeSchema.safeParse({
      id: "n",
      tag: "button",
      classes: null,
      content: "Click me",
      variant: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects button with invalid variant", () => {
    const result = LayoutNodeSchema.safeParse({
      id: "n",
      tag: "button",
      classes: null,
      content: "Click",
      variant: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown tag", () => {
    const result = LayoutNodeSchema.safeParse({ id: "n", tag: "table", classes: null });
    expect(result.success).toBe(false);
  });
});

describe("LayoutTreeSchema", () => {
  it("accepts a valid layout tree", () => {
    const result = LayoutTreeSchema.safeParse({
      id: "tree_abc123",
      root: {
        id: "root",
        tag: "div",
        classes: ["min-h-screen"],
        children: [{ id: "h1", tag: "h1", classes: null, content: "Hello" }],
        label: "Page root",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects tree without id", () => {
    const result = LayoutTreeSchema.safeParse({
      root: { id: "root", tag: "div", classes: null, children: null, label: null },
    });
    expect(result.success).toBe(false);
  });
});
