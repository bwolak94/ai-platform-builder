import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { WordPressBuilderProvider, useWordPressBuilderContext } from "../WordPressBuilderContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return <WordPressBuilderProvider>{children}</WordPressBuilderProvider>;
}

describe("WordPressBuilderContext", () => {
  it("provides initial theme project", () => {
    const { result } = renderHook(() => useWordPressBuilderContext(), { wrapper });
    expect(result.current.project.projectType).toBe("theme");
    expect(result.current.project.name).toBe("My Theme");
    expect(result.current.project.files).toHaveLength(0);
  });

  it("provides null activeFileId initially", () => {
    const { result } = renderHook(() => useWordPressBuilderContext(), { wrapper });
    expect(result.current.activeFileId).toBeNull();
  });

  it("setProject updates project state", () => {
    const { result } = renderHook(() => useWordPressBuilderContext(), { wrapper });
    act(() => {
      result.current.setProject((prev) => ({ ...prev, name: "Updated Theme" }));
    });
    expect(result.current.project.name).toBe("Updated Theme");
  });

  it("setActiveFileId updates activeFileId", () => {
    const { result } = renderHook(() => useWordPressBuilderContext(), { wrapper });
    act(() => {
      result.current.setActiveFileId("wpf_aaaaaa");
    });
    expect(result.current.activeFileId).toBe("wpf_aaaaaa");
  });

  it("can clear activeFileId back to null", () => {
    const { result } = renderHook(() => useWordPressBuilderContext(), { wrapper });
    act(() => {
      result.current.setActiveFileId("wpf_aaaaaa");
    });
    act(() => {
      result.current.setActiveFileId(null);
    });
    expect(result.current.activeFileId).toBeNull();
  });

  it("throws when used outside provider", () => {
    // renderHook without wrapper — context value will be null → should throw
    expect(() => {
      renderHook(() => useWordPressBuilderContext());
    }).toThrow("useWordPressBuilderContext must be used inside WordPressBuilderProvider");
  });
});
