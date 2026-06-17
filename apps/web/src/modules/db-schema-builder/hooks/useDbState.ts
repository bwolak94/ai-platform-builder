import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import type { DbSchema } from "@ai-builder/schemas";

const STORAGE_KEY = "db-builder-schema";
const MAX_HISTORY = 50;

export function makeEmptyDbSchema(): DbSchema {
  return {
    id: "db_" + nanoid(6),
    name: "my_database",
    dialect: "postgresql",
    tables: [],
    relations: null,
  };
}

function loadFromStorage(): DbSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeEmptyDbSchema();
    return JSON.parse(raw) as DbSchema;
  } catch {
    return makeEmptyDbSchema();
  }
}

function persist(schema: DbSchema): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
}

export function useDbState() {
  const [past, setPast] = useState<DbSchema[]>([]);
  const [present, setPresent] = useState<DbSchema>(loadFromStorage);
  const [future, setFuture] = useState<DbSchema[]>([]);

  const setSchema = useCallback((updater: DbSchema | ((prev: DbSchema) => DbSchema)) => {
    setPresent((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(next);
      setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), prev]);
      setFuture([]);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const target = p[p.length - 1];
      if (target === undefined) return p;
      const newPast = p.slice(0, -1);
      setPresent((current) => {
        setFuture((f) => [current, ...f]);
        persist(target);
        return target;
      });
      return newPast;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const target = f[0];
      if (target === undefined) return f;
      const newFuture = f.slice(1);
      setPresent((current) => {
        setPast((p) => [...p, current]);
        persist(target);
        return target;
      });
      return newFuture;
    });
  }, []);

  const resetSchema = useCallback(() => {
    const empty = makeEmptyDbSchema();
    persist(empty);
    setPast([]);
    setFuture([]);
    setPresent(empty);
  }, []);

  return {
    schema: present,
    setSchema,
    undo,
    redo,
    resetSchema,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
