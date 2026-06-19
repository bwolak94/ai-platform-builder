import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { listSnapshots, saveSnapshot, deleteSnapshot } from "../snapshots-api";
import type { SnapshotEntry } from "../snapshots-api";

const mockEntry: SnapshotEntry = {
  id: "snap_abc12345",
  name: "My Snapshot",
  createdAt: 1700000000000,
  context: { formSchema: "FORM: Test | layout:single-column" },
};

function mockFetch(data: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(data),
  });
}

describe("listSnapshots", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch([mockEntry]));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls GET /api/snapshots/:mode", async () => {
    await listSnapshots("form");
    expect(fetch).toHaveBeenCalledWith("/api/snapshots/form");
  });

  it("returns the parsed JSON array", async () => {
    const result = await listSnapshots("form");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("snap_abc12345");
  });

  it("calls the correct URL for each mode", async () => {
    vi.stubGlobal("fetch", mockFetch([]));
    await listSnapshots("layout");
    expect(fetch).toHaveBeenCalledWith("/api/snapshots/layout");
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: "oops" }, false, 500));
    await expect(listSnapshots("form")).rejects.toThrow("Failed to list snapshots");
  });
});

describe("saveSnapshot", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch(mockEntry, true, 201));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls POST /api/snapshots/:mode with JSON body", async () => {
    await saveSnapshot("form", "Test", { formSchema: "dsl" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/snapshots/form",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test", context: { formSchema: "dsl" } }),
      })
    );
  });

  it("returns the created snapshot entry", async () => {
    const entry = await saveSnapshot("form", "Test", {});
    expect(entry.id).toBe("snap_abc12345");
    expect(entry.name).toBe("My Snapshot");
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: "bad" }, false, 400));
    await expect(saveSnapshot("form", "x", {})).rejects.toThrow("Failed to save snapshot");
  });
});

describe("deleteSnapshot", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch({ deleted: "snap_abc12345" }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls DELETE /api/snapshots/:mode/:id", async () => {
    await deleteSnapshot("form", "snap_abc12345");
    expect(fetch).toHaveBeenCalledWith(
      "/api/snapshots/form/snap_abc12345",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("resolves without error on success", async () => {
    await expect(deleteSnapshot("form", "snap_abc12345")).resolves.toBeUndefined();
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", mockFetch({ error: "not found" }, false, 404));
    await expect(deleteSnapshot("form", "bad_id")).rejects.toThrow("Failed to delete snapshot");
  });
});
