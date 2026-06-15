#!/usr/bin/env tsx
import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { EvalRunResult, CaseResult } from "./harness.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(__dirname, "results");

// ─── Load results ─────────────────────────────────────────────────────────────

function loadResults(): EvalRunResult[] {
  let files: string[];
  try {
    files = readdirSync(resultsDir)
      .filter((f) => f.endsWith(".json"))
      .sort();
  } catch {
    files = [];
  }

  return files
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(resultsDir, f), "utf-8")) as EvalRunResult;
      } catch {
        return null;
      }
    })
    .filter((r): r is EvalRunResult => r !== null);
}

// ─── Compare two runs of the same module ─────────────────────────────────────

function compareModule(older: EvalRunResult, newer: EvalRunResult): void {
  const delta = newer.aggregateScore - older.aggregateScore;
  const deltaStr = (delta >= 0 ? "+" : "") + (delta * 100).toFixed(1) + "%";
  const arrow = delta > 0.01 ? "▲" : delta < -0.01 ? "▼" : "─";

  console.log(
    "\n═══ " + newer.module.toUpperCase() + " ══════════════════════════════════════════"
  );
  console.log(" " + older.timestamp + "  →  " + newer.timestamp + "  " + arrow + " " + deltaStr);
  console.log(
    " Overall: " +
      (older.aggregateScore * 100).toFixed(1) +
      "% → " +
      (newer.aggregateScore * 100).toFixed(1) +
      "%"
  );

  // Per-case breakdown
  console.log("\n── Case Δ ─────────────────────────────────────────────");
  const olderMap = new Map<string, CaseResult>(older.cases.map((c) => [c.id, c]));
  for (const newCase of newer.cases) {
    const oldCase = olderMap.get(newCase.id);
    if (!oldCase) {
      console.log(" + " + newCase.id.padEnd(14) + " (new case)");
      continue;
    }
    const d = newCase.aggregate - oldCase.aggregate;
    const dStr = (d >= 0 ? "+" : "") + (d * 100).toFixed(1) + "%";
    const icon = d > 0.05 ? "▲" : d < -0.05 ? "▼" : " ";
    console.log(
      " " +
        icon +
        " " +
        newCase.id.padEnd(14) +
        (newCase.aggregate * 100).toFixed(1).padStart(5) +
        "% (" +
        dStr +
        ")"
    );
  }

  // Per-scorer aggregate comparison
  if (newer.cases.length > 0 && older.cases.length > 0) {
    const scorerNames = Object.keys(newer.cases[0]?.scores ?? {});
    if (scorerNames.length > 0) {
      console.log("\n── Scorer Δ ───────────────────────────────────────────");
      for (const scorer of scorerNames) {
        const oldAvg =
          older.cases.reduce((s, c) => s + (c.scores[scorer]?.score ?? 0), 0) / older.cases.length;
        const newAvg =
          newer.cases.reduce((s, c) => s + (c.scores[scorer]?.score ?? 0), 0) / newer.cases.length;
        const d = newAvg - oldAvg;
        const dStr = (d >= 0 ? "+" : "") + (d * 100).toFixed(1) + "%";
        const icon = d > 0.05 ? "▲" : d < -0.05 ? "▼" : " ";
        console.log(
          " " +
            icon +
            " " +
            scorer.padEnd(34) +
            (newAvg * 100).toFixed(1).padStart(5) +
            "% (" +
            dStr +
            ")"
        );
      }
    }
  }

  console.log("");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const all = loadResults();

if (all.length === 0) {
  console.log("[compare] No result files found in evals/results/. Run eval:all first.");
  process.exit(0);
}

if (all.length === 1) {
  const r = all[0];
  console.log(
    "[compare] Only one result found. Module=" +
      (r?.module ?? "?") +
      " score=" +
      ((r?.aggregateScore ?? 0) * 100).toFixed(1) +
      "%"
  );
  process.exit(0);
}

// Group by module, pick last two of each
const byModule = new Map<string, EvalRunResult[]>();
for (const r of all) {
  const list = byModule.get(r.module) ?? [];
  list.push(r);
  byModule.set(r.module, list);
}

let compared = 0;
for (const [, runs] of byModule) {
  if (runs.length < 2) continue;
  const older = runs[runs.length - 2];
  const newer = runs[runs.length - 1];
  if (older && newer) {
    compareModule(older, newer);
    compared++;
  }
}

if (compared === 0) {
  console.log("[compare] Need at least 2 runs per module to compare. Run eval:all twice.");
}
