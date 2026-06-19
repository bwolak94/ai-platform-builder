import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { SnapshotProvider, useSnapshotContext } from "../SnapshotContext";
import type { SnapshotEntry } from "@/lib/snapshots-api";

// ─── Mock the API module ──────────────────────────────────────────────────────

// Typed with explicit signatures so spread args are type-safe
const mockList = vi.fn<(mode: string) => Promise<SnapshotEntry[]>>();
const mockSave =
  vi.fn<(mode: string, name: string, ctx: Record<string, unknown>) => Promise<SnapshotEntry>>();
const mockDelete = vi.fn<(mode: string, id: string) => Promise<void>>();

vi.mock("@/lib/snapshots-api", () => ({
  listSnapshots: (mode: string) => mockList(mode),
  saveSnapshot: (mode: string, name: string, ctx: Record<string, unknown>) =>
    mockSave(mode, name, ctx),
  deleteSnapshot: (mode: string, id: string) => mockDelete(mode, id),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const entry1: SnapshotEntry = {
  id: "snap_aaa",
  name: "Snapshot A",
  createdAt: 1700000000000,
  context: { formSchema: "FORM: Test | layout:single-column" },
};

const entry2: SnapshotEntry = {
  id: "snap_bbb",
  name: "Snapshot B",
  createdAt: 1700001000000,
  context: {},
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <SnapshotProvider mode="form">{children}</SnapshotProvider>;
}

describe("SnapshotContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([entry1, entry2]);
    mockSave.mockResolvedValue(entry1);
    mockDelete.mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads snapshots on mount", async () => {
    const { result } = renderHook(() => useSnapshotContext(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockList).toHaveBeenCalledWith("form");
    expect(result.current.snapshots).toHaveLength(2);
  });

  it("sets isLoading true while fetching, false after", async () => {
    let resolve!: (v: SnapshotEntry[]) => void;
    mockList.mockReturnValue(
      new Promise<SnapshotEntry[]>((r) => {
        resolve = r;
      })
    );

    const { result } = renderHook(() => useSnapshotContext(), { wrapper });
    expect(result.current.isLoading).toBe(true);

    act(() => {
      resolve([]);
    });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("save calls API and optimistically prepends the entry", async () => {
    const newEntry: SnapshotEntry = {
      id: "snap_new",
      name: "New",
      createdAt: Date.now(),
      context: {},
    };
    mockSave.mockResolvedValue(newEntry);

    const { result } = renderHook(() => useSnapshotContext(), { wrapper });
    await waitFor(() => !result.current.isLoading);

    await act(async () => {
      await result.current.save("New", {});
    });

    expect(mockSave).toHaveBeenCalledWith("form", "New", {});
    expect(result.current.snapshots[0]?.id).toBe("snap_new");
  });

  it("save sets isSaving during API call", async () => {
    let resolve!: (v: SnapshotEntry) => void;
    mockSave.mockReturnValue(
      new Promise<SnapshotEntry>((r) => {
        resolve = r;
      })
    );

    const { result } = renderHook(() => useSnapshotContext(), { wrapper });
    await waitFor(() => !result.current.isLoading);

    let savePromise!: Promise<SnapshotEntry>;
    act(() => {
      savePromise = result.current.save("x", {});
    });
    expect(result.current.isSaving).toBe(true);

    act(() => {
      resolve(entry1);
    });
    await act(async () => {
      await savePromise;
    });
    expect(result.current.isSaving).toBe(false);
  });

  it("remove optimistically removes entry from list", async () => {
    const { result } = renderHook(() => useSnapshotContext(), { wrapper });
    await waitFor(() => {
      expect(result.current.snapshots).toHaveLength(2);
    });

    await act(async () => {
      await result.current.remove("snap_aaa");
    });

    expect(result.current.snapshots.find((s) => s.id === "snap_aaa")).toBeUndefined();
    expect(mockDelete).toHaveBeenCalledWith("form", "snap_aaa");
  });

  it("remove refreshes list when delete API fails", async () => {
    mockDelete.mockRejectedValue(new Error("network error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { result } = renderHook(() => useSnapshotContext(), { wrapper });
    await waitFor(() => {
      expect(result.current.snapshots).toHaveLength(2);
    });

    await act(async () => {
      await result.current.remove("snap_aaa");
    });

    // After error, refresh() is called — mockList should have been called again
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(2);
    });
    consoleSpy.mockRestore();
  });

  it("refresh reloads snapshots from API", async () => {
    const { result } = renderHook(() => useSnapshotContext(), { wrapper });
    await waitFor(() => {
      expect(result.current.snapshots).toHaveLength(2);
    });

    mockList.mockResolvedValue([entry1]);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.snapshots).toHaveLength(1);
  });

  it("throws when used outside SnapshotProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useSnapshotContext())).toThrow(
      "useSnapshotContext must be used inside SnapshotProvider"
    );
    consoleSpy.mockRestore();
  });
});
