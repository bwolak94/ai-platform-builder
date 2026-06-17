import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useApiState, makeEmptySpec } from "../hooks/useApiState";
import type { OpenApiSpec } from "@ai-builder/schemas";

// ─── localStorage stub ────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      store = Object.fromEntries(Object.entries(store).filter(([k]) => k !== key));
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeSpec(title: string): OpenApiSpec {
  return { ...makeEmptySpec(), title };
}

// ─── Initial state ────────────────────────────────────────────────────────────

describe("initial state", () => {
  it("starts with an empty spec when localStorage is empty", () => {
    const { result } = renderHook(() => useApiState());
    expect(result.current.spec.title).toBe("My API");
    expect(result.current.spec.endpoints).toHaveLength(0);
    expect(result.current.spec.schemas).toHaveLength(0);
  });

  it("starts with canUndo=false and canRedo=false", () => {
    const { result } = renderHook(() => useApiState());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});

// ─── setSpec ─────────────────────────────────────────────────────────────────

describe("setSpec", () => {
  it("updates the spec with an object", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec(makeSpec("Product API"));
    });
    expect(result.current.spec.title).toBe("Product API");
  });

  it("updates the spec with an updater function", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec((prev) => ({ ...prev, title: "Updated" }));
    });
    expect(result.current.spec.title).toBe("Updated");
  });

  it("enables undo after a change", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec(makeSpec("v2"));
    });
    expect(result.current.canUndo).toBe(true);
  });

  it("clears redo history when a new change is made", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec(makeSpec("v2"));
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
    act(() => {
      result.current.setSpec(makeSpec("v3"));
    });
    expect(result.current.canRedo).toBe(false);
  });

  it("persists to localStorage on every change", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec(makeSpec("Persisted API"));
    });
    const stored = JSON.parse(localStorageMock.getItem("api-builder-spec") ?? "{}") as OpenApiSpec;
    expect(stored.title).toBe("Persisted API");
  });
});

// ─── undo ─────────────────────────────────────────────────────────────────────

describe("undo", () => {
  it("reverts to the previous state", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec(makeSpec("v2"));
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.spec.title).toBe("My API");
  });

  it("is a no-op when there is nothing to undo", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.undo();
    });
    expect(result.current.spec.title).toBe("My API");
  });

  it("enables redo after undoing", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec(makeSpec("v2"));
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
  });

  it("can undo multiple steps", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec(makeSpec("v2"));
    });
    act(() => {
      result.current.setSpec(makeSpec("v3"));
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.spec.title).toBe("v2");
    act(() => {
      result.current.undo();
    });
    expect(result.current.spec.title).toBe("My API");
  });
});

// ─── redo ─────────────────────────────────────────────────────────────────────

describe("redo", () => {
  it("re-applies an undone change", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec(makeSpec("v2"));
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });
    expect(result.current.spec.title).toBe("v2");
  });

  it("is a no-op when there is nothing to redo", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec(makeSpec("v2"));
    });
    act(() => {
      result.current.redo();
    });
    expect(result.current.spec.title).toBe("v2");
  });

  it("disables canRedo after redoing the last future state", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec(makeSpec("v2"));
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });
    expect(result.current.canRedo).toBe(false);
  });
});

// ─── resetSpec ────────────────────────────────────────────────────────────────

describe("resetSpec", () => {
  it("resets to an empty spec", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec(makeSpec("v2"));
    });
    act(() => {
      result.current.resetSpec();
    });
    expect(result.current.spec.title).toBe("My API");
    expect(result.current.spec.endpoints).toHaveLength(0);
  });

  it("clears undo and redo history", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec(makeSpec("v2"));
    });
    act(() => {
      result.current.resetSpec();
    });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("persists the reset spec to localStorage", () => {
    const { result } = renderHook(() => useApiState());
    act(() => {
      result.current.setSpec(makeSpec("v2"));
    });
    act(() => {
      result.current.resetSpec();
    });
    const stored = JSON.parse(localStorageMock.getItem("api-builder-spec") ?? "{}") as OpenApiSpec;
    expect(stored.title).toBe("My API");
  });
});

// ─── localStorage persistence ─────────────────────────────────────────────────

describe("localStorage persistence", () => {
  it("loads a previously saved spec on mount", () => {
    const saved: OpenApiSpec = { ...makeEmptySpec(), title: "Saved API" };
    localStorageMock.setItem("api-builder-spec", JSON.stringify(saved));
    const { result } = renderHook(() => useApiState());
    expect(result.current.spec.title).toBe("Saved API");
  });

  it("falls back to empty spec when localStorage contains invalid JSON", () => {
    localStorageMock.setItem("api-builder-spec", "{bad json");
    const { result } = renderHook(() => useApiState());
    expect(result.current.spec.title).toBe("My API");
  });
});
