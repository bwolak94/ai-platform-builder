import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBuilderAgent } from "./useBuilderAgent";

describe("useBuilderAgent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the correct initial state", () => {
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));
    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe("");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.activeToolCall).toBeNull();
  });

  it("updates input via setInput", () => {
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));
    act(() => {
      result.current.setInput("Hello agent");
    });
    expect(result.current.input).toBe("Hello agent");
  });

  it("does not submit when input is empty", () => {
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));
    act(() => {
      result.current.handleSubmit();
    });
    expect(result.current.messages).toHaveLength(0);
  });

  it("appends user message and sets loading on submit", () => {
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));

    // setInput and handleSubmit must be separate act() calls so the state
    // update from setInput is committed before handleSubmit reads it.
    act(() => {
      result.current.setInput("Create a login form");
    });
    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({
      role: "user",
      content: "Create a login form",
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.input).toBe("");
  });

  it("appends assistant stub response after delay", () => {
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));

    act(() => {
      result.current.setInput("Create a login form");
    });
    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]?.role).toBe("assistant");
    expect(result.current.isLoading).toBe(false);
  });

  it("does not submit while already loading", () => {
    const { result } = renderHook(() => useBuilderAgent({ mode: "form" }));

    act(() => {
      result.current.setInput("First message");
    });
    act(() => {
      result.current.handleSubmit();
    });
    act(() => {
      result.current.setInput("Second message");
    });
    act(() => {
      result.current.handleSubmit();
    });

    // Only the first message should be added
    expect(result.current.messages).toHaveLength(1);
  });

  it("accepts an onToolCall callback without error", () => {
    const onToolCall = vi.fn().mockResolvedValue(undefined);
    expect(() => renderHook(() => useBuilderAgent({ mode: "layout", onToolCall }))).not.toThrow();
  });
});
