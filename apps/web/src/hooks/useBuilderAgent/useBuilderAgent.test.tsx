import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBuilderAgent } from "./useBuilderAgent";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSend = vi.fn();
vi.mock("@cloudflare/agents/react", () => ({
  useAgent: () => ({ send: mockSend, _pkurl: "ws://localhost/agents/builder-agent/default" }),
}));

const mockSetInput = vi.fn();
const mockHandleSubmit = vi.fn();
let mockMessages: { id: string; role: string; content: unknown }[] = [];
let mockInput = "";
let mockIsLoading = false;

vi.mock("@cloudflare/agents/ai-react", () => ({
  useAgentChat: ({ onToolCall }: { onToolCall?: unknown }) => ({
    messages: mockMessages,
    input: mockInput,
    setInput: mockSetInput,
    handleSubmit: mockHandleSubmit,
    isLoading: mockIsLoading,
    _onToolCall: onToolCall,
  }),
}));

vi.mock("@/utils", () => ({ AGENT_URL: undefined }));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useBuilderAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages = [];
    mockInput = "";
    mockIsLoading = false;
  });

  it("returns the correct initial state", () => {
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));
    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe("");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.activeToolCall).toBeNull();
  });

  it("sends set_mode to agent on mount", () => {
    renderHook(() => useBuilderAgent({ mode: "form" }));
    expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ type: "set_mode", mode: "form" }));
  });

  it("sends updated mode when mode prop changes", () => {
    let mode = "form" as "form" | "layout";
    const { rerender } = renderHook(() => useBuilderAgent({ mode }));
    mode = "layout";
    rerender();
    expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ type: "set_mode", mode: "layout" }));
  });

  it("delegates setInput to useAgentChat", () => {
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));
    act(() => {
      result.current.setInput("Hello agent");
    });
    expect(mockSetInput).toHaveBeenCalledWith("Hello agent");
  });

  it("calls useAgentChat handleSubmit on submit", () => {
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));
    act(() => {
      result.current.handleSubmit();
    });
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it("calls preventDefault on the event before delegating", () => {
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));
    const preventDefault = vi.fn();
    const fakeEvent = { preventDefault } as unknown as React.SyntheticEvent;
    act(() => {
      result.current.handleSubmit(fakeEvent);
    });
    expect(preventDefault).toHaveBeenCalled();
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it("passes through isLoading from useAgentChat", () => {
    mockIsLoading = true;
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));
    expect(result.current.isLoading).toBe(true);
  });

  it("accepts an onToolCall callback without error", () => {
    const onToolCall = vi.fn().mockResolvedValue(undefined);
    expect(() => renderHook(() => useBuilderAgent({ mode: "layout", onToolCall }))).not.toThrow();
  });
});
