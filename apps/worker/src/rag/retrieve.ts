import { tool } from "ai";
import { z } from "zod";
import { Index } from "@upstash/vector";

let vectorIndex: Index | null = null;

function getIndex(url: string, token: string): Index {
  vectorIndex ??= new Index({ url, token });
  return vectorIndex;
}

interface DocResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export async function retrieveDocs(
  query: string,
  url: string,
  token: string,
  topK = 5
): Promise<string> {
  const index = getIndex(url, token);

  const results = await index.query({
    data: query,
    topK,
    includeMetadata: true,
  });

  if (!results.length) {
    return "No relevant documentation found.";
  }

  return (results as DocResult[])
    .map((r) => {
      const content = typeof r.metadata.content === "string" ? r.metadata.content : "";
      const source = typeof r.metadata.source === "string" ? r.metadata.source : r.id;
      return `--- [${source}] ---\n${content}`;
    })
    .join("\n\n");
}

export function buildRetrieveDocsTool(upstashUrl: string, upstashToken: string) {
  return tool({
    description:
      "Search the internal documentation corpus for best practices, patterns, and reference material relevant to the current builder mode.",
    parameters: z.object({
      query: z.string().describe("Natural language search query"),
    }),
    execute: async ({ query }: { query: string }) => {
      return retrieveDocs(query, upstashUrl, upstashToken);
    },
  });
}
