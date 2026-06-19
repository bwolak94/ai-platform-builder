import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { GeneralChatProvider, useGeneralChatContext } from "../GeneralChatContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return <GeneralChatProvider>{children}</GeneralChatProvider>;
}

describe("GeneralChatContext", () => {
  it("provides an empty artifacts array initially", () => {
    const { result } = renderHook(() => useGeneralChatContext(), { wrapper });
    expect(result.current.artifacts).toHaveLength(0);
  });

  it("addArtifact prepends an artifact with id and createdAt", () => {
    const { result } = renderHook(() => useGeneralChatContext(), { wrapper });
    act(() => {
      result.current.addArtifact({ type: "code", title: "Test", content: "hello" });
    });
    expect(result.current.artifacts).toHaveLength(1);
    expect(result.current.artifacts[0]?.type).toBe("code");
    expect(result.current.artifacts[0]?.title).toBe("Test");
    expect(result.current.artifacts[0]?.content).toBe("hello");
    expect(result.current.artifacts[0]?.id).toBeDefined();
    expect(typeof result.current.artifacts[0]?.createdAt).toBe("number");
  });

  it("addArtifact prepends — newest first", () => {
    const { result } = renderHook(() => useGeneralChatContext(), { wrapper });
    act(() => {
      result.current.addArtifact({ type: "text", title: "First", content: "a" });
    });
    act(() => {
      result.current.addArtifact({ type: "data", title: "Second", content: "b" });
    });
    expect(result.current.artifacts[0]?.title).toBe("Second");
    expect(result.current.artifacts[1]?.title).toBe("First");
  });

  it("each artifact gets a unique id", () => {
    const { result } = renderHook(() => useGeneralChatContext(), { wrapper });
    act(() => {
      result.current.addArtifact({ type: "code", title: "A", content: "1" });
      result.current.addArtifact({ type: "code", title: "B", content: "2" });
    });
    const ids = result.current.artifacts.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("clearArtifacts resets to empty array", () => {
    const { result } = renderHook(() => useGeneralChatContext(), { wrapper });
    act(() => {
      result.current.addArtifact({ type: "diff", title: "Diff", content: "..." });
    });
    expect(result.current.artifacts).toHaveLength(1);
    act(() => {
      result.current.clearArtifacts();
    });
    expect(result.current.artifacts).toHaveLength(0);
  });

  it("throws when used outside provider", () => {
    expect(() => {
      renderHook(() => useGeneralChatContext());
    }).toThrow("useGeneralChatContext must be used inside GeneralChatProvider");
  });

  it("stores optional language field", () => {
    const { result } = renderHook(() => useGeneralChatContext(), { wrapper });
    act(() => {
      result.current.addArtifact({
        type: "code",
        title: "Snippet",
        content: "const x = 1",
        language: "typescript",
      });
    });
    expect(result.current.artifacts[0]?.language).toBe("typescript");
  });
});
