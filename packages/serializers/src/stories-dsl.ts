// DSL format:
// STORY: Button | path:src/components/Button.tsx
// title: Components/Button
// args: label="Click me" variant="primary"
//
// VARIANT Default:   { label:"Click me", variant:"primary" }
// VARIANT Disabled:  { label:"Click me", disabled:true }

import { nanoid } from "nanoid";
import type { StoryFile, StoryVariant } from "@ai-builder/schemas";

// ─── Serialize ────────────────────────────────────────────────────────────────

function serializeArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => k + "=" + JSON.stringify(v))
    .join(" ");
}

export function serializeStoriesDSL(file: StoryFile): string {
  const lines: string[] = [
    "STORY: " + file.componentName + " | path:" + file.componentPath,
    "title: " + file.title,
  ];
  if (file.layout) lines.push("layout: " + file.layout);
  if (file.defaultArgs) lines.push("args: " + serializeArgs(file.defaultArgs));
  lines.push("");
  for (const variant of file.variants) {
    const viewport = variant.viewport ? " viewport:" + variant.viewport : "";
    lines.push("VARIANT " + variant.name + ":  " + JSON.stringify(variant.args) + viewport);
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
  const variants: StoryVariant[] = [];

  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("title:")) {
      title = trimmed.slice(6).trim();
    } else if (trimmed.startsWith("layout:")) {
      layout = trimmed.slice(7).trim() as StoryFile["layout"];
    } else if (trimmed.startsWith("args:")) {
      try {
        // Convert key=value pairs to JSON
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
      const argsMatch = /\{([^}]+)\}/.exec(trimmed);
      const viewportMatch = /viewport:(\S+)/.exec(trimmed);
      let args: Record<string, unknown> = {};
      if (argsMatch) {
        try {
          args = JSON.parse("{" + (argsMatch[1] ?? "") + "}") as Record<string, unknown>;
        } catch {
          /* ignore */
        }
      }
      variants.push({
        id: "var_" + nanoid(6),
        name: nameMatch?.[1]?.trim() ?? "Variant",
        args,
        viewport: (viewportMatch?.[1] ?? null) as StoryVariant["viewport"],
        docs: null,
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
    argTypes: null,
    variants,
  };
}

// ─── .stories.tsx generation ──────────────────────────────────────────────────

export function generateStoriesCode(file: StoryFile): string {
  const argsStr = file.defaultArgs
    ? "\n  args: " + JSON.stringify(file.defaultArgs, null, 4).replace(/\n/g, "\n  ") + ","
    : "";

  const variantExports = file.variants.map((v) => {
    const argsBlock = Object.keys(v.args).length
      ? "\n  args: " + JSON.stringify(v.args, null, 4).replace(/\n/g, "\n  ") + ","
      : "";
    const viewport = v.viewport
      ? '\n  parameters: { viewport: { defaultViewport: "' + v.viewport + '" } },'
      : "";
    return (
      "export const " + v.name.replace(/\s+/g, "") + ": Story = {" + argsBlock + viewport + "\n};"
    );
  });

  return `import type { Meta, StoryObj } from "@storybook/react";
import { ${file.componentName} } from "${file.componentPath}";

type Story = StoryObj<typeof ${file.componentName}>;

const meta: Meta<typeof ${file.componentName}> = {
  title: "${file.title}",
  component: ${file.componentName},
  layout: "${file.layout ?? "centered"}",${argsStr}
};

export default meta;

${variantExports.join("\n\n")}
`;
}
