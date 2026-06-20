import { useCallback, useEffect, useState } from "react";
import type { ChatMessage } from "@/hooks/useBuilderAgent/useBuilderAgent.types";
import type { BuilderMode } from "@/types";

export interface PinnedMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  pinnedAt: number;
  mode: BuilderMode;
}

const STORAGE_KEY = "ai-builder:pinned-messages";

function loadPins(): PinnedMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PinnedMessage[]) : [];
  } catch {
    return [];
  }
}

function savePins(pins: PinnedMessage[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
}

export interface UsePinnedMessagesReturn {
  modePins: PinnedMessage[];
  isPinned: (id: string) => boolean;
  pin: (msg: ChatMessage) => void;
  unpin: (id: string) => void;
}

export function usePinnedMessages(mode: BuilderMode): UsePinnedMessagesReturn {
  const [pins, setPins] = useState<PinnedMessage[]>(loadPins);

  useEffect(() => {
    savePins(pins);
  }, [pins]);

  const pin = useCallback(
    (msg: ChatMessage) => {
      setPins((prev) => {
        if (prev.some((p) => p.id === msg.id)) return prev;
        const entry: PinnedMessage = {
          id: msg.id,
          content: msg.content,
          role: msg.role as "user" | "assistant",
          pinnedAt: Date.now(),
          mode,
        };
        return [...prev, entry];
      });
    },
    [mode]
  );

  const unpin = useCallback((id: string) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const isPinned = useCallback((id: string) => pins.some((p) => p.id === id), [pins]);

  const modePins = pins.filter((p) => p.mode === mode);

  return { modePins, isPinned, pin, unpin };
}
