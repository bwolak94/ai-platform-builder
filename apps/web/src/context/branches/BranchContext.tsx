/**
 * BranchContext — Conversation Forking
 *
 * Architecture:
 * - Each branch maps to a distinct Durable Object room: `${mode}-${branchId}`.
 *   The "main" branch uses just `${mode}` to stay backwards-compatible.
 * - Branch metadata (id, label, parentId, createdAt) is persisted to localStorage
 *   so forked conversations survive page reloads. The DO rooms persist independently.
 * - A branch is scoped to a BuilderMode: forking in "form" creates a new form branch.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import type { BuilderMode } from "@/types";

export interface Branch {
  id: string;
  label: string;
  parentId: string | null;
  createdAt: number;
}

type BranchStore = Partial<Record<BuilderMode, Branch[]>>;
type ActiveStore = Partial<Record<BuilderMode, string>>;

const MAIN_ID = "main";
const STORE_KEY = "ai-builder:branches";
const ACTIVE_KEY = "ai-builder:branches:active";

function loadStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const mainBranch: Branch = { id: MAIN_ID, label: "main", parentId: null, createdAt: 0 };

interface BranchContextValue {
  getBranches: (mode: BuilderMode) => Branch[];
  getActiveBranchId: (mode: BuilderMode) => string;
  getAgentRoomName: (mode: BuilderMode) => string;
  fork: (mode: BuilderMode) => void;
  switchBranch: (mode: BuilderMode, id: string) => void;
}

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<BranchStore>(() => loadStore<BranchStore>(STORE_KEY, {}));
  const [active, setActive] = useState<ActiveStore>(() => loadStore<ActiveStore>(ACTIVE_KEY, {}));

  const getBranches = useCallback(
    (mode: BuilderMode): Branch[] => [mainBranch, ...(store[mode] ?? [])],
    [store]
  );

  const getActiveBranchId = useCallback(
    (mode: BuilderMode): string => active[mode] ?? MAIN_ID,
    [active]
  );

  const getAgentRoomName = useCallback(
    (mode: BuilderMode): string => {
      const branchId = active[mode] ?? MAIN_ID;
      return branchId === MAIN_ID ? mode : `${mode}-${branchId}`;
    },
    [active]
  );

  const fork = useCallback(
    (mode: BuilderMode): void => {
      const id = nanoid(6);
      const parentId = active[mode] ?? MAIN_ID;
      const parentLabel =
        parentId === MAIN_ID
          ? "main"
          : (store[mode]?.find((b) => b.id === parentId)?.label ?? "main");
      const newBranch: Branch = {
        id,
        label: `${parentLabel} › branch-${id}`,
        parentId,
        createdAt: Date.now(),
      };

      setStore((prev) => {
        const updated = { ...prev, [mode]: [...(prev[mode] ?? []), newBranch] };
        localStorage.setItem(STORE_KEY, JSON.stringify(updated));
        return updated;
      });

      setActive((prev) => {
        const updated = { ...prev, [mode]: id };
        localStorage.setItem(ACTIVE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    [active, store]
  );

  const switchBranch = useCallback((mode: BuilderMode, id: string): void => {
    setActive((prev) => {
      const updated = { ...prev, [mode]: id };
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo<BranchContextValue>(
    () => ({ getBranches, getActiveBranchId, getAgentRoomName, fork, switchBranch }),
    [getBranches, getActiveBranchId, getAgentRoomName, fork, switchBranch]
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBranch(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch must be used inside BranchProvider");
  return ctx;
}
