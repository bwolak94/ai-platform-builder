import { useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import { StoryManagerStateSchema } from "@ai-builder/schemas";
import type { StoryFile, StoryManagerState } from "@ai-builder/schemas";

const STORAGE_KEY = "ai-builder:story-manager";
const MAX_HISTORY = 20;

interface StoryHistory {
  past: StoryManagerState[];
  present: StoryManagerState;
  future: StoryManagerState[];
}

export function createDefaultStoryFile(): StoryFile {
  return {
    id: "story_" + nanoid(6),
    componentName: "Button",
    componentPath: "src/components/Button.tsx",
    title: "Components/Button",
    layout: "centered",
    defaultArgs: { label: "Click me" },
    argTypes: null,
    variants: [
      {
        id: "var_" + nanoid(6),
        name: "Default",
        args: { label: "Click me" },
        viewport: null,
        docs: null,
        parameters: null,
      },
    ],
    tags: null,
    decorators: null,
  };
}

function createDefaultManagerState(): StoryManagerState {
  const file = createDefaultStoryFile();
  return { files: [file], activeFileId: file.id };
}

function loadInitialHistory(): StoryHistory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = StoryManagerStateSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        return { past: [], present: parsed.data, future: [] };
      }
    }
  } catch {
    // localStorage unavailable or corrupt JSON
  }
  return { past: [], present: createDefaultManagerState(), future: [] };
}

export function useStoryState() {
  const [history, setHistory] = useState<StoryHistory>(loadInitialHistory);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.present));
    } catch {
      /* ignore */
    }
  }, [history.present]);

  const setManagerState = useCallback(
    (updater: StoryManagerState | ((prev: StoryManagerState) => StoryManagerState)) => {
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

  /** Update only the currently active StoryFile, leaving other files untouched. */
  const setActiveFile = useCallback(
    (updater: StoryFile | ((prev: StoryFile) => StoryFile)) => {
      setManagerState((state) => {
        const next =
          typeof updater === "function"
            ? updater(
                // files always has at least one entry (schema enforces min(1))
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                state.files.find((f) => f.id === state.activeFileId) ?? state.files[0]!
              )
            : updater;
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
    createDefaultStoryFile();

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

export type StoryStateReturn = ReturnType<typeof useStoryState>;
