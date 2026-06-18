// DSL format:
// STORY: Button | path:src/components/Button.tsx
// title: Components/Button
// layout: centered
// tags: autodocs,test
// args: label="Click me" variant="primary"
// DECORATOR: (Story) => <ThemeProvider><Story /></ThemeProvider>
// ARGTYPE name: text [desc="Label text"]
// ARGTYPE variant: select [options=primary,secondary,danger] [default=primary]
//
// VARIANT Default:   {"label":"Click me","variant":"primary"}
// VARIANT Disabled:  {"label":"Click me","disabled":true}

import { nanoid } from "nanoid";
import type { StoryFile, StoryVariant, ArgType } from "@ai-builder/schemas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => k + "=" + JSON.stringify(v))
    .join(" ");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Serialize ────────────────────────────────────────────────────────────────

export function serializeStoriesDSL(file: StoryFile): string {
  const lines: string[] = [
    "STORY: " + file.componentName + " | path:" + file.componentPath,
    "title: " + file.title,
  ];
  if (file.layout) lines.push("layout: " + file.layout);
  if (file.tags?.length) lines.push("tags: " + file.tags.join(","));
  if (file.defaultArgs) lines.push("args: " + serializeArgs(file.defaultArgs));

  if (file.decorators?.length) {
    for (const d of file.decorators) {
      lines.push("DECORATOR: " + d);
    }
  }

  if (file.argTypes?.length) {
    for (const at of file.argTypes) {
      let line = "ARGTYPE " + at.name + ": " + at.control;
      if (at.options?.length) line += " [options=" + at.options.join(",") + "]";
      if (at.defaultValue !== null) line += ' [default="' + at.defaultValue + '"]';
      if (at.description) line += ' [desc="' + at.description.replace(/"/g, '\\"') + '"]';
      lines.push(line);
    }
  }

  lines.push("");
  for (const variant of file.variants) {
    const viewport = variant.viewport ? " viewport:" + variant.viewport : "";
    const params =
      variant.parameters && Object.keys(variant.parameters).length > 0
        ? " params:" + JSON.stringify(variant.parameters)
        : "";
    const docs = variant.docs ? ' docs:"' + variant.docs.replace(/"/g, '\\"') + '"' : "";
    lines.push(
      "VARIANT " + variant.name + ":  " + JSON.stringify(variant.args) + viewport + params + docs
    );
  }
  return lines.join("\n");
}

// ─── Deserialize ─────────────────────────────────────────────────────────────

export function deserializeStoriesDSL(dsl: string): StoryFile {
  const lines = dsl.split("\n");
  const firstLine = lines[0] ?? "";

  const componentMatch = /STORY:\s*([^\s|]+)/.exec(firstLine);
  const pathMatch = /path:(\S+)/.exec(firstLine);

  let title = "";
  let layout: StoryFile["layout"] = null;
  let defaultArgs: Record<string, unknown> | null = null;
  let tags: string[] | null = null;
  const decorators: string[] = [];
  const argTypes: ArgType[] = [];
  const variants: StoryVariant[] = [];

  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("title:")) {
      title = trimmed.slice(6).trim();
    } else if (trimmed.startsWith("layout:")) {
      layout = trimmed.slice(7).trim() as StoryFile["layout"];
    } else if (trimmed.startsWith("tags:")) {
      tags = trimmed
        .slice(5)
        .trim()
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    } else if (trimmed.startsWith("DECORATOR:")) {
      decorators.push(trimmed.slice(10).trim());
    } else if (trimmed.startsWith("ARGTYPE ")) {
      const argTypeMatch = /ARGTYPE\s+(\w+):\s*(\w+)(.*)/.exec(trimmed);
      if (argTypeMatch) {
        const name = argTypeMatch[1] ?? "";
        const control = argTypeMatch[2] ?? "text";
        const rest = argTypeMatch[3] ?? "";
        const optionsMatch = /\[options=([^\]]+)\]/.exec(rest);
        const defaultMatch = /\[default="([^"]*)"\]/.exec(rest);
        const descMatch = /\[desc="([^"]*)"\]/.exec(rest);
        argTypes.push({
          name,
          control: control as ArgType["control"],
          options: optionsMatch?.[1] ? optionsMatch[1].split(",") : null,
          defaultValue: defaultMatch?.[1] ?? null,
          description: descMatch?.[1] ?? null,
        });
      }
    } else if (trimmed.startsWith("args:")) {
      try {
        const argStr = trimmed.slice(5).trim();
        const obj: Record<string, unknown> = {};
        const pairs = argStr.match(/(\w+)=("[^"]*"|\S+)/g) ?? [];
        for (const pair of pairs) {
          const eqIdx = pair.indexOf("=");
          const k = pair.slice(0, eqIdx);
          const v = pair.slice(eqIdx + 1);
          try {
            obj[k] = JSON.parse(v);
          } catch {
            obj[k] = v;
          }
        }
        defaultArgs = obj;
      } catch {
        /* ignore */
      }
    } else if (trimmed.startsWith("VARIANT ")) {
      const nameMatch = /VARIANT\s+([^:]+):/.exec(trimmed);
      // Args: first {...} block
      const argsStart = trimmed.indexOf("{");
      const argsEnd = trimmed.indexOf("}", argsStart);
      const viewportMatch = /viewport:(\S+)/.exec(trimmed);
      const paramsMatch = /params:(\{[^}]+\})/.exec(trimmed);
      const docsMatch = /docs:"((?:[^"\\]|\\.)*)"/.exec(trimmed);

      let args: Record<string, unknown> = {};
      if (argsStart !== -1 && argsEnd !== -1) {
        try {
          args = JSON.parse(trimmed.slice(argsStart, argsEnd + 1)) as Record<string, unknown>;
        } catch {
          /* ignore */
        }
      }

      let parameters: Record<string, unknown> | null = null;
      if (paramsMatch) {
        try {
          parameters = JSON.parse(paramsMatch[1] ?? "{}") as Record<string, unknown>;
        } catch {
          /* ignore */
        }
      }

      variants.push({
        id: "var_" + nanoid(6),
        name: nameMatch?.[1]?.trim() ?? "Variant",
        args,
        viewport: (viewportMatch?.[1] ?? null) as StoryVariant["viewport"],
        docs: docsMatch?.[1] ? docsMatch[1].replace(/\\"/g, '"') : null,
        parameters,
      });
    }
  }

  return {
    id: "story_" + nanoid(6),
    componentName: componentMatch?.[1] ?? "Component",
    componentPath: pathMatch?.[1] ?? "src/components/Component.tsx",
    title: title || (componentMatch?.[1] ?? "Component"),
    layout,
    defaultArgs,
    argTypes: argTypes.length > 0 ? argTypes : null,
    variants,
    tags: tags && tags.length > 0 ? tags : null,
    decorators: decorators.length > 0 ? decorators : null,
  };
}

// ─── .stories.tsx generation ──────────────────────────────────────────────────

export function generateStoriesCode(file: StoryFile): string {
  const indent = (str: string, spaces = 2): string => str.replace(/\n/g, "\n" + " ".repeat(spaces));

  const argsStr = file.defaultArgs
    ? "\n  args: " + indent(JSON.stringify(file.defaultArgs, null, 2)) + ","
    : "";

  const argTypesStr = file.argTypes?.length
    ? "\n  argTypes: " +
      indent(
        JSON.stringify(
          Object.fromEntries(
            file.argTypes.map((a) => [
              a.name,
              {
                control: a.options?.length
                  ? { type: a.control, options: a.options }
                  : { type: a.control },
                ...(a.description ? { description: a.description } : {}),
                ...(a.defaultValue !== null ? { defaultValue: a.defaultValue } : {}),
              },
            ])
          ),
          null,
          2
        )
      ) +
      ","
    : "";

  const tagsStr = file.tags?.length ? "\n  tags: " + JSON.stringify(file.tags) + "," : "";

  const decoratorsStr = file.decorators?.length
    ? "\n  decorators: [" + file.decorators.join(", ") + "],"
    : "";

  const variantExports = file.variants.map((v) => {
    const argsBlock = Object.keys(v.args).length
      ? "\n  args: " + indent(JSON.stringify(v.args, null, 2)) + ","
      : "";

    // Merge viewport shorthand into parameters
    const mergedParams: Record<string, unknown> = { ...(v.parameters ?? {}) };
    if (v.viewport) {
      mergedParams.viewport = { defaultViewport: v.viewport };
    }
    const parametersBlock = Object.keys(mergedParams).length
      ? "\n  parameters: " + indent(JSON.stringify(mergedParams, null, 2)) + ","
      : "";

    const docsBlock = v.docs ? `\n  // ${v.docs}` : "";

    return (
      "export const " +
      v.name.replace(/\s+/g, "") +
      ": Story = {" +
      docsBlock +
      argsBlock +
      parametersBlock +
      "\n};"
    );
  });

  return `import type { Meta, StoryObj } from "@storybook/react";
import { ${file.componentName} } from "${file.componentPath}";

type Story = StoryObj<typeof ${file.componentName}>;

const meta: Meta<typeof ${file.componentName}> = {
  title: "${file.title}",
  component: ${file.componentName},
  layout: "${file.layout ?? "centered"}",${argsStr}${argTypesStr}${tagsStr}${decoratorsStr}
};

export default meta;

${variantExports.join("\n\n")}
`;
}

// ─── Story preview HTML ───────────────────────────────────────────────────────

export function generateStoryPreviewHtml(file: StoryFile, variantId: string | null): string {
  const variant =
    (variantId ? file.variants.find((v) => v.id === variantId) : null) ?? file.variants[0] ?? null;

  const argTypes = file.argTypes ?? [];

  const argsRows =
    variant && Object.keys(variant.args).length > 0
      ? Object.entries(variant.args)
          .map(([key, value]) => {
            const argType = argTypes.find((a) => a.name === key);
            const typeLabel = argType?.control ?? inferControlType(value);
            return (
              "<tr>" +
              '<td class="key">' +
              escapeHtml(key) +
              "</td>" +
              '<td class="type">' +
              escapeHtml(typeLabel) +
              "</td>" +
              '<td class="value">' +
              escapeHtml(JSON.stringify(value)) +
              "</td>" +
              "</tr>"
            );
          })
          .join("")
      : null;

  const variantTabs = file.variants
    .map(
      (v) =>
        '<button class="tab' +
        (v.id === (variant?.id ?? "") ? " tab--active" : "") +
        '" data-id="' +
        escapeHtml(v.id) +
        '" onclick="selectVariant(\'' +
        escapeHtml(v.id) +
        "'\">" +
        escapeHtml(v.name) +
        "</button>"
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #1a1a1a; font-size: 13px; line-height: 1.5; padding: 16px; }
  .header { margin-bottom: 12px; }
  .component-name { font-size: 18px; font-weight: 700; color: #111; }
  .component-path { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px; color: #888; margin-top: 2px; }
  .title-badge { display: inline-block; background: #f0f0f0; border-radius: 4px; padding: 1px 6px; font-size: 11px; color: #555; margin-top: 4px; }
  .tabs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
  .tab { padding: 3px 10px; border-radius: 4px; border: 1px solid #e0e0e0; background: #fafafa; color: #444; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.1s; }
  .tab:hover { border-color: #6366f1; color: #6366f1; }
  .tab--active { background: #6366f1; color: #fff; border-color: #6366f1; }
  .section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #999; margin-bottom: 6px; }
  .controls-table { width: 100%; border-collapse: collapse; background: #fafafa; border: 1px solid #e5e5e5; border-radius: 6px; overflow: hidden; margin-bottom: 12px; }
  .controls-table th { padding: 6px 10px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #999; background: #f5f5f5; border-bottom: 1px solid #e5e5e5; }
  .controls-table td { padding: 6px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .controls-table tr:last-child td { border-bottom: none; }
  td.key { font-weight: 600; color: #e3116c; font-family: monospace; width: 130px; }
  td.type { color: #0070d1; font-family: monospace; width: 90px; font-size: 11px; }
  td.value { font-family: monospace; color: #2d7d2d; }
  .docs-box { background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 4px 4px 0; padding: 8px 12px; margin-bottom: 12px; color: #78350f; font-size: 12px; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
  .tag { background: #f0f0f0; border-radius: 10px; padding: 1px 8px; font-size: 11px; color: #555; }
  .decorators { margin-top: 8px; }
  .decorator { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 4px; padding: 4px 8px; font-family: monospace; font-size: 11px; color: #6b21a8; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .empty { color: #bbb; font-size: 12px; text-align: center; padding: 20px 0; }
  .viewport-chip { display: inline-flex; align-items: center; gap: 4px; background: #e0f2fe; border-radius: 10px; padding: 1px 8px; font-size: 11px; color: #0369a1; margin-bottom: 8px; }
</style>
</head>
<body>
<div class="header">
  <div class="component-name">${escapeHtml(file.componentName)}</div>
  <div class="title-badge">${escapeHtml(file.title)}</div>
  <div class="component-path">from "${escapeHtml(file.componentPath)}"</div>
</div>

${file.tags?.length ? '<div class="tags">' + file.tags.map((t) => '<span class="tag">' + escapeHtml(t) + "</span>").join("") + "</div>" : ""}

${file.variants.length > 1 ? '<div class="tabs">' + variantTabs + "</div>" : ""}

${
  variant
    ? (variant.viewport
        ? '<div class="viewport-chip">&#128241; ' + escapeHtml(variant.viewport) + "</div>"
        : "") +
      (variant.docs ? '<div class="docs-box">' + escapeHtml(variant.docs) + "</div>" : "") +
      (argsRows
        ? '<p class="section-label">Controls</p><table class="controls-table"><thead><tr><th>Name</th><th>Control</th><th>Value</th></tr></thead><tbody>' +
          argsRows +
          "</tbody></table>"
        : '<p class="empty">No props for this variant.</p>')
    : '<p class="empty">No variants defined yet.</p>'
}

${
  file.decorators?.length
    ? '<p class="section-label">Decorators</p><div class="decorators">' +
      file.decorators.map((d) => '<div class="decorator">' + escapeHtml(d) + "</div>").join("") +
      "</div>"
    : ""
}

<script>
function selectVariant(id) {
  document.querySelectorAll('.tab').forEach(function(t) {
    t.classList.toggle('tab--active', t.getAttribute('data-id') === id);
  });
}
</script>
</body>
</html>`;
}

function inferControlType(value: unknown): string {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "object" && value !== null) return "object";
  return "text";
}
