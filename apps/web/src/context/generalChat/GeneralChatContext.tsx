import { createContext, useCallback, useContext, useState } from "react";
import { nanoid } from "nanoid";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArtifactType = "code" | "mermaid" | "diff" | "data" | "text" | "palette";

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
  clearArtifacts: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GeneralChatContext = createContext<GeneralChatContextValue | null>(null);

export function GeneralChatProvider({ children }: { children: React.ReactNode }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  const addArtifact = useCallback((artifact: Omit<Artifact, "id" | "createdAt">) => {
    setArtifacts((prev) => [{ ...artifact, id: nanoid(8), createdAt: Date.now() }, ...prev]);
  }, []);

  const clearArtifacts = useCallback(() => {
    setArtifacts([]);
  }, []);

  return (
    <GeneralChatContext.Provider value={{ artifacts, addArtifact, clearArtifacts }}>
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
