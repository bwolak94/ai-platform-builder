import type { BuilderMode } from "@/types";

export interface SnapshotContext {
  formSchema?: string | null;
  layoutTree?: string | null;
  apiSpec?: string | null;
  dbSchema?: string | null;
  emailTemplate?: string | null;
  storyFile?: string | null;
  i18nStore?: string | null;
  testFile?: string | null;
  wordpressState?: string | null;
}

export interface SnapshotEntry {
  id: string;
  name: string;
  createdAt: number;
  context: SnapshotContext;
}

const BASE = "/api/snapshots";

export async function listSnapshots(mode: BuilderMode): Promise<SnapshotEntry[]> {
  const res = await fetch(`${BASE}/${mode}`);
  if (!res.ok) throw new Error(`Failed to list snapshots: ${res.statusText}`);
  return res.json() as Promise<SnapshotEntry[]>;
}

export async function saveSnapshot(
  mode: BuilderMode,
  name: string,
  context: SnapshotContext
): Promise<SnapshotEntry> {
  const res = await fetch(`${BASE}/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, context }),
  });
  if (!res.ok) throw new Error(`Failed to save snapshot: ${res.statusText}`);
  return res.json() as Promise<SnapshotEntry>;
}

export async function deleteSnapshot(mode: BuilderMode, id: string): Promise<void> {
  const res = await fetch(`${BASE}/${mode}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete snapshot: ${res.statusText}`);
}
