import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import type { OpenApiSpec } from "@ai-builder/schemas";

export interface ApiSnapshot {
  id: string;
  name: string;
  spec: OpenApiSpec;
  savedAt: string;
}

const STORAGE_KEY = "api-builder-snapshots";
const MAX_SNAPSHOTS = 5;

function loadSnapshots(): ApiSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ApiSnapshot[];
  } catch {
    // ignore
  }
  return [];
}

function persistSnapshots(snapshots: ApiSnapshot[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  } catch {
    // ignore
  }
}

export interface ApiSnapshotsReturn {
  snapshots: ApiSnapshot[];
  saveSnapshot: (spec: OpenApiSpec, name: string) => void;
  deleteSnapshot: (id: string) => void;
}

export function useApiSnapshots(): ApiSnapshotsReturn {
  const [snapshots, setSnapshots] = useState<ApiSnapshot[]>(loadSnapshots);

  const saveSnapshot = useCallback((spec: OpenApiSpec, name: string) => {
    const snapshot: ApiSnapshot = {
      id: nanoid(6),
      name,
      spec,
      savedAt: new Date().toISOString(),
    };
    setSnapshots((prev) => {
      const next = [snapshot, ...prev].slice(0, MAX_SNAPSHOTS);
      persistSnapshots(next);
      return next;
    });
  }, []);

  const deleteSnapshot = useCallback((id: string) => {
    setSnapshots((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistSnapshots(next);
      return next;
    });
  }, []);

  return { snapshots, saveSnapshot, deleteSnapshot };
}
