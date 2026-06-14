import { LayoutNodeSchema } from "@ai-builder/schemas";
import { collectAllClasses, collectAllTags } from "@ai-builder/serializers";
import type { LayoutNode } from "@ai-builder/schemas";
import type { Scorer } from "./shared.js";

function parseTree(tree: unknown): LayoutNode | null {
  const result = LayoutNodeSchema.safeParse(tree);
  return result.success ? result.data : null;
}

// Scorer 1: Are all Tailwind classes in valid format?
export const validTailwindClassesScorer: Scorer = ({ output }) => {
  const tree = parseTree(output.tree);
  if (!tree) return { score: 0, reason: "No tree output" };
  const allClasses = collectAllClasses(tree);
  if (allClasses.length === 0) return { score: 0, reason: "No classes found" };
  const valid = allClasses.filter((c) => /^[a-z0-9[\]:/\-.!]+$/.test(c));
  return { score: valid.length / allClasses.length };
};

// Scorer 2: Are responsive prefixes used for layout classes?
export const responsiveClassesScorer: Scorer = ({ output }) => {
  const tree = parseTree(output.tree);
  if (!tree) return { score: 0, reason: "No tree output" };
  const allClasses = collectAllClasses(tree);
  const layoutClasses = allClasses.filter(
    (c) =>
      c.startsWith("flex") || c.startsWith("grid") || c.startsWith("w-") || c.startsWith("col-")
  );
  if (layoutClasses.length === 0) return { score: 1 }; // no layout classes = not applicable
  const hasResponsive = allClasses.some(
    (c) => c.startsWith("sm:") || c.startsWith("md:") || c.startsWith("lg:")
  );
  if (hasResponsive) return { score: 1 };
  return { score: 0.3, reason: "No responsive prefixes found" };
};

// Scorer 3: Are semantic HTML tags used?
export const semanticHtmlScorer: Scorer = ({ output }) => {
  const tree = parseTree(output.tree);
  if (!tree) return { score: 0, reason: "No tree output" };
  const tags = collectAllTags(tree);
  const semanticTags = ["nav", "main", "section", "article", "header", "footer", "aside"];
  const hasSemantic = tags.some((t) => semanticTags.includes(t));
  return { score: hasSemantic ? 1 : 0.3 };
};

// Scorer 4: Does the tree contain expected tags?
export const expectedTagsScorer: Scorer = ({ output, expected }) => {
  const tree = parseTree(output.tree);
  if (!tree) return { score: 0, reason: "No tree output" };
  const expectedTags = expected.expectedTags ?? [];
  if (expectedTags.length === 0) return { score: 1 };
  const tags = collectAllTags(tree);
  const matches = expectedTags.filter((t) => tags.includes(t));
  return { score: matches.length / expectedTags.length };
};

export const LAYOUT_SCORERS: Record<string, Scorer> = {
  validTailwindClasses: validTailwindClassesScorer,
  responsiveClasses: responsiveClassesScorer,
  semanticHtml: semanticHtmlScorer,
  expectedTags: expectedTagsScorer,
};
