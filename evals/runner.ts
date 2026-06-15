#!/usr/bin/env tsx
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { runEval } from "./harness.js";
import { FORM_SCORERS } from "./scorers/form-scorers.js";
import { LAYOUT_SCORERS } from "./scorers/layout-scorers.js";
import type { EvalCase } from "./harness.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CLI args ─────────────────────────────────────────────────────────────────

function getArg(name: string): string | undefined {
  const flag = "--" + name + "=";
  const arg = process.argv.find((a) => a.startsWith(flag));
  return arg?.slice(flag.length);
}

const module = getArg("module");
if (module !== "form" && module !== "layout") {
  console.error("Usage: runner.ts --module=form|layout [--dry-run]");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run") || !process.env.AGENT_URL;
const agentUrl = process.env.AGENT_URL ?? "http://localhost:8787";

if (dryRun) {
  console.log("[eval] Running in DRY-RUN mode (no agent calls)");
}

// ─── Load dataset ─────────────────────────────────────────────────────────────

const datasetPath = join(__dirname, "datasets", module + "-golden.json");
const dataset = JSON.parse(readFileSync(datasetPath, "utf-8")) as EvalCase[];

// ─── Run ──────────────────────────────────────────────────────────────────────

const scorers = module === "form" ? FORM_SCORERS : LAYOUT_SCORERS;

console.log(
  "\n═══════════════════════════════════════════════════════\n" +
    " AI Platform Builder — Eval Harness\n" +
    " Module : " +
    module +
    "\n" +
    " Cases  : " +
    String(dataset.length) +
    "\n" +
    " Scorers: " +
    Object.keys(scorers).join(", ") +
    "\n" +
    " Mode   : " +
    (dryRun ? "dry-run" : "live agent @ " + agentUrl) +
    "\n" +
    "═══════════════════════════════════════════════════════\n"
);

const result = await runEval({
  module,
  dataset,
  scorers,
  agentUrl,
  dryRun,
});

// ─── Summary table ────────────────────────────────────────────────────────────

console.log("\n── Case Scores ─────────────────────────────────────────");
for (const c of result.cases) {
  const pct = (c.aggregate * 100).toFixed(1).padStart(5);
  const status = c.aggregate >= 0.8 ? "✓" : c.aggregate >= 0.5 ? "~" : "✗";
  console.log(" " + status + " " + c.id.padEnd(14) + pct + "%");
}
console.log(
  "─────────────────────────────────────────────────────\n" +
    " TOTAL: " +
    (result.aggregateScore * 100).toFixed(1) +
    "% | " +
    String(result.totalTokens) +
    " tokens | " +
    String(Math.round(result.totalDurationMs / 1000)) +
    "s\n"
);

// Exit non-zero if overall score is below threshold
const threshold = module === "form" ? 0.7 : 0.65;
if (!dryRun && result.aggregateScore < threshold) {
  console.error(
    "[eval] Score " +
      (result.aggregateScore * 100).toFixed(1) +
      "% is below threshold " +
      (threshold * 100).toFixed(0) +
      "%"
  );
  process.exit(1);
}
