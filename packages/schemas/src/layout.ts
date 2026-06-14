import { z } from "zod";

export const TailwindClassSchema = z
  .string()
  .regex(/^[a-z0-9[\]:/\-.!]+$/, "Must be a valid Tailwind class");

// ─── Manual type definitions (required for recursive Zod schemas) ─────────────

interface BaseNode {
  id: string;
  classes: string[] | null;
}

interface ContainerNode extends BaseNode {
  tag: "div" | "section" | "nav" | "header" | "main" | "footer" | "article" | "aside";
  children: LayoutNode[] | null;
  label: string | null;
}

interface H1Node extends BaseNode {
  tag: "h1";
  content: string;
}
interface H2Node extends BaseNode {
  tag: "h2";
  content: string;
}
interface H3Node extends BaseNode {
  tag: "h3";
  content: string;
}
interface H4Node extends BaseNode {
  tag: "h4";
  content: string;
}
interface PNode extends BaseNode {
  tag: "p";
  content: string;
}
interface SpanNode extends BaseNode {
  tag: "span";
  content: string;
}
interface ImgNode extends BaseNode {
  tag: "img";
  src: string | null;
  alt: string;
}
interface ButtonNode extends BaseNode {
  tag: "button";
  content: string;
  variant: "primary" | "secondary" | "ghost" | "danger" | null;
}

export type LayoutNode =
  | ContainerNode
  | H1Node
  | H2Node
  | H3Node
  | H4Node
  | PNode
  | SpanNode
  | ImgNode
  | ButtonNode;

// ─── Zod schema ───────────────────────────────────────────────────────────────

const baseNode = {
  id: z.string(),
  classes: z.array(TailwindClassSchema).nullable(),
};

const containerShape = {
  ...baseNode,
  children: z.array(z.lazy((): z.ZodType<LayoutNode> => LayoutNodeSchema)).nullable(),
  label: z.string().nullable(),
};

export const LayoutNodeSchema: z.ZodType<LayoutNode> = z.lazy(() =>
  z.discriminatedUnion("tag", [
    z.object({ ...containerShape, tag: z.literal("div") }),
    z.object({ ...containerShape, tag: z.literal("section") }),
    z.object({ ...containerShape, tag: z.literal("nav") }),
    z.object({ ...containerShape, tag: z.literal("header") }),
    z.object({ ...containerShape, tag: z.literal("main") }),
    z.object({ ...containerShape, tag: z.literal("footer") }),
    z.object({ ...containerShape, tag: z.literal("article") }),
    z.object({ ...containerShape, tag: z.literal("aside") }),
    z.object({ ...baseNode, tag: z.literal("h1"), content: z.string() }),
    z.object({ ...baseNode, tag: z.literal("h2"), content: z.string() }),
    z.object({ ...baseNode, tag: z.literal("h3"), content: z.string() }),
    z.object({ ...baseNode, tag: z.literal("h4"), content: z.string() }),
    z.object({ ...baseNode, tag: z.literal("p"), content: z.string() }),
    z.object({ ...baseNode, tag: z.literal("span"), content: z.string() }),
    z.object({ ...baseNode, tag: z.literal("img"), src: z.string().nullable(), alt: z.string() }),
    z.object({
      ...baseNode,
      tag: z.literal("button"),
      content: z.string(),
      variant: z.enum(["primary", "secondary", "ghost", "danger"]).nullable(),
    }),
  ])
);

export const LayoutTreeSchema = z.object({
  id: z.string(),
  root: LayoutNodeSchema,
});

export type LayoutTree = z.infer<typeof LayoutTreeSchema>;
