import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import type { OpenApiSpec } from "@ai-builder/schemas";

const STORAGE_KEY = "api-builder-spec";
const MAX_HISTORY = 50;

export function makeEmptySpec(): OpenApiSpec {
  return {
    id: "api_" + nanoid(6),
    title: "My API",
    version: "1.0.0",
    baseUrl: null,
    securityScheme: null,
    description: null,
    tagDefinitions: null,
    endpoints: [],
    schemas: [],
  };
}

function loadPersistedSpec(): OpenApiSpec {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OpenApiSpec;
  } catch {
    // ignore parse errors
  }
  return makeEmptySpec();
}

function persistSpec(spec: OpenApiSpec): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(spec));
  } catch {
    // ignore quota errors
  }
}

export interface ApiStateReturn {
  spec: OpenApiSpec;
  setSpec: (updater: OpenApiSpec | ((prev: OpenApiSpec) => OpenApiSpec)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetSpec: () => void;
}

export function useApiState(): ApiStateReturn {
  const [present, setPresent] = useState<OpenApiSpec>(loadPersistedSpec);
  const [past, setPast] = useState<OpenApiSpec[]>([]);
  const [future, setFuture] = useState<OpenApiSpec[]>([]);

  const setSpec = useCallback((updater: OpenApiSpec | ((prev: OpenApiSpec) => OpenApiSpec)) => {
    setPresent((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setPast((p) => [...p.slice(-MAX_HISTORY + 1), prev]);
      setFuture([]);
      persistSpec(next);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p.at(-1);
      if (previous === undefined) return p;
      setPresent((current) => {
        setFuture((f) => [current, ...f]);
        persistSpec(previous);
        return previous;
      });
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f.at(0);
      if (next === undefined) return f;
      setPresent((current) => {
        setPast((p) => [...p, current]);
        persistSpec(next);
        return next;
      });
      return f.slice(1);
    });
  }, []);

  const resetSpec = useCallback(() => {
    const fresh = makeEmptySpec();
    setPast([]);
    setFuture([]);
    persistSpec(fresh);
    setPresent(fresh);
  }, []);

  return {
    spec: present,
    setSpec,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    resetSpec,
  };
}
