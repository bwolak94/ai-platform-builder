import { createContext, useCallback, useContext, useState } from "react";
import { nanoid } from "nanoid";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArtifactType = "code" | "mermaid" | "diff" | "data" | "text" | "palette" | "table";

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
  createdAt: number;
}

interface GeneralChatContextValue {
  artifacts: Artifact[];
  addArtifact: (artifact: Omit<Artifact, "id" | "createdAt">) => void;
  updateArtifact: (id: string, content: string) => void;
  clearArtifacts: () => void;
  pinnedArtifactIds: Set<string>;
  pinArtifact: (id: string) => void;
  unpinArtifact: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GeneralChatContext = createContext<GeneralChatContextValue | null>(null);

export function GeneralChatProvider({ children }: { children: React.ReactNode }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [pinnedArtifactIds, setPinnedArtifactIds] = useState<Set<string>>(new Set());

  const addArtifact = useCallback((artifact: Omit<Artifact, "id" | "createdAt">) => {
    setArtifacts((prev) => [{ ...artifact, id: nanoid(8), createdAt: Date.now() }, ...prev]);
  }, []);

  const updateArtifact = useCallback((id: string, content: string) => {
    setArtifacts((prev) => prev.map((a) => (a.id === id ? { ...a, content } : a)));
  }, []);

  const clearArtifacts = useCallback(() => {
    setArtifacts([]);
    setPinnedArtifactIds(new Set());
  }, []);

  const pinArtifact = useCallback((id: string) => {
    setPinnedArtifactIds((prev) => new Set([...prev, id]));
  }, []);

  const unpinArtifact = useCallback((id: string) => {
    setPinnedArtifactIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return (
    <GeneralChatContext.Provider
      value={{
        artifacts,
        addArtifact,
        updateArtifact,
        clearArtifacts,
        pinnedArtifactIds,
        pinArtifact,
        unpinArtifact,
      }}
    >
      {children}
    </GeneralChatContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGeneralChatContext(): GeneralChatContextValue {
  const ctx = useContext(GeneralChatContext);
  if (!ctx) throw new Error("useGeneralChatContext must be used inside GeneralChatProvider");
  return ctx;
}
