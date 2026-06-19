import { createContext, useContext, useState } from "react";
import { makeEmptyWordPressProject } from "@ai-builder/serializers";
import type { WordPressProject } from "@ai-builder/schemas";

interface WordPressBuilderContextValue {
  project: WordPressProject;
  setProject: React.Dispatch<React.SetStateAction<WordPressProject>>;
  activeFileId: string | null;
  setActiveFileId: React.Dispatch<React.SetStateAction<string | null>>;
}

const WordPressBuilderContext = createContext<WordPressBuilderContextValue | null>(null);

export function WordPressBuilderProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<WordPressProject>(() =>
    makeEmptyWordPressProject("theme")
  );
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  return (
    <WordPressBuilderContext.Provider
      value={{ project, setProject, activeFileId, setActiveFileId }}
    >
      {children}
    </WordPressBuilderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWordPressBuilderContext(): WordPressBuilderContextValue {
  const ctx = useContext(WordPressBuilderContext);
  if (!ctx)
    throw new Error("useWordPressBuilderContext must be used inside WordPressBuilderProvider");
  return ctx;
}
