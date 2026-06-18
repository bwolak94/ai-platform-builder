import { useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import { TestManagerStateSchema } from "@ai-builder/schemas";
import type { TestFile, TestManagerState } from "@ai-builder/schemas";

const STORAGE_KEY = "ai-builder:e2e-manager";
const MAX_HISTORY = 20;

interface E2eHistory {
  past: TestManagerState[];
  present: TestManagerState;
  future: TestManagerState[];
}

export function createDefaultTestFile(): TestFile {
  return {
    id: "e2e_" + nanoid(6),
    filename: "app.spec.ts",
    baseUrl: "http://localhost:3000",
    description: null,
    testCases: [],
  };
}

function createDefaultManagerState(): TestManagerState {
  const file = createDefaultTestFile();
  return { files: [file], activeFileId: file.id };
}

function loadInitialHistory(): E2eHistory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = TestManagerStateSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        return { past: [], present: parsed.data, future: [] };
      }
    }
  } catch {
    // localStorage unavailable or corrupt JSON
  }
  return { past: [], present: createDefaultManagerState(), future: [] };
}

export function useE2eState() {
  const [history, setHistory] = useState<E2eHistory>(loadInitialHistory);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.present));
    } catch {
      /* ignore */
    }
  }, [history.present]);

  const setManagerState = useCallback(
    (updater: TestManagerState | ((prev: TestManagerState) => TestManagerState)) => {
      setHistory((prev) => {
        const next = typeof updater === "function" ? updater(prev.present) : updater;
        return {
          past: [...prev.past.slice(-(MAX_HISTORY - 1)), prev.present],
          present: next,
          future: [],
        };
      });
    },
    []
  );

  const setActiveFile = useCallback(
    (updater: TestFile | ((prev: TestFile) => TestFile)) => {
      setManagerState((state) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const current = state.files.find((f) => f.id === state.activeFileId) ?? state.files[0]!;
        const next = typeof updater === "function" ? updater(current) : updater;
        return {
          ...state,
          files: state.files.map((f) => (f.id === state.activeFileId ? next : f)),
        };
      });
    },
    [setManagerState]
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.past.length) return prev;
      const newPresent = prev.past[prev.past.length - 1];
      if (newPresent === undefined) return prev;
      return {
        past: prev.past.slice(0, -1),
        present: newPresent,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.future.length) return prev;
      const [newPresent, ...newFuture] = prev.future;
      if (newPresent === undefined) return prev;
      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-(MAX_HISTORY - 1)), prev.present],
      present: createDefaultManagerState(),
      future: [],
    }));
  }, []);

  const managerState = history.present;
  const activeFile =
    managerState.files.find((f) => f.id === managerState.activeFileId) ??
    managerState.files[0] ??
    createDefaultTestFile();

  return {
    managerState,
    setManagerState,
    activeFile,
    setActiveFile,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}

export type E2eStateReturn = ReturnType<typeof useE2eState>;
