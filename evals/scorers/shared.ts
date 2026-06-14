// ─── Core types ───────────────────────────────────────────────────────────────

export interface ToolCallRecord {
  toolName: string;
  args: unknown;
  result: unknown;
}

export interface EvalOutput {
  schema?: unknown; // FormSchema after all tool calls (Form Builder)
  tree?: unknown; // LayoutNode after all tool calls (Layout Builder)
  toolCalls: ToolCallRecord[];
  finalMessage: string;
  tokensUsed: number;
  durationMs: number;
}

export interface EvalExpected {
  expectedFieldTypes?: string[];
  expectedFieldCount?: { min: number; max: number };
  mustHaveValidation?: string[];
  mustHaveSubmit?: boolean;
  expectedValidation?: { fieldName: string; rules: string[] };
  expectedPosition?: string;
  expectedRemovedField?: string;
  expectedOrder?: string[];
  expectedTags?: string[];
  expectedClasses?: Record<string, string[]>;
  expectedClassesPresent?: string[];
  expectedChildCount?: { min: number };
  mustHaveResponsive?: boolean;
  mustHaveSemanticTag?: string;
  [key: string]: unknown;
}

export interface ScorerInput {
  input: string;
  output: EvalOutput;
  expected: EvalExpected;
}

export interface ScorerResult {
  score: number;
  reason?: string;
}

export type Scorer = (input: ScorerInput) => ScorerResult | Promise<ScorerResult>;

// ─── Weighted aggregate ───────────────────────────────────────────────────────

export function aggregateScore(
  scores: Record<string, ScorerResult>,
  weights?: Record<string, number>
): number {
  const entries = Object.entries(scores);
  if (entries.length === 0) return 0;
  const totalWeight = entries.reduce((sum, [name]) => sum + (weights?.[name] ?? 1), 0);
  return (
    entries.reduce((sum, [name, result]) => sum + result.score * (weights?.[name] ?? 1), 0) /
    totalWeight
  );
}
