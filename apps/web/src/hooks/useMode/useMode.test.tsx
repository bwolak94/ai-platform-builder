import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ModeProvider } from "@/context/mode";
import { useMode } from "./useMode";

function wrapper({ children }: { children: React.ReactNode }) {
  return <ModeProvider>{children}</ModeProvider>;
}

describe("useMode", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when used outside ModeProvider", () => {
    expect(() => renderHook(() => useMode())).toThrow("useMode must be used inside ModeProvider");
  });

  it("returns default mode 'form'", () => {
    const { result } = renderHook(() => useMode(), { wrapper });
    expect(result.current.mode).toBe("form");
  });

  it("updates mode when setMode is called", () => {
    const { result } = renderHook(() => useMode(), { wrapper });
    act(() => {
      result.current.setMode("layout");
    });
    expect(result.current.mode).toBe("layout");
  });

  it("provides setMode function", () => {
    const { result } = renderHook(() => useMode(), { wrapper });
    expect(typeof result.current.setMode).toBe("function");
  });
});
