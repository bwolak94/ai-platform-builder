import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import type { EmailTemplate } from "@ai-builder/schemas";

export type ClientMode = "desktop" | "mobile" | "outlook" | "dark";

const STORAGE_KEY = "email-builder-template";
const MAX_HISTORY = 50;

export function makeEmptyTemplate(): EmailTemplate {
  return {
    id: "email_" + nanoid(6),
    subject: "Welcome to our platform",
    previewText: null,
    type: "transactional",
    sections: [],
  };
}

function loadPersistedTemplate(): EmailTemplate {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as EmailTemplate;
  } catch {
    // ignore parse errors
  }
  return makeEmptyTemplate();
}

function persistTemplate(template: EmailTemplate): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(template));
  } catch {
    // ignore quota errors
  }
}

export interface EmailStateReturn {
  template: EmailTemplate;
  setTemplate: (updater: EmailTemplate | ((prev: EmailTemplate) => EmailTemplate)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetTemplate: () => void;
  clientMode: ClientMode;
  setClientMode: (mode: ClientMode) => void;
}

export function useEmailState(): EmailStateReturn {
  const [present, setPresent] = useState<EmailTemplate>(loadPersistedTemplate);
  const [past, setPast] = useState<EmailTemplate[]>([]);
  const [future, setFuture] = useState<EmailTemplate[]>([]);
  const [clientMode, setClientMode] = useState<ClientMode>("desktop");

  const setTemplate = useCallback(
    (updater: EmailTemplate | ((prev: EmailTemplate) => EmailTemplate)) => {
      setPresent((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        setPast((p) => [...p.slice(-MAX_HISTORY + 1), prev]);
        setFuture([]);
        persistTemplate(next);
        return next;
      });
    },
    []
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p.at(-1);
      if (previous === undefined) return p;
      const newPast = p.slice(0, -1);
      setPresent((current) => {
        setFuture((f) => [current, ...f]);
        persistTemplate(previous);
        return previous;
      });
      return newPast;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f.at(0);
      if (next === undefined) return f;
      const newFuture = f.slice(1);
      setPresent((current) => {
        setPast((p) => [...p, current]);
        persistTemplate(next);
        return next;
      });
      return newFuture;
    });
  }, []);

  const resetTemplate = useCallback(() => {
    const fresh = makeEmptyTemplate();
    setPast([]);
    setFuture([]);
    persistTemplate(fresh);
    setPresent(fresh);
  }, []);

  return {
    template: present,
    setTemplate,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    resetTemplate,
    clientMode,
    setClientMode,
  };
}
