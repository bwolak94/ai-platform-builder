import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { BuilderMode } from "@/types";
import { listSnapshots, saveSnapshot, deleteSnapshot } from "@/lib/snapshots-api";
import type { SnapshotEntry, SnapshotContext as SnapshotContextData } from "@/lib/snapshots-api";

export type { SnapshotEntry };

interface SnapshotContextValue {
  snapshots: SnapshotEntry[];
  isLoading: boolean;
  isSaving: boolean;
  save: (name: string, context: SnapshotContextData) => Promise<SnapshotEntry>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const SnapshotContext = createContext<SnapshotContextValue | null>(null);

interface SnapshotProviderProps {
  mode: BuilderMode;
  children: React.ReactNode;
}

export function SnapshotProvider({ mode, children }: SnapshotProviderProps) {
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listSnapshots(mode);
      setSnapshots(data);
    } catch (err) {
      console.error("[SnapshotContext] failed to load snapshots:", err);
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  // Reload when mode changes
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (name: string, context: SnapshotContextData): Promise<SnapshotEntry> => {
      setIsSaving(true);
      try {
        const entry = await saveSnapshot(mode, name, context);
        // Optimistic prepend
        setSnapshots((prev) => [entry, ...prev].slice(0, 20));
        return entry;
      } finally {
        setIsSaving(false);
      }
    },
    [mode]
  );

  const remove = useCallback(
    async (id: string) => {
      // Optimistic remove
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
      try {
        await deleteSnapshot(mode, id);
      } catch (err) {
        // Rollback on failure
        console.error("[SnapshotContext] delete failed, refreshing:", err);
        void refresh();
      }
    },
    [mode, refresh]
  );

  return (
    <SnapshotContext.Provider value={{ snapshots, isLoading, isSaving, save, remove, refresh }}>
      {children}
    </SnapshotContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSnapshotContext(): SnapshotContextValue {
  const ctx = useContext(SnapshotContext);
  if (!ctx) throw new Error("useSnapshotContext must be used inside SnapshotProvider");
  return ctx;
}
