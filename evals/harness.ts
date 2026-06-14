import { Eval } from "braintrust";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { aggregateScore } from "./scorers/shared.js";
import type {
  Scorer,
  EvalOutput,
  EvalExpected,
  ScorerInput,
  ScorerResult,
} from "./scorers/shared.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EvalCase {
  id: string;
  input: string;
  [key: string]: unknown;
}

export interface CaseResult {
  id: string;
  input: string;
  scores: Record<string, ScorerResult>;
  aggregate: number;
  output: EvalOutput;
  durationMs: number;
}

export interface EvalRunResult {
  module: string;
  timestamp: string;
  commitSha: string;
  cases: CaseResult[];
  aggregateScore: number;
  totalTokens: number;
  totalDurationMs: number;
}

interface RunEvalOptions {
  module: "form" | "layout";
  dataset: EvalCase[];
  scorers: Record<string, Scorer>;
  agentUrl: string;
  braintrustProjectName?: string;
  dryRun?: boolean;
}

// ─── Agent task runner ────────────────────────────────────────────────────────

async function runAgentTask(
  input: string,
  mode: string,
  agentUrl: string,
  initialState?: unknown
): Promise<EvalOutput> {
  const startMs = Date.now();
  const toolCalls: EvalOutput["toolCalls"] = [];

  // Connect via WebSocket and stream the agent response
  const wsUrl = agentUrl.replace(/^http/, "ws") + "/ws?mode=" + mode;

  return new Promise<EvalOutput>((resolve, reject) => {
    let finalMessage = "";
    let schema: unknown;
    let tree: unknown;
    let tokensUsed = 0;

    const ws = new WebSocket(wsUrl);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Agent task timed out after 60s"));
    }, 60_000);

    ws.addEventListener("open", () => {
      ws.send(
        JSON.stringify({
          type: "message",
          content: input,
          ...(initialState ? { initialState } : {}),
        })
      );
    });

    ws.addEventListener("message", (event: MessageEvent) => {
      let msg: unknown;
      try {
        msg = JSON.parse(String(event.data)) as unknown;
      } catch {
        return;
      }

      if (!msg || typeof msg !== "object") return;
      const m = msg as Record<string, unknown>;

      if (m.type === "tool_call") {
        const toolName = typeof m.toolName === "string" ? m.toolName : "";
        const toolResult = m.result as Record<string, unknown> | undefined;
        toolCalls.push({ toolName, args: m.args, result: m.result });
        // Capture final state from queryTemplate / querySchema / queryTree tool calls
        if (toolName === "queryTemplate" || toolName === "querySchema") schema = toolResult?.schema;
        if (toolName === "queryTree") tree = toolResult?.tree;
      } else if (m.type === "message" && m.role === "assistant") {
        finalMessage = typeof m.content === "string" ? m.content : "";
      } else if (m.type === "usage") {
        tokensUsed = (m.totalTokens as number | undefined) ?? 0;
      } else if (m.type === "done" || m.type === "end") {
        clearTimeout(timeout);
        ws.close();
        resolve({
          schema,
          tree,
          toolCalls,
          finalMessage,
          tokensUsed,
          durationMs: Date.now() - startMs,
        });
      } else if (m.type === "error") {
        clearTimeout(timeout);
        ws.close();
        const msg = typeof m.message === "string" ? m.message : "Agent error";
        reject(new Error(msg));
      }
    });

    ws.addEventListener("error", (err) => {
      clearTimeout(timeout);
      const detail = err instanceof Error ? err.message : "unknown";
      reject(new Error("WebSocket error: " + detail));
    });
  });
}

// ─── Dry-run stub (when AGENT_URL not set) ────────────────────────────────────

function dryRunOutput(): EvalOutput {
  return {
    schema: undefined,
    tree: undefined,
    toolCalls: [],
    finalMessage: "[dry-run] No agent available",
    tokensUsed: 0,
    durationMs: 0,
  };
}

// ─── Score a single case ──────────────────────────────────────────────────────

async function scoreCase(
  evalCase: EvalCase,
  output: EvalOutput,
  scorers: Record<string, Scorer>
): Promise<CaseResult> {
  const expected = evalCase as unknown as EvalExpected;
  const scorerInput: ScorerInput = { input: evalCase.input, output, expected };

  const scores: Record<string, ScorerResult> = {};
  for (const [name, scorer] of Object.entries(scorers)) {
    scores[name] = await scorer(scorerInput);
  }

  return {
    id: evalCase.id,
    input: evalCase.input,
    scores,
    aggregate: aggregateScore(scores),
    output,
    durationMs: output.durationMs,
  };
}

// ─── Main eval runner ─────────────────────────────────────────────────────────

export async function runEval({
  module,
  dataset,
  scorers,
  agentUrl,
  braintrustProjectName = "ai-platform-builder",
  dryRun = false,
}: RunEvalOptions): Promise<EvalRunResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  const commitSha = process.env.GIT_SHA ?? "local";

  // State map for sequential cases that depend on prior results
  const stateMap = new Map<string, unknown>();

  const caseResults: CaseResult[] = [];

  for (const evalCase of dataset) {
    const initialStateId = (evalCase.initialSchemaId ?? evalCase.initialTreeId) as
      | string
      | undefined;
    const initialState = initialStateId ? stateMap.get(initialStateId) : undefined;

    let output: EvalOutput;
    if (dryRun || !agentUrl) {
      output = dryRunOutput();
    } else {
      try {
        output = await runAgentTask(evalCase.input, module, agentUrl, initialState);
      } catch (err) {
        console.error("[eval] Agent error for case " + evalCase.id + ":", err);
        output = { ...dryRunOutput(), finalMessage: "[error] " + String(err) };
      }
    }

    // Store result state for dependent cases
    const resultState = output.schema ?? output.tree;
    if (resultState) {
      stateMap.set(evalCase.id + "-result", resultState);
    }

    const caseResult = await scoreCase(evalCase, output, scorers);
    caseResults.push(caseResult);

    const pct = (caseResult.aggregate * 100).toFixed(1);
    const scoreStr = Object.entries(caseResult.scores)
      .map(([k, v]) => k + "=" + v.score.toFixed(2))
      .join(" ");
    console.log("[" + evalCase.id + "] aggregate=" + pct + "% | " + scoreStr);
  }

  const totalTokens = caseResults.reduce((s, c) => s + c.output.tokensUsed, 0);
  const totalDurationMs = caseResults.reduce((s, c) => s + c.durationMs, 0);
  const overallScore = caseResults.reduce((s, c) => s + c.aggregate, 0) / caseResults.length;

  const runResult: EvalRunResult = {
    module,
    timestamp,
    commitSha,
    cases: caseResults,
    aggregateScore: overallScore,
    totalTokens,
    totalDurationMs,
  };

  // Save results to disk
  saveResults(module, timestamp, runResult);

  // Push to Braintrust (skip in dry-run or if no API key)
  if (!dryRun && process.env.BRAINTRUST_API_KEY) {
    await pushToBraintrust(braintrustProjectName, module, commitSha, dataset, caseResults, scorers);
  } else {
    console.log("[eval] Skipping Braintrust push (dry-run or no API key)");
  }

  console.log(
    "\n[" +
      module +
      "] OVERALL SCORE: " +
      (overallScore * 100).toFixed(1) +
      "% | tokens=" +
      String(totalTokens) +
      " | duration=" +
      String(Math.round(totalDurationMs / 1000)) +
      "s"
  );

  return runResult;
}

// ─── Save results JSON ────────────────────────────────────────────────────────

function saveResults(module: string, timestamp: string, result: EvalRunResult): void {
  const resultsDir = join(__dirname, "results");
  mkdirSync(resultsDir, { recursive: true });
  const filename = join(resultsDir, timestamp + "-" + module + ".json");
  writeFileSync(filename, JSON.stringify(result, null, 2) + "\n", "utf-8");
  console.log("[eval] Results saved → " + filename);
}

// ─── Braintrust push ──────────────────────────────────────────────────────────

async function pushToBraintrust(
  projectName: string,
  module: string,
  commitSha: string,
  dataset: EvalCase[],
  caseResults: CaseResult[],
  scorers: Record<string, Scorer>
): Promise<void> {
  const experimentName = module + "-" + commitSha.slice(0, 7);
  console.log("[eval] Pushing to Braintrust experiment: " + experimentName);

  const resultMap = new Map(caseResults.map((r) => [r.id, r]));

  await Eval(projectName + "-" + module, {
    experimentName,
    data: () =>
      dataset.map((c) => ({
        input: c.input,
        expected: c,
        metadata: { id: c.id, commitSha },
      })),
    task: (input: string): EvalOutput => {
      const caseResult = caseResults.find((r) => r.input === input);
      return caseResult?.output ?? dryRunOutput();
    },
    scores: Object.entries(scorers).map(([name]) => {
      return ({
        expected,
      }: {
        input: string;
        expected: Record<string, unknown>;
        output: unknown;
      }) => {
        const caseId = (expected.id as string | undefined) ?? "";
        const caseResult = resultMap.get(caseId);
        if (!caseResult) return { name, score: 0 };
        return { name, score: caseResult.scores[name]?.score ?? 0 };
      };
    }),
  });
}
