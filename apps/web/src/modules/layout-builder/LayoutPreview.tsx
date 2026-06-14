import { useMemo } from "react";
import type { LayoutTree, LayoutNode } from "@ai-builder/schemas";

interface LayoutPreviewProps {
  tree: LayoutTree;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderNodeToHTML(node: LayoutNode, indent: number): string {
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

  // Container nodes (div, section, nav, header, main, footer, article, aside)
  const children = (node.children ?? [])
    .map((child) => renderNodeToHTML(child, indent + 1))
    .join("\n");

  if (!children) {
    return `${pad}<${node.tag}${classAttr}></${node.tag}>`;
  }

  return `${pad}<${node.tag}${classAttr}>\n${children}\n${pad}</${node.tag}>`;
}

function generatePreviewHTML(tree: LayoutTree): string {
  const body = renderNodeToHTML(tree.root, 2);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

export function LayoutPreview({ tree }: LayoutPreviewProps) {
  const htmlContent = useMemo(() => generatePreviewHTML(tree), [tree]);

  return (
    <iframe
      srcDoc={htmlContent}
      sandbox="allow-scripts"
      title="Layout preview"
      className="h-full w-full border-0"
      aria-label="Live layout preview"
    />
  );
}
