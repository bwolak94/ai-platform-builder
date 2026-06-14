import { useState } from "react";
import { nanoid } from "nanoid";
import type { TranslationStore } from "@ai-builder/schemas";

function createDefaultStore(): TranslationStore {
  return {
    id: "i18n_" + nanoid(6),
    sourceLanguage: "en",
    activeLanguages: ["en", "pl"],
    keys: [],
  };
}

export function useI18nState() {
  const [store, setStore] = useState<TranslationStore>(createDefaultStore);
  return { store, setStore };
}
