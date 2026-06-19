import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  GeneralChatProvider,
  useGeneralChatContext,
} from "@/context/generalChat/GeneralChatContext";
import { ArtifactBoard } from "../ArtifactBoard";

// ─── Wrapper ──────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return <GeneralChatProvider>{children}</GeneralChatProvider>;
}

// ─── Helper to seed artifacts ─────────────────────────────────────────────────

function BoardWithSeed({
  seed,
}: {
  seed: Parameters<ReturnType<typeof useGeneralChatContext>["addArtifact"]>[0][];
}) {
  const { addArtifact } = useGeneralChatContext();
  return (
    <>
      <button
        onClick={() => {
          seed.forEach((a) => {
            addArtifact(a);
          });
        }}
      >
        seed
      </button>
      <ArtifactBoard />
    </>
  );
}

function renderBoard(
  artifacts: Parameters<ReturnType<typeof useGeneralChatContext>["addArtifact"]>[0][] = []
) {
  const utils = render(
    <GeneralChatProvider>
      <BoardWithSeed seed={artifacts} />
    </GeneralChatProvider>
  );
  return utils;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ArtifactBoard — empty state", () => {
  it("shows empty-state text when no artifacts", () => {
    renderBoard();
    expect(screen.getByText(/artifacts from code execution/i)).toBeInTheDocument();
  });

  it("does not show Clear button when empty", () => {
    renderBoard();
    expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
  });

  it("renders the Artifacts header", () => {
    renderBoard();
    expect(screen.getByText("Artifacts")).toBeInTheDocument();
  });

  it("does not show artifact count badge when empty", () => {
    renderBoard();
    // The count badge only appears when artifacts.length > 0
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});

describe("ArtifactBoard — with artifacts", () => {
  const sampleArtifacts = [
    { type: "code" as const, title: "Script One", content: "const x = 1" },
    { type: "text" as const, title: "Summary Two", content: "hello world" },
  ];

  async function renderWithArtifacts() {
    const utils = renderBoard(sampleArtifacts);
    await userEvent.click(screen.getByRole("button", { name: "seed" }));
    return utils;
  }

  it("shows artifact titles after seeding", async () => {
    await renderWithArtifacts();
    expect(screen.getByText("Script One")).toBeInTheDocument();
    expect(screen.getByText("Summary Two")).toBeInTheDocument();
  });

  it("shows Clear button when artifacts present", async () => {
    await renderWithArtifacts();
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("shows artifact count badge", async () => {
    await renderWithArtifacts();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("clears artifacts on Clear button click", async () => {
    await renderWithArtifacts();
    await userEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(screen.getByText(/artifacts from code execution/i)).toBeInTheDocument();
    expect(screen.queryByText("Script One")).not.toBeInTheDocument();
  });

  it("renders an ArtifactCard for each artifact", async () => {
    await renderWithArtifacts();
    // Each card has a copy button
    const copyBtns = screen.getAllByRole("button", { name: "Copy artifact content" });
    expect(copyBtns).toHaveLength(2);
  });
});

describe("ArtifactBoard — inside provider", () => {
  it("renders without crashing inside GeneralChatProvider wrapper", () => {
    render(<ArtifactBoard />, { wrapper });
    expect(screen.getByText("Artifacts")).toBeInTheDocument();
  });

  it("reflects newly added artifact immediately", () => {
    function AddAndBoard() {
      const { addArtifact } = useGeneralChatContext();
      return (
        <>
          <button
            onClick={() => {
              addArtifact({ type: "data", title: "JSON Result", content: "{}" });
            }}
          >
            add
          </button>
          <ArtifactBoard />
        </>
      );
    }

    render(
      <GeneralChatProvider>
        <AddAndBoard />
      </GeneralChatProvider>
    );

    act(() => {
      screen.getByRole("button", { name: "add" }).click();
    });

    expect(screen.getByText("JSON Result")).toBeInTheDocument();
  });
});
