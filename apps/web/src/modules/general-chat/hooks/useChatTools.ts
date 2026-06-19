import { useCallback } from "react";
import { useGeneralChatContext } from "@/context/generalChat/GeneralChatContext";
import type { ToolCall } from "@/hooks/useBuilderAgent/useBuilderAgent.types";

type ToolResult = Record<string, unknown>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Simple line-by-line diff — marks added (+), removed (-), unchanged ( ) lines. */
function lineDiff(a: string, b: string): string {
  const linesA = a.split("\n");
  const linesB = b.split("\n");
  const out: string[] = [];
  const max = Math.max(linesA.length, linesB.length);
  for (let i = 0; i < max; i++) {
    const la = linesA[i];
    const lb = linesB[i];
    if (la === undefined) {
      out.push(`+ ${lb ?? ""}`);
    } else if (lb === undefined) {
      out.push(`- ${la}`);
    } else if (la === lb) {
      out.push(`  ${la}`);
    } else {
      out.push(`- ${la}`);
      out.push(`+ ${lb}`);
    }
  }
  return out.join("\n");
}

/** Dot-notation JSON path accessor — supports simple paths and [n] array indexes. */
function jsonPath(obj: unknown, query: string): unknown {
  if (query === "$" || query === "" || query === ".") return obj;
  const path = query.replace(/^\$\.?/, "");
  const parts: string[] = [];
  // split on . but keep array indexes
  for (const seg of path.split(".")) {
    const idxMatch = /^([^[]*)\[(\d+)\]$/.exec(seg);
    if (idxMatch) {
      if (idxMatch[1]) parts.push(idxMatch[1]);
      parts.push(idxMatch[2] ?? "0");
    } else {
      parts.push(seg);
    }
  }
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    const idx = Number(part);
    if (!isNaN(idx) && Array.isArray(cur)) {
      cur = cur[idx];
    } else if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

/** Token estimate: ~4 chars per token for Claude/GPT English prose. */
function estimateTokens(text: string, model: string): number {
  const charsPerToken = model === "gpt-3.5" ? 3.8 : 4;
  return Math.ceil(text.length / charsPerToken);
}

/** Hex encode — each char as 2-digit hex. */
function hexEncode(text: string): string {
  return Array.from(new TextEncoder().encode(text))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Hex decode — pairs of hex digits to string. */
function hexDecode(hex: string): string {
  const bytes = hex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [];
  return new TextDecoder().decode(new Uint8Array(bytes));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChatTools() {
  const { addArtifact } = useGeneralChatContext();

  const dispatch = useCallback(
    async (call: ToolCall): Promise<ToolResult> => {
      switch (call.toolName) {
        // ── runCode ─────────────────────────────────────────────────────────────
        case "runCode": {
          const { code, label } = call.args as { code: string; label?: string };
          const logs: string[] = [];
          const origLog = console.log;
          try {
            // Capture console.log output — restore in finally to avoid console leak
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.log = (...args: any[]) => {
              logs.push(args.map(String).join(" "));
            };
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            const fn = new Function(code) as () => unknown;
            const returned = fn();

            const output =
              [...logs, returned !== undefined ? `→ ${JSON.stringify(returned)}` : ""]
                .filter(Boolean)
                .join("\n") || "(no output)";

            addArtifact({
              type: "code",
              title: label ?? "Code Output",
              content: output,
              language: "text",
            });
            return { output };
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Execution failed";
            addArtifact({ type: "text", title: "Execution Error", content: msg });
            return { error: msg };
          } finally {
            console.log = origLog;
          }
        }

        // ── transformJson ────────────────────────────────────────────────────────
        case "transformJson": {
          const { json, query, label } = call.args as {
            json: string;
            query: string;
            label?: string;
          };
          try {
            const parsed: unknown = JSON.parse(json);
            const result = jsonPath(parsed, query);
            const formatted = JSON.stringify(result, null, 2);
            addArtifact({
              type: "data",
              title: label ?? `JSON: ${query}`,
              content: formatted,
              language: "json",
            });
            return { result: formatted };
          } catch (err) {
            return { error: err instanceof Error ? err.message : "JSON parse failed" };
          }
        }

        // ── diffText ─────────────────────────────────────────────────────────────
        case "diffText": {
          const { textA, textB, title } = call.args as {
            textA: string;
            textB: string;
            title?: string;
          };
          const diff = lineDiff(textA, textB);
          const added = diff.split("\n").filter((l) => l.startsWith("+ ")).length;
          const removed = diff.split("\n").filter((l) => l.startsWith("- ")).length;
          addArtifact({
            type: "diff",
            title: title ?? "Text Diff",
            content: diff,
          });
          return { diff, added, removed };
        }

        // ── calculateTokens ──────────────────────────────────────────────────────
        case "calculateTokens": {
          const { text, model = "claude" } = call.args as { text: string; model?: string };
          const tokens = estimateTokens(text, model);
          const chars = text.length;
          const words = text.split(/\s+/).filter(Boolean).length;
          const result = `~${String(tokens)} tokens  |  ${String(words)} words  |  ${String(chars)} chars`;
          addArtifact({ type: "text", title: `Token Count (${model})`, content: result });
          return { tokens, words, chars, model };
        }

        // ── encodeDecodeText ─────────────────────────────────────────────────────
        case "encodeDecodeText": {
          const { text, operation } = call.args as {
            text: string;
            operation: string;
          };
          let result = "";
          let err: string | undefined;
          try {
            switch (operation) {
              case "base64encode": {
                const encBytes = new TextEncoder().encode(text);
                const binStr = Array.from(encBytes, (b) => String.fromCharCode(b)).join("");
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                result = btoa(binStr);
                break;
              }
              case "base64decode": {
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                const binStr = atob(text);
                const decBytes = new Uint8Array(Array.from(binStr, (c) => c.charCodeAt(0)));
                result = new TextDecoder().decode(decBytes);
                break;
              }
              case "urlencode":
                result = encodeURIComponent(text);
                break;
              case "urldecode":
                result = decodeURIComponent(text);
                break;
              case "hexencode":
                result = hexEncode(text);
                break;
              case "hexdecode":
                result = hexDecode(text);
                break;
              case "sha256": {
                const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
                result = Array.from(new Uint8Array(buf))
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("");
                break;
              }
              default:
                err = `Unknown operation: ${operation}`;
            }
          } catch (e) {
            err = e instanceof Error ? e.message : "Operation failed";
          }
          if (err) return { error: err };
          addArtifact({
            type: "code",
            title: operation,
            content: result,
            language: "text",
          });
          return { result, operation };
        }

        default:
          return { error: `Unknown chat tool: ${call.toolName}` };
      }
    },
    [addArtifact]
  );

  return { dispatch };
}
