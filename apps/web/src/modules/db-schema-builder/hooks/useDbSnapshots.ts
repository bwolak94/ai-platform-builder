import { useState, useCallback } from "react";
import type { DbSchema } from "@ai-builder/schemas";

const STORAGE_KEY = "db-builder-snapshots";

export interface DbSnapshot {
  id: string;
  name: string;
  createdAt: string;
  schema: DbSchema;
}

function loadSnapshots(): DbSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DbSnapshot[];
  } catch {
    return [];
  }
}

function persist(snapshots: DbSnapshot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
}

export function useDbSnapshots(currentSchema: DbSchema) {
  const [snapshots, setSnapshots] = useState<DbSnapshot[]>(loadSnapshots);

  const saveSnapshot = useCallback(
    (name: string) => {
      const snapshot: DbSnapshot = {
        id: "snap_" + String(Date.now()),
        name,
        createdAt: new Date().toISOString(),
        schema: currentSchema,
      };
      setSnapshots((prev) => {
        const next = [snapshot, ...prev];
        persist(next);
        return next;
      });
      return snapshot;
    },
    [currentSchema]
  );

  const deleteSnapshot = useCallback((id: string) => {
    setSnapshots((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { snapshots, saveSnapshot, deleteSnapshot };
}
