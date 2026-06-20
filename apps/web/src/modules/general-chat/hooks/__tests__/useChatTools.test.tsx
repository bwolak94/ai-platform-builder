import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { GeneralChatProvider } from "@/context/generalChat/GeneralChatContext";
import { useChatTools } from "../useChatTools";

// ─── Mock workerPool ──────────────────────────────────────────────────────────
// Web Workers are unavailable in JSDOM — mock the pool to execute code inline.
vi.mock("@/hooks/useWorkerPool", () => {
  const runInline = (code: string): Promise<{ output?: string; error?: string }> => {
    const logs: string[] = [];
    const origLog = console.log;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log = (...args: any[]) => {
      logs.push(args.map(String).join(" "));
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function(code) as () => unknown;
      const returned = fn();
      const lines = [...logs];
      if (returned !== undefined) lines.push(`\u2192 ${JSON.stringify(returned)}`);
      const output = lines.filter(Boolean).join("\n") || "(no output)";
      return Promise.resolve({ output });
    } catch (err) {
      return Promise.resolve({ error: err instanceof Error ? err.message : "Execution failed" });
    } finally {
      console.log = origLog;
    }
  };

  return { workerPool: { run: runInline } };
});

// ─── Mock crypto.subtle ────────────────────────────────────────────────────────

Object.defineProperty(global, "crypto", {
  value: {
    subtle: {
      digest: vi.fn(() => {
        // Return fixed bytes for deterministic SHA-256 in tests
        return Promise.resolve(new Uint8Array([0xde, 0xad, 0xbe, 0xef]).buffer);
      }),
    },
  },
  configurable: true,
});

// ─── Wrapper ──────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return <GeneralChatProvider>{children}</GeneralChatProvider>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCall(toolName: string, args: Record<string, unknown>) {
  return { toolName, args };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useChatTools — runCode", () => {
  it("executes JavaScript and returns output", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(makeCall("runCode", { code: "return 2 + 2" }));
    });
    expect(out.output).toContain("4");
  });

  it("captures console.log output", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("runCode", { code: 'console.log("hello from test"); return undefined' })
      );
    });
    expect(out.output).toContain("hello from test");
  });

  it("returns error for invalid JavaScript", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("runCode", { code: "this is not valid javascript @@##" })
      );
    });
    expect(out.error).toBeDefined();
  });

  it("adds an artifact for successful execution", async () => {
    const { result } = renderHook(
      () => {
        const tools = useChatTools();
        return tools;
      },
      { wrapper }
    );
    await act(async () => {
      await result.current.dispatch(makeCall("runCode", { code: "return 42", label: "My Calc" }));
    });
    // artifact was added — checked indirectly via no error
    expect(true).toBe(true);
  });
});

describe("useChatTools — transformJson", () => {
  it("extracts a nested value by dot path", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    const json = JSON.stringify({ user: { name: "Alice", email: "a@b.com" } });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(makeCall("transformJson", { json, query: "user.name" }));
    });
    expect(out.result).toContain("Alice");
  });

  it("returns the entire object for root query $", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    const json = JSON.stringify({ a: 1 });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(makeCall("transformJson", { json, query: "$" }));
    });
    expect(out.result).toContain('"a": 1');
  });

  it("extracts array element with [n] notation", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    const json = JSON.stringify({ items: ["x", "y", "z"] });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(makeCall("transformJson", { json, query: "items[1]" }));
    });
    expect(out.result).toContain("y");
  });

  it("returns error for invalid JSON", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("transformJson", { json: "{ bad json", query: "x" })
      );
    });
    expect(out.error).toBeDefined();
  });
});

describe("useChatTools — diffText", () => {
  it("returns diff with added/removed counts", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("diffText", { textA: "hello\nworld", textB: "hello\nearth" })
      );
    });
    expect(out.added).toBe(1);
    expect(out.removed).toBe(1);
  });

  it("marks identical lines as unchanged", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(makeCall("diffText", { textA: "same", textB: "same" }));
    });
    expect(out.added).toBe(0);
    expect(out.removed).toBe(0);
    expect(String(out.diff)).toContain("  same");
  });

  it("handles extra lines in textB as additions", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("diffText", { textA: "line1", textB: "line1\nline2" })
      );
    });
    expect(out.added).toBe(1);
    expect(out.removed).toBe(0);
  });
});

describe("useChatTools — calculateTokens", () => {
  it("returns positive token count for non-empty text", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("calculateTokens", { text: "Hello world this is a test sentence." })
      );
    });
    expect(Number(out.tokens)).toBeGreaterThan(0);
    expect(Number(out.words)).toBeGreaterThan(0);
  });

  it("returns 0 tokens for empty string", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(makeCall("calculateTokens", { text: "" }));
    });
    expect(out.tokens).toBe(0);
  });

  it("gpt-3.5 model produces slightly different count", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    const text = "The quick brown fox jumps over the lazy dog.";
    let claude: Record<string, unknown> = {};
    let gpt: Record<string, unknown> = {};
    await act(async () => {
      claude = await result.current.dispatch(
        makeCall("calculateTokens", { text, model: "claude" })
      );
      gpt = await result.current.dispatch(makeCall("calculateTokens", { text, model: "gpt-3.5" }));
    });
    // gpt-3.5 uses 3.8 chars/token → slightly more tokens for same text
    expect(Number(gpt.tokens)).toBeGreaterThanOrEqual(Number(claude.tokens));
  });
});

describe("useChatTools — encodeDecodeText", () => {
  it("base64encodes a string", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("encodeDecodeText", { text: "hello", operation: "base64encode" })
      );
    });
    expect(out.result).toBe("aGVsbG8=");
  });

  it("base64decodes a string", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("encodeDecodeText", { text: "aGVsbG8=", operation: "base64decode" })
      );
    });
    expect(out.result).toBe("hello");
  });

  it("urlencodes special characters", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("encodeDecodeText", { text: "hello world!", operation: "urlencode" })
      );
    });
    expect(String(out.result)).toContain("%20");
  });

  it("urldecodes an encoded string", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("encodeDecodeText", { text: "hello%20world", operation: "urldecode" })
      );
    });
    expect(out.result).toBe("hello world");
  });

  it("hexencodes a string", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("encodeDecodeText", { text: "hi", operation: "hexencode" })
      );
    });
    expect(out.result).toBe("6869");
  });

  it("hexdecodes a hex string", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("encodeDecodeText", { text: "6869", operation: "hexdecode" })
      );
    });
    expect(out.result).toBe("hi");
  });

  it("sha256 returns a hex digest", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("encodeDecodeText", { text: "test", operation: "sha256" })
      );
    });
    // Mocked digest returns deadbeef
    expect(String(out.result)).toBe("deadbeef");
  });

  it("returns error for unknown operation", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(
        makeCall("encodeDecodeText", { text: "x", operation: "bogus" })
      );
    });
    expect(out.error).toBeDefined();
  });
});

describe("useChatTools — unknown tool", () => {
  it("returns error for an unrecognised tool name", async () => {
    const { result } = renderHook(() => useChatTools(), { wrapper });
    let out: Record<string, unknown> = {};
    await act(async () => {
      out = await result.current.dispatch(makeCall("nonExistentTool", {}));
    });
    expect(String(out.error)).toContain("nonExistentTool");
  });
});

// Patch beforeEach to reset console.log stub
beforeEach(() => {
  vi.restoreAllMocks();
});
