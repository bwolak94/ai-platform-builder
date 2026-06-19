import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AgentActionsProvider } from "../AgentActionsProvider";
import { useAgentActions, useRegisterAgentActions } from "../AgentActionsContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return <AgentActionsProvider>{children}</AgentActionsProvider>;
}

describe("AgentActionsContext", () => {
  it("useAgentActions returns noop actions before registration", () => {
    const { result } = renderHook(() => useAgentActions(), { wrapper });
    // Should not throw — noop functions
    expect(() => {
      result.current.setInput("test");
    }).not.toThrow();
    expect(() => {
      result.current.sendMessage("test");
    }).not.toThrow();
  });

  it("useRegisterAgentActions registers setInput and sendMessage", () => {
    const setInput = vi.fn();
    const sendMessage = vi.fn();

    const { result } = renderHook(
      () => {
        useRegisterAgentActions({ setInput, sendMessage });
        return useAgentActions();
      },
      { wrapper }
    );

    act(() => {
      result.current.setInput("hello");
    });
    expect(setInput).toHaveBeenCalledWith("hello");

    act(() => {
      result.current.sendMessage("world");
    });
    expect(sendMessage).toHaveBeenCalledWith("world");
  });

  it("updates to the registered handler are reflected without re-renders", () => {
    let counter = 0;
    const firstSendMessage = vi.fn(() => {
      counter = 1;
    });
    const secondSendMessage = vi.fn(() => {
      counter = 2;
    });

    let currentSend = firstSendMessage;

    const { result, rerender } = renderHook(
      () => {
        useRegisterAgentActions({ setInput: vi.fn(), sendMessage: currentSend });
        return useAgentActions();
      },
      { wrapper }
    );

    act(() => {
      result.current.sendMessage("msg");
    });
    expect(counter).toBe(1);

    currentSend = secondSendMessage;
    rerender();

    act(() => {
      result.current.sendMessage("msg2");
    });
    expect(counter).toBe(2);
  });

  it("multiple calls to useRegisterAgentActions uses the last registered handler", () => {
    const firstSend = vi.fn();
    const secondSend = vi.fn();

    // Second registration should win (last writer wins via ref)
    const { result } = renderHook(
      () => {
        useRegisterAgentActions({ setInput: vi.fn(), sendMessage: firstSend });
        useRegisterAgentActions({ setInput: vi.fn(), sendMessage: secondSend });
        return useAgentActions();
      },
      { wrapper }
    );

    act(() => {
      result.current.sendMessage("hello");
    });
    expect(secondSend).toHaveBeenCalled();
  });
});
