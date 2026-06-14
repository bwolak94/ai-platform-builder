import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LayoutTree, LayoutNode } from "@ai-builder/schemas";

interface ExportPanelProps {
  tree: LayoutTree;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

  const children = (node.children ?? []).map((c) => renderNodeToHTML(c, indent + 1)).join("\n");
  if (!children) return `${pad}<${node.tag}${classAttr}></${node.tag}>`;
  return `${pad}<${node.tag}${classAttr}>\n${children}\n${pad}</${node.tag}>`;
}

function generateHTML(tree: LayoutTree): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Layout Export</title>
</head>
<body>
${renderNodeToHTML(tree.root, 1)}
</body>
</html>`;
}

function renderNodeToJSX(node: LayoutNode, indent: number): string {
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

function generateJSX(tree: LayoutTree): string {
  return `export function Layout() {
  return (
${renderNodeToJSX(tree.root, 2)}
  );
}
`;
}

export function ExportPanel({ tree }: ExportPanelProps) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Export layout as:</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generateHTML(tree), "layout.html", "text/html");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> HTML
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(generateJSX(tree), "Layout.tsx", "text/plain");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> React JSX
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            downloadFile(JSON.stringify(tree, null, 2), "layout.json", "application/json");
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> JSON
        </Button>
      </div>
    </div>
  );
}
