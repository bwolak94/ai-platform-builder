import { useMemo } from "react";
import type { ChatMessage } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

// Claude Sonnet 4.6 context window
const MAX_TOKENS = 200_000;
const WARN_THRESHOLD = 0.75;
const CRITICAL_THRESHOLD = 0.9;

// ~4 chars per token is a reliable approximation for Claude English prose
function estimateTokens(messages: ChatMessage[]): number {
  const chars = messages.reduce((sum, m) => sum + m.content.length, 0);
  return Math.ceil(chars / 4);
}

export interface TokenGauge {
  used: number;
  max: number;
  pct: number;
  isWarning: boolean;
  isCritical: boolean;
}

export function useTokenGauge(messages: ChatMessage[]): TokenGauge {
  return useMemo(() => {
    const used = estimateTokens(messages);
    const pct = Math.min(used / MAX_TOKENS, 1);
    return {
      used,
      max: MAX_TOKENS,
      pct,
      isWarning: pct >= WARN_THRESHOLD,
      isCritical: pct >= CRITICAL_THRESHOLD,
    };
  }, [messages]);
}
