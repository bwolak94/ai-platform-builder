/**
 * CLI script to index the corpus/ markdown documents into Upstash Vector.
 * Run with: node --loader ts-node/esm src/rag/index-corpus.ts
 *
 * Requires environment variables:
 *   UPSTASH_URL, UPSTASH_TOKEN
 */

import { Index } from "@upstash/vector";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const CORPUS_DIR = join(process.cwd(), "../../corpus");
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function indexCorpus(): Promise<void> {
  const url = process.env.UPSTASH_URL;
  const token = process.env.UPSTASH_TOKEN;

  if (!url || !token) {
    throw new Error("UPSTASH_URL and UPSTASH_TOKEN environment variables are required");
  }

  const index = new Index({ url, token });

  const files = await readdir(CORPUS_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  console.log(`Indexing ${mdFiles.length} corpus documents...`);

  let totalVectors = 0;

  for (const file of mdFiles) {
    const filePath = join(CORPUS_DIR, file);
    const content = await readFile(filePath, "utf-8");
    const chunks = chunkText(content);

    const vectors = chunks.map((chunk, i) => ({
      id: `${file}-chunk-${i}`,
      data: chunk,
      metadata: {
        source: file,
        chunkIndex: i,
        content: chunk,
      },
    }));

    await index.upsert(vectors);
    totalVectors += vectors.length;
    console.log(`  ${file}: ${vectors.length} chunks`);
  }

  console.log(`Done. Indexed ${totalVectors} total vectors.`);
}

indexCorpus().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
