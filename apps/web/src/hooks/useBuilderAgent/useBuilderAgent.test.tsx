import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBuilderAgent } from "./useBuilderAgent";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSend = vi.fn();
vi.mock("agents/react", () => ({
  useAgent: () => ({
    send: mockSend,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
}));

const mockSendMessage = vi.fn();
let mockMessages: { id: string; role: string; parts?: unknown[] }[] = [];
let mockStatus: "idle" | "submitted" | "streaming" = "idle";

vi.mock("@cloudflare/ai-chat/react", () => ({
  useAgentChat: ({ onToolCall }: { onToolCall?: unknown }) => ({
    messages: mockMessages,
    sendMessage: mockSendMessage,
    status: mockStatus,
    _onToolCall: onToolCall,
  }),
}));

vi.mock("@/utils", () => ({ AGENT_URL: undefined }));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useBuilderAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages = [];
    mockStatus = "idle";
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

  it("setInput updates the input state", () => {
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));
    act(() => {
      result.current.setInput("Hello agent");
    });
    expect(result.current.input).toBe("Hello agent");
  });

  it("handleSubmit calls sendMessage with input text and clears input", () => {
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));
    act(() => {
      result.current.setInput("Hello agent");
    });
    act(() => {
      result.current.handleSubmit();
    });
    expect(mockSendMessage).toHaveBeenCalledWith({
      role: "user",
      parts: [{ type: "text", text: "Hello agent" }],
    });
    expect(result.current.input).toBe("");
  });

  it("calls preventDefault on the event before sending", () => {
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));
    act(() => {
      result.current.setInput("test");
    });
    const preventDefault = vi.fn();
    const fakeEvent = { preventDefault } as unknown as React.SyntheticEvent;
    act(() => {
      result.current.handleSubmit(fakeEvent);
    });
    expect(preventDefault).toHaveBeenCalled();
  });

  it("passes through isLoading from useAgentChat status", () => {
    mockStatus = "streaming";
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));
    expect(result.current.isLoading).toBe(true);
  });

  it("accepts an onToolCall callback without error", () => {
    const onToolCall = vi.fn().mockResolvedValue(undefined);
    expect(() => renderHook(() => useBuilderAgent({ mode: "layout", onToolCall }))).not.toThrow();
  });
});
