import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SnapshotSidebar } from "../SnapshotSidebar";
import type { SnapshotEntry } from "@/lib/snapshots-api";

// ─── Mock SnapshotContext ─────────────────────────────────────────────────────

const mockSave = vi.fn();
const mockRemove = vi.fn();
const mockRefresh = vi.fn();

let mockSnapshots: SnapshotEntry[] = [];
let mockIsLoading = false;
let mockIsSaving = false;

vi.mock("@/context/snapshots/SnapshotContext", () => ({
  useSnapshotContext: () => ({
    snapshots: mockSnapshots,
    isLoading: mockIsLoading,
    isSaving: mockIsSaving,
    save: mockSave,
    remove: mockRemove,
    refresh: mockRefresh,
  }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const entry: SnapshotEntry = {
  id: "snap_aaa",
  name: "Before redesign",
  createdAt: Date.now() - 60_000, // 1 minute ago
  context: { formSchema: "FORM: Test | layout:single-column" },
};

describe("SnapshotSidebar", () => {
  const getCurrentContext = vi
    .fn()
    .mockReturnValue({ formSchema: "FORM: Test | layout:single-column" });
  const onRestore = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSnapshots = [];
    mockIsLoading = false;
    mockIsSaving = false;
    mockSave.mockResolvedValue(entry);
    mockRemove.mockResolvedValue(undefined);
    getCurrentContext.mockReturnValue({ formSchema: "FORM: Test | layout:single-column" });
  });

  it("renders a trigger button for version history", () => {
    render(<SnapshotSidebar getCurrentContext={getCurrentContext} onRestore={onRestore} />);
    expect(screen.getByRole("button", { name: /version history/i })).toBeInTheDocument();
  });

  it("opens a sheet when the trigger is clicked", async () => {
    render(<SnapshotSidebar getCurrentContext={getCurrentContext} onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: /version history/i }));
    expect(screen.getByText("Version History")).toBeInTheDocument();
  });

  it("shows empty state when no snapshots exist", async () => {
    render(<SnapshotSidebar getCurrentContext={getCurrentContext} onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: /version history/i }));
    expect(screen.getByText(/No snapshots yet/i)).toBeInTheDocument();
  });

  it("renders a save input and button", async () => {
    render(<SnapshotSidebar getCurrentContext={getCurrentContext} onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: /version history/i }));
    expect(screen.getByPlaceholderText(/snapshot name/i)).toBeInTheDocument();
  });

  it("calls save with the typed name and current context when Save is clicked", async () => {
    render(<SnapshotSidebar getCurrentContext={getCurrentContext} onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: /version history/i }));
    await userEvent.type(screen.getByPlaceholderText(/snapshot name/i), "v1");

    // Find the save button (SVG icon button next to the input)
    const saveBtn = screen.getByRole("button", { name: "" });
    await userEvent.click(saveBtn);

    expect(mockSave).toHaveBeenCalledWith("v1", {
      formSchema: "FORM: Test | layout:single-column",
    });
  });

  it("clears the name input after saving", async () => {
    render(<SnapshotSidebar getCurrentContext={getCurrentContext} onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: /version history/i }));
    const input = screen.getByPlaceholderText(/snapshot name/i);
    await userEvent.type(input, "v1");
    await userEvent.click(screen.getByRole("button", { name: "" }));
    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe("");
    });
  });

  it("renders snapshot entries when snapshots exist", async () => {
    mockSnapshots = [entry];
    render(<SnapshotSidebar getCurrentContext={getCurrentContext} onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: /version history/i }));
    expect(screen.getByText("Before redesign")).toBeInTheDocument();
  });

  it("calls onRestore with the snapshot's context when Restore is clicked", async () => {
    mockSnapshots = [entry];
    render(<SnapshotSidebar getCurrentContext={getCurrentContext} onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: /version history/i }));
    await userEvent.click(screen.getByTitle(/restore this snapshot/i));
    expect(onRestore).toHaveBeenCalledWith(entry.context);
  });

  it("calls remove with the snapshot id when Delete is clicked", async () => {
    mockSnapshots = [entry];
    render(<SnapshotSidebar getCurrentContext={getCurrentContext} onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: /version history/i }));
    await userEvent.click(screen.getByTitle(/delete snapshot/i));
    expect(mockRemove).toHaveBeenCalledWith("snap_aaa");
  });

  it("shows loading spinner when isLoading is true", async () => {
    mockIsLoading = true;
    render(<SnapshotSidebar getCurrentContext={getCurrentContext} onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: /version history/i }));
    // The spinner has animate-spin class
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows relative timestamps on entries", async () => {
    mockSnapshots = [{ ...entry, createdAt: Date.now() - 30_000 }];
    render(<SnapshotSidebar getCurrentContext={getCurrentContext} onRestore={onRestore} />);
    await userEvent.click(screen.getByRole("button", { name: /version history/i }));
    // "just now" for < 60s ago
    expect(screen.getByText("just now")).toBeInTheDocument();
  });
});
