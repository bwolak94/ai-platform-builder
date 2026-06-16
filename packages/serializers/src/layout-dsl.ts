// DSL format (indented tree):
// section#hero .py-20.bg-slate-900
//   div#container .max-w-5xl.mx-auto.px-4
//     h1#title .text-5xl.font-bold "Build faster"
//     button#cta .px-8.py-3 "Get started"

import { nanoid } from "nanoid";
import type { LayoutTree, LayoutNode } from "@ai-builder/schemas";

// ─── Container tag check ──────────────────────────────────────────────────────

const CONTAINER_TAGS = new Set([
  "div",
  "section",
  "nav",
  "header",
  "main",
  "footer",
  "article",
  "aside",
]);

function isContainerNode(node: LayoutNode): node is Extract<LayoutNode, { children: unknown }> {
  return CONTAINER_TAGS.has(node.tag);
}

// ─── Serialize ────────────────────────────────────────────────────────────────

function serializeNode(node: LayoutNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const classes = node.classes?.length ? " ." + node.classes.join(".") : "";

  let line = indent + node.tag + "#" + node.id + classes;

  if ("content" in node) line += ' "' + node.content + '"';
  if ("alt" in node && node.alt) line += ' alt="' + node.alt + '"';
  if ("src" in node && node.src) line += ' src="' + node.src + '"';
  if ("label" in node && node.label) line += " [" + node.label + "]";

  if (isContainerNode(node) && node.children?.length) {
    const childLines = node.children.map((c) => serializeNode(c, depth + 1));
    return [line, ...childLines].join("\n");
  }
  return line;
}

export function serializeLayoutDSL(tree: LayoutTree): string {
  return serializeNode(tree.root, 0);
}

// ─── Deserialize ─────────────────────────────────────────────────────────────

interface ParsedLine {
  depth: number;
  tag: string;
  id: string;
  classes: string[];
  content: string | null;
  alt: string | null;
  src: string | null;
  label: string | null;
}

function parseLine(raw: string): ParsedLine | null {
  const match = /^( *)([a-z0-9]+)#([a-zA-Z0-9_-]+)((?:\.[a-z0-9[\]:/\-.!]+)*)(.*)?$/.exec(raw);
  if (!match) return null;

  const [, indentStr, tag, id, classStr, rest = ""] = match;
  const depth = (indentStr?.length ?? 0) / 2;
  const classes = classStr ? classStr.slice(1).split(".").filter(Boolean) : [];

  const contentMatch = /"([^"]*)"/.exec(rest);
  const altMatch = /alt="([^"]*)"/.exec(rest);
  const srcMatch = /src="([^"]*)"/.exec(rest);
  const labelMatch = /\[([^\]]+)\]/.exec(rest);

  return {
    depth,
    tag: tag ?? "",
    id: id ?? "",
    classes,
    content: contentMatch?.[1] ?? null,
    alt: altMatch?.[1] ?? null,
    src: srcMatch?.[1] ?? null,
    label: labelMatch?.[1] ?? null,
  };
}

function buildNode(p: ParsedLine, children: LayoutNode[]): LayoutNode {
  const base = { id: p.id, classes: p.classes.length ? p.classes : null };

  if (CONTAINER_TAGS.has(p.tag)) {
    return {
      ...base,
      tag: p.tag as "div",
      children: children.length ? children : null,
      label: p.label,
    };
  }
  if (p.tag === "img") {
    return { ...base, tag: "img", src: p.src, alt: p.alt ?? "" };
  }
  if (p.tag === "button") {
    return { ...base, tag: "button", content: p.content ?? "", variant: null };
  }
  // heading / p / span
  return { ...base, tag: p.tag as "h1", content: p.content ?? "" };
}

export function deserializeLayoutDSL(dsl: string): LayoutTree {
  const lines = dsl.split("\n").filter(Boolean);
  const parsed = lines.map(parseLine).filter((l): l is ParsedLine => l !== null);

  if (parsed.length === 0) {
    return {
      id: "tree_" + nanoid(6),
      root: { id: "root", tag: "div", classes: null, children: null, label: null },
    };
  }

  // Stack-based tree builder
  interface StackEntry {
    parsed: ParsedLine;
    children: LayoutNode[];
  }
  const stack: StackEntry[] = [];

  for (const p of parsed) {
    // Pop entries deeper than current depth
    while (stack.length > 0 && (stack[stack.length - 1]?.parsed.depth ?? -1) >= p.depth) {
      const finished = stack.pop();
      if (!finished) break;
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.children.push(buildNode(finished.parsed, finished.children));
      }
    }
    stack.push({ parsed: p, children: [] });
  }

  // Drain stack
  while (stack.length > 1) {
    const finished = stack.pop();
    if (!finished) break;
    const parent = stack[stack.length - 1];
    if (parent) {
      parent.children.push(buildNode(finished.parsed, finished.children));
    }
  }

  const rootEntry = stack[0];
  if (!rootEntry) {
    return {
      id: "tree_" + nanoid(6),
      root: { id: "root", tag: "div", classes: null, children: null, label: null },
    };
  }
  return {
    id: "tree_" + nanoid(6),
    root: buildNode(rootEntry.parsed, rootEntry.children),
  };
}

// ─── Tree Utilities ───────────────────────────────────────────────────────────

function mapTree(node: LayoutNode, fn: (n: LayoutNode) => LayoutNode): LayoutNode {
  const mapped = fn(node);
  if (isContainerNode(mapped) && mapped.children) {
    return { ...mapped, children: mapped.children.map((c) => mapTree(c, fn)) };
  }
  return mapped;
}

export function findNode(tree: LayoutTree, nodeId: string): LayoutNode | null {
  function search(node: LayoutNode): LayoutNode | null {
    if (node.id === nodeId) return node;
    if (isContainerNode(node) && node.children) {
      for (const child of node.children) {
        const found = search(child);
        if (found) return found;
      }
    }
    return null;
  }
  return search(tree.root);
}

export function insertNode(
  tree: LayoutTree,
  node: LayoutNode,
  parentId: string | null,
  afterSiblingId: string | null
): LayoutTree {
  // If parentId is null, append to root's children
  const targetParentId = parentId ?? tree.root.id;

  const newRoot = mapTree(tree.root, (n) => {
    if (n.id !== targetParentId || !isContainerNode(n)) return n;
    const existing = n.children ?? [];
    if (!afterSiblingId) return { ...n, children: [...existing, node] };
    const idx = existing.findIndex((c) => c.id === afterSiblingId);
    if (idx === -1) return { ...n, children: [...existing, node] };
    const updated = [...existing];
    updated.splice(idx + 1, 0, node);
    return { ...n, children: updated };
  });

  return { ...tree, root: newRoot };
}

export function removeNode(tree: LayoutTree, nodeId: string): LayoutTree {
  function prune(node: LayoutNode): LayoutNode {
    if (!isContainerNode(node) || !node.children) return node;
    const filtered = node.children.filter((c) => c.id !== nodeId).map(prune);
    return { ...node, children: filtered };
  }
  return { ...tree, root: prune(tree.root) };
}

export function updateNodeClasses(
  tree: LayoutTree,
  nodeId: string,
  classes: string[],
  mode: "replace" | "merge" | "remove"
): LayoutTree {
  const newRoot = mapTree(tree.root, (n) => {
    if (n.id !== nodeId) return n;
    const existing = n.classes ?? [];
    let updated: string[];
    if (mode === "replace") updated = classes;
    else if (mode === "merge") updated = [...new Set([...existing, ...classes])];
    else updated = existing.filter((c) => !classes.includes(c));
    return { ...n, classes: updated.length ? updated : null };
  });
  return { ...tree, root: newRoot };
}

export function updateNodeContent(tree: LayoutTree, nodeId: string, content: string): LayoutTree {
  const newRoot = mapTree(tree.root, (n) => {
    if (n.id !== nodeId) return n;
    if ("content" in n) return { ...n, content };
    if ("alt" in n) return { ...n, alt: content };
    return n;
  });
  return { ...tree, root: newRoot };
}

export function moveNode(tree: LayoutTree, nodeId: string, newParentId: string): LayoutTree {
  // Prevent moving a node into itself or its descendant
  const nodeToMove = findNode(tree, nodeId);
  if (!nodeToMove) return tree;
  if (findNode({ ...tree, root: nodeToMove }, newParentId)) return tree; // circular

  const withoutNode = removeNode(tree, nodeId);
  return insertNode(withoutNode, nodeToMove, newParentId, null);
}

export function reorderChildren(
  tree: LayoutTree,
  parentId: string,
  orderedIds: string[]
): LayoutTree {
  const newRoot = mapTree(tree.root, (n) => {
    if (n.id !== parentId || !isContainerNode(n) || !n.children) return n;
    const byId = new Map(n.children.map((c) => [c.id, c]));
    const reordered = orderedIds.map((id) => byId.get(id)).filter((c): c is LayoutNode => !!c);
    // append any children not in orderedIds at the end
    const extra = n.children.filter((c) => !orderedIds.includes(c.id));
    return { ...n, children: [...reordered, ...extra] };
  });
  return { ...tree, root: newRoot };
}

export function duplicateNode(tree: LayoutTree, nodeId: string): LayoutTree {
  function cloneWithNewIds(node: LayoutNode): LayoutNode {
    const newId = node.tag + "_" + nanoid(6);
    if (isContainerNode(node)) {
      return {
        ...node,
        id: newId,
        children: node.children?.map(cloneWithNewIds) ?? null,
      };
    }
    return { ...node, id: newId };
  }

  const original = findNode(tree, nodeId);
  if (!original) return tree;
  const clone = cloneWithNewIds(original);

  // Insert the clone after the original in its parent
  const newRoot = mapTree(tree.root, (n) => {
    if (!isContainerNode(n) || !n.children) return n;
    const idx = n.children.findIndex((c) => c.id === nodeId);
    if (idx === -1) return n;
    const updated = [...n.children];
    updated.splice(idx + 1, 0, clone);
    return { ...n, children: updated };
  });

  return { ...tree, root: newRoot };
}

export function collectAllClasses(node: LayoutNode): string[] {
  const classes = node.classes ?? [];
  if (isContainerNode(node) && node.children) {
    return [...classes, ...node.children.flatMap(collectAllClasses)];
  }
  return classes;
}

export function collectAllTags(node: LayoutNode): string[] {
  const tags = [node.tag];
  if (isContainerNode(node) && node.children) {
    return [...tags, ...node.children.flatMap(collectAllTags)];
  }
  return tags;
}

// ─── HTML / JSX Renderers (shared between preview and export) ─────────────────

export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderNodeToHTML(node: LayoutNode, indent: number): string {
  const pad = "  ".repeat(indent);
  const classAttr = node.classes?.length ? ` class="${node.classes.join(" ")}"` : "";

  if (node.tag === "img") {
    const src = node.src ? ` src="${escapeHTML(node.src)}"` : "";
    return `${pad}<img${classAttr}${src} alt="${escapeHTML(node.alt)}" />`;
  }

  if (
    node.tag === "h1" ||
    node.tag === "h2" ||
    node.tag === "h3" ||
    node.tag === "h4" ||
    node.tag === "p" ||
    node.tag === "span"
  ) {
    return `${pad}<${node.tag}${classAttr}>${escapeHTML(node.content)}</${node.tag}>`;
  }

  if (node.tag === "button") {
    return `${pad}<button${classAttr}>${escapeHTML(node.content)}</button>`;
  }

  // Container nodes
  const children = (node.children ?? []).map((c) => renderNodeToHTML(c, indent + 1)).join("\n");
  if (!children) return `${pad}<${node.tag}${classAttr}></${node.tag}>`;
  return `${pad}<${node.tag}${classAttr}>\n${children}\n${pad}</${node.tag}>`;
}

export function renderNodeToJSX(node: LayoutNode, indent: number): string {
  const pad = "  ".repeat(indent);
  const className = node.classes?.length ? ` className="${node.classes.join(" ")}"` : "";

  if (node.tag === "img") {
    const src = node.src ? ` src="${node.src}"` : "";
    return `${pad}<img${className}${src} alt="${node.alt}" />`;
  }

  if (
    node.tag === "h1" ||
    node.tag === "h2" ||
    node.tag === "h3" ||
    node.tag === "h4" ||
    node.tag === "p" ||
    node.tag === "span"
  ) {
    return `${pad}<${node.tag}${className}>${node.content}</${node.tag}>`;
  }

  if (node.tag === "button") {
    return `${pad}<button${className}>${node.content}</button>`;
  }

  const children = (node.children ?? []).map((c) => renderNodeToJSX(c, indent + 1)).join("\n");
  if (!children) return `${pad}<${node.tag}${className} />`;
  return `${pad}<${node.tag}${className}>\n${children}\n${pad}</${node.tag}>`;
}

export function generatePreviewHTML(tree: LayoutTree): string {
  const body = renderNodeToHTML(tree.root, 2);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { margin: 0; }</style>
  <script>
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'UPDATE_LAYOUT') {
        document.body.innerHTML = e.data.html;
      }
    });
  </script>
</head>
<body>
${body}
</body>
</html>`;
}

// ─── Theme Application ────────────────────────────────────────────────────────

interface ThemeOptions {
  colorScheme?: string;
  accentColor?: string;
  fontSize?: string;
  rounded?: string;
}

export function applyThemeToTree(tree: LayoutTree, theme: ThemeOptions): LayoutTree {
  const { colorScheme, accentColor, fontSize, rounded } = theme;

  const newRoot = mapTree(tree.root, (node) => {
    let classes = [...(node.classes ?? [])];

    if (colorScheme) {
      classes = classes.filter((c) => !/^(bg|text)-/.test(c));
      if (node.tag === "section" || node.tag === "div" || node.tag === "main") {
        classes.push("bg-" + colorScheme + "-900");
      }
      if (node.tag === "p" || node.tag === "span") {
        classes.push("text-" + colorScheme + "-200");
      }
    }

    if (accentColor && node.tag === "button") {
      classes = classes.filter((c) => !/^(bg|hover:bg)-/.test(c));
      classes.push("bg-" + accentColor + "-600", "hover:bg-" + accentColor + "-700");
    }

    if (fontSize && (node.tag === "p" || node.tag === "span")) {
      classes = classes.filter((c) => !/^text-(xs|sm|base|lg|xl|2xl)$/.test(c));
      classes.push("text-" + fontSize);
    }

    if (rounded && node.tag === "button") {
      classes = classes.filter((c) => !c.startsWith("rounded"));
      classes.push("rounded-" + rounded);
    }

    return { ...node, classes: classes.length ? classes : null };
  });

  return { ...tree, root: newRoot };
}
