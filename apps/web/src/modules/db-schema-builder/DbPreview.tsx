import { useMemo } from "react";
import { generateMermaidErd } from "@ai-builder/serializers";
import type { DbSchema } from "@ai-builder/schemas";

interface DbPreviewProps {
  schema: DbSchema;
  theme?: "neutral" | "dark" | "forest" | "default";
}

function buildPreviewHtml(mermaidDef: string, title: string, theme: string): string {
  const escaped = mermaidDef.replace(/`/g, "\\`");
  const bg = theme === "dark" ? "#1e1e2e" : "#f8f9fa";
  const textColor = theme === "dark" ? "#cdd6f4" : "#1a1a2e";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { margin: 0; background: ${bg}; color: ${textColor}; display: flex; justify-content: center; padding: 20px; font-family: sans-serif; }
    .mermaid { max-width: 100%; }
  </style>
</head>
<body>
<div class="mermaid" id="diagram"></div>
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  mermaid.initialize({ startOnLoad: false, theme: "${theme}" });
  const def = \`${escaped}\`;
  const { svg } = await mermaid.render("erd", def);
  document.getElementById("diagram").innerHTML = svg;
</script>
</body>
</html>`;
}

export function DbPreview({ schema, theme = "neutral" }: DbPreviewProps) {
  const srcDoc = useMemo(
    () => buildPreviewHtml(generateMermaidErd(schema), schema.name, theme),
    [schema, theme]
  );

  if (schema.tables.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Add tables to see the ERD diagram.
      </div>
    );
  }

  return (
    <iframe
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      title="Database ERD preview"
      className="h-full w-full border-0"
    />
  );
}
