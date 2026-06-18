import { nanoid } from "nanoid";
import type { StoryFile, StoryVariant } from "@ai-builder/schemas";

// Lightweight regex-based parser for CSF3 .stories.tsx files.
// Handles common patterns; does not require a full TSX AST.
function parseStoriesFile(content: string): StoryFile | null {
  try {
    // Component name from Meta<typeof ComponentName>
    const metaComponentMatch =
      /component:\s*([A-Z][A-Za-z0-9]*)/.exec(content) ??
      /Meta<typeof\s+([A-Z][A-Za-z0-9]*)>/.exec(content);
    const componentName = metaComponentMatch?.[1] ?? null;
    if (!componentName) return null;

    // Import path for component
    const importMatch = new RegExp(
      `import\\s+\\{[^}]*${componentName}[^}]*\\}\\s+from\\s+["']([^"']+)["']`
    ).exec(content);
    const componentPath = importMatch?.[1] ?? "src/components/" + componentName;

    // Title
    const titleMatch = /title:\s*["']([^"']+)["']/.exec(content);
    const title = titleMatch?.[1] ?? componentName;

    // Layout
    const layoutMatch = /layout:\s*["'](centered|fullscreen|padded)["']/.exec(content);
    const layout = (layoutMatch?.[1] as StoryFile["layout"]) ?? "centered";

    // Tags
    const tagsMatch = /tags:\s*\[([^\]]+)\]/.exec(content);
    const tags = tagsMatch?.[1]
      ? tagsMatch[1]
          .split(",")
          .map((t) => t.trim().replace(/["']/g, ""))
          .filter(Boolean)
      : null;

    // Default args from Meta
    const metaArgsMatch = /const\s+meta[^=]*=\s*\{[^}]*args:\s*(\{[^}]+\})/s.exec(content);
    let defaultArgs: Record<string, unknown> | null = null;
    if (metaArgsMatch) {
      try {
        // Try to parse the args object — only works for simple JSON-compatible values
        const raw = metaArgsMatch[1] ?? "";
        defaultArgs = JSON.parse(raw.replace(/(\w+):/g, '"$1":').replace(/'/g, '"')) as Record<
          string,
          unknown
        >;
      } catch {
        /* ignore non-parseable args */
      }
    }

    // Named story exports: export const VariantName: Story = { ... }
    const variants: StoryVariant[] = [];
    const exportPattern = /export\s+const\s+([A-Z][A-Za-z0-9]*)\s*:\s*Story[^=]*=\s*\{([^}]*)\}/gs;
    let match: RegExpExecArray | null;
    while ((match = exportPattern.exec(content)) !== null) {
      const variantName = match[1] ?? "Variant";
      const body = match[2] ?? "";

      // Extract args
      const argsMatch = /args:\s*(\{[^}]+\})/s.exec(body);
      let args: Record<string, unknown> = {};
      if (argsMatch?.[1]) {
        try {
          args = JSON.parse(argsMatch[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"')) as Record<
            string,
            unknown
          >;
        } catch {
          /* ignore */
        }
      }

      // Extract viewport from parameters
      const viewportMatch = /defaultViewport:\s*["']([^"']+)["']/.exec(body);
      const viewport = (viewportMatch?.[1] as StoryVariant["viewport"]) ?? null;

      variants.push({
        id: "var_" + nanoid(6),
        name: variantName,
        args,
        viewport,
        docs: null,
        parameters: null,
      });
    }

    return {
      id: "story_" + nanoid(6),
      componentName,
      componentPath,
      title,
      layout,
      defaultArgs,
      argTypes: null,
      variants,
      tags,
      decorators: null,
    };
  } catch {
    return null;
  }
}

interface UseStoryImportOptions {
  onImport: (file: StoryFile) => void;
  onError?: (message: string) => void;
}

export function useStoryImport({ onImport, onError }: UseStoryImportOptions) {
  const openPicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".tsx,.ts";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content !== "string") return;

        const parsed = parseStoriesFile(content);
        if (!parsed) {
          onError?.(
            "Could not parse " +
              file.name +
              ". Make sure it follows CSF3 format with a Meta export."
          );
          return;
        }
        onImport(parsed);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return { openPicker };
}
