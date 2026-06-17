import { useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import { TranslationStoreSchema } from "@ai-builder/schemas";
import type { TranslationStore } from "@ai-builder/schemas";

const STORAGE_KEY = "ai-builder:i18n-store";
const MAX_HISTORY = 20;

interface I18nHistory {
  past: TranslationStore[];
  present: TranslationStore;
  future: TranslationStore[];
}

function createDefaultStore(): TranslationStore {
  return {
    id: "i18n_" + nanoid(6),
    sourceLanguage: "en",
    activeLanguages: ["en", "pl"],
    keys: [],
  };
}

function loadInitialHistory(): I18nHistory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = TranslationStoreSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        return { past: [], present: parsed.data, future: [] };
      }
    }
  } catch {
    // localStorage unavailable or corrupt JSON
  }
  return { past: [], present: createDefaultStore(), future: [] };
}

export function useI18nState() {
  const [history, setHistory] = useState<I18nHistory>(loadInitialHistory);

  // Persist present state on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.present));
    } catch {
      // Ignore write errors (quota exceeded, private browsing, etc.)
    }
  }, [history.present]);

  const setStore = useCallback(
    (updater: TranslationStore | ((prev: TranslationStore) => TranslationStore)) => {
      setHistory((prev) => {
        const next = typeof updater === "function" ? updater(prev.present) : updater;
        return {
          past: [...prev.past.slice(-(MAX_HISTORY - 1)), prev.present],
          present: next,
          future: [],
        };
      });
    },
    []
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.past.length) return prev;
      const newPresent = prev.past[prev.past.length - 1];
      if (newPresent === undefined) return prev;
      const newPast = prev.past.slice(0, -1);
      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.future.length) return prev;
      const [newPresent, ...newFuture] = prev.future;
      if (newPresent === undefined) return prev;
      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-(MAX_HISTORY - 1)), prev.present],
      present: createDefaultStore(),
      future: [],
    }));
  }, []);

  return {
    store: history.present,
    setStore,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
