import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useE2eState, createDefaultTestFile } from "../hooks/useE2eState";
import type { TestManagerState } from "@ai-builder/schemas";

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

// ─── createDefaultTestFile ────────────────────────────────────────────────────

describe("createDefaultTestFile", () => {
  it("returns a file with .spec.ts filename", () => {
    const file = createDefaultTestFile();
    expect(file.filename).toMatch(/\.spec\.ts$/);
  });

  it("returns a file with an id starting with e2e_", () => {
    const file = createDefaultTestFile();
    expect(file.id).toMatch(/^e2e_/);
  });

  it("returns a file with empty testCases", () => {
    const file = createDefaultTestFile();
    expect(file.testCases).toEqual([]);
  });

  it("returns a file with a default baseUrl", () => {
    const file = createDefaultTestFile();
    expect(file.baseUrl).toBeTruthy();
  });

  it("generates unique ids on each call", () => {
    const a = createDefaultTestFile();
    const b = createDefaultTestFile();
    expect(a.id).not.toBe(b.id);
  });
});

// ─── initial state ────────────────────────────────────────────────────────────

describe("useE2eState — initial state", () => {
  it("starts with one file", () => {
    const { result } = renderHook(() => useE2eState());
    expect(result.current.managerState.files).toHaveLength(1);
  });

  it("activeFileId matches the first file id", () => {
    const { result } = renderHook(() => useE2eState());
    const { managerState } = result.current;
    expect(managerState.activeFileId).toBe(managerState.files[0]?.id);
  });

  it("activeFile matches the file identified by activeFileId", () => {
    const { result } = renderHook(() => useE2eState());
    const { managerState, activeFile } = result.current;
    expect(activeFile.id).toBe(managerState.activeFileId);
  });

  it("starts with canUndo=false and canRedo=false", () => {
    const { result } = renderHook(() => useE2eState());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});

// ─── setManagerState ──────────────────────────────────────────────────────────

describe("setManagerState", () => {
  it("accepts a new state object", () => {
    const { result } = renderHook(() => useE2eState());
    const newFile = createDefaultTestFile();
    const newState: TestManagerState = { files: [newFile], activeFileId: newFile.id };

    act(() => {
      result.current.setManagerState(newState);
    });

    expect(result.current.managerState.files).toHaveLength(1);
    expect(result.current.managerState.activeFileId).toBe(newFile.id);
  });

  it("accepts an updater function", () => {
    const { result } = renderHook(() => useE2eState());
    const extraFile = createDefaultTestFile();

    act(() => {
      result.current.setManagerState((prev) => ({
        ...prev,
        files: [...prev.files, extraFile],
      }));
    });

    expect(result.current.managerState.files).toHaveLength(2);
  });

  it("enables canUndo after a state change", () => {
    const { result } = renderHook(() => useE2eState());
    const newFile = createDefaultTestFile();

    act(() => {
      result.current.setManagerState({ files: [newFile], activeFileId: newFile.id });
    });

    expect(result.current.canUndo).toBe(true);
  });

  it("clears redo stack after a new state change", () => {
    const { result } = renderHook(() => useE2eState());
    const fileA = createDefaultTestFile();
    const fileB = createDefaultTestFile();

    act(() => {
      result.current.setManagerState({ files: [fileA], activeFileId: fileA.id });
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.setManagerState({ files: [fileB], activeFileId: fileB.id });
    });
    expect(result.current.canRedo).toBe(false);
  });
});

// ─── setActiveFile ────────────────────────────────────────────────────────────

describe("setActiveFile", () => {
  it("updates the active file filename", () => {
    const { result } = renderHook(() => useE2eState());
    act(() => {
      result.current.setActiveFile((prev) => ({ ...prev, filename: "custom.spec.ts" }));
    });
    expect(result.current.activeFile.filename).toBe("custom.spec.ts");
  });

  it("does not change other files in the list", () => {
    const { result } = renderHook(() => useE2eState());
    const extraFile = createDefaultTestFile();

    act(() => {
      result.current.setManagerState((prev) => ({
        files: [...prev.files, extraFile],
        activeFileId: prev.files[0]?.id ?? "",
      }));
    });

    act(() => {
      result.current.setActiveFile((prev) => ({ ...prev, filename: "changed.spec.ts" }));
    });

    const nonActive = result.current.managerState.files.find((f) => f.id === extraFile.id);
    expect(nonActive?.filename).toBe(extraFile.filename);
  });
});

// ─── undo / redo ─────────────────────────────────────────────────────────────

describe("undo", () => {
  it("reverts the last state change", () => {
    const { result } = renderHook(() => useE2eState());
    const originalId = result.current.managerState.activeFileId;
    const newFile = createDefaultTestFile();

    act(() => {
      result.current.setManagerState({ files: [newFile], activeFileId: newFile.id });
    });
    act(() => {
      result.current.undo();
    });

    expect(result.current.managerState.activeFileId).toBe(originalId);
  });

  it("is a no-op when there is nothing to undo", () => {
    const { result } = renderHook(() => useE2eState());
    const before = result.current.managerState.activeFileId;

    act(() => {
      result.current.undo();
    });

    expect(result.current.managerState.activeFileId).toBe(before);
  });

  it("enables canRedo after undo", () => {
    const { result } = renderHook(() => useE2eState());
    const newFile = createDefaultTestFile();

    act(() => {
      result.current.setManagerState({ files: [newFile], activeFileId: newFile.id });
    });
    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);
  });

  it("disables canUndo when back at initial state", () => {
    const { result } = renderHook(() => useE2eState());
    const newFile = createDefaultTestFile();

    act(() => {
      result.current.setManagerState({ files: [newFile], activeFileId: newFile.id });
    });
    act(() => {
      result.current.undo();
    });

    expect(result.current.canUndo).toBe(false);
  });
});

describe("redo", () => {
  it("re-applies an undone state change", () => {
    const { result } = renderHook(() => useE2eState());
    const newFile = createDefaultTestFile();

    act(() => {
      result.current.setManagerState({ files: [newFile], activeFileId: newFile.id });
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });

    expect(result.current.managerState.activeFileId).toBe(newFile.id);
  });

  it("is a no-op when there is nothing to redo", () => {
    const { result } = renderHook(() => useE2eState());
    const before = result.current.managerState.activeFileId;

    act(() => {
      result.current.redo();
    });

    expect(result.current.managerState.activeFileId).toBe(before);
  });

  it("disables canRedo after redo is consumed", () => {
    const { result } = renderHook(() => useE2eState());
    const newFile = createDefaultTestFile();

    act(() => {
      result.current.setManagerState({ files: [newFile], activeFileId: newFile.id });
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });

    expect(result.current.canRedo).toBe(false);
  });

  it("supports multiple undo/redo steps", () => {
    const { result } = renderHook(() => useE2eState());
    const fileA = createDefaultTestFile();
    const fileB = createDefaultTestFile();

    act(() => {
      result.current.setManagerState({ files: [fileA], activeFileId: fileA.id });
    });
    act(() => {
      result.current.setManagerState({ files: [fileB], activeFileId: fileB.id });
    });

    act(() => {
      result.current.undo();
    });
    expect(result.current.managerState.activeFileId).toBe(fileA.id);

    act(() => {
      result.current.undo();
    });
    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.redo();
    });
    expect(result.current.managerState.activeFileId).toBe(fileA.id);
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe("reset", () => {
  it("replaces current state with a fresh default state", () => {
    const { result } = renderHook(() => useE2eState());
    const newFile = createDefaultTestFile();

    act(() => {
      result.current.setManagerState({ files: [newFile], activeFileId: newFile.id });
    });
    act(() => {
      result.current.reset();
    });

    // After reset the state is fresh (default file, not newFile)
    expect(result.current.managerState.activeFileId).not.toBe(newFile.id);
    expect(result.current.managerState.files).toHaveLength(1);
  });

  it("allows undo back to pre-reset state", () => {
    const { result } = renderHook(() => useE2eState());
    const newFile = createDefaultTestFile();
    act(() => {
      result.current.setManagerState({ files: [newFile], activeFileId: newFile.id });
    });
    act(() => {
      result.current.reset();
    });
    act(() => {
      result.current.undo();
    });

    expect(result.current.managerState.activeFileId).toBe(newFile.id);
  });
});

// ─── localStorage persistence ─────────────────────────────────────────────────

describe("localStorage persistence", () => {
  it("persists state to localStorage after a change", () => {
    const { result } = renderHook(() => useE2eState());
    const newFile = createDefaultTestFile();

    act(() => {
      result.current.setManagerState({ files: [newFile], activeFileId: newFile.id });
    });

    const stored = localStorageMock.getItem("ai-builder:e2e-manager");
    expect(stored).toBeTruthy();
    if (!stored) throw new Error("stored is unexpectedly null");
    const parsed = JSON.parse(stored) as { activeFileId: string };
    expect(parsed.activeFileId).toBe(newFile.id);
  });

  it("loads persisted state on mount", () => {
    const savedFile = createDefaultTestFile();
    const savedState: TestManagerState = { files: [savedFile], activeFileId: savedFile.id };
    localStorageMock.setItem("ai-builder:e2e-manager", JSON.stringify(savedState));

    const { result } = renderHook(() => useE2eState());
    expect(result.current.managerState.activeFileId).toBe(savedFile.id);
  });

  it("falls back to default state when localStorage is corrupt", () => {
    localStorageMock.setItem("ai-builder:e2e-manager", "not valid json{{{");
    const { result } = renderHook(() => useE2eState());
    expect(result.current.managerState.files).toHaveLength(1);
  });

  it("falls back to default state when stored data fails schema validation", () => {
    localStorageMock.setItem(
      "ai-builder:e2e-manager",
      JSON.stringify({ files: [], activeFileId: "" }) // files must be min(1)
    );
    const { result } = renderHook(() => useE2eState());
    expect(result.current.managerState.files).toHaveLength(1);
  });
});
