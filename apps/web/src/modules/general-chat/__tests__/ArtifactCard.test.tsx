import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArtifactCard } from "../ArtifactCard";
import type { Artifact } from "@/context/generalChat/GeneralChatContext";

// Mock mermaid so diagram rendering doesn't crash in jsdom
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: "<svg>diagram</svg>", bindFunctions: vi.fn() }),
  },
}));

// ─── Mock navigator.clipboard ─────────────────────────────────────────────────

const writeTextMock = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: writeTextMock },
  configurable: true,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: "test-id",
    type: "code",
    title: "Test Artifact",
    content: "console.log('hello');",
    createdAt: new Date("2024-01-01T12:00:00Z").getTime(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.clearAllMocks();
});

describe("ArtifactCard", () => {
  it("renders the artifact title", () => {
    render(<ArtifactCard artifact={makeArtifact({ title: "My Script" })} />);
    expect(screen.getByText("My Script")).toBeInTheDocument();
  });

  it("renders Code badge for code type", () => {
    render(<ArtifactCard artifact={makeArtifact({ type: "code" })} />);
    expect(screen.getByText("Code")).toBeInTheDocument();
  });

  it("renders Diagram badge for mermaid type", () => {
    render(
      <ArtifactCard artifact={makeArtifact({ type: "mermaid", content: "graph TD; A-->B" })} />
    );
    expect(screen.getByText("Diagram")).toBeInTheDocument();
  });

  it("renders Diff badge for diff type", () => {
    render(
      <ArtifactCard artifact={makeArtifact({ type: "diff", content: "+ added\n- removed" })} />
    );
    expect(screen.getByText("Diff")).toBeInTheDocument();
  });

  it("renders Data badge for data type", () => {
    render(<ArtifactCard artifact={makeArtifact({ type: "data", content: '{"key":"val"}' })} />);
    expect(screen.getByText("Data")).toBeInTheDocument();
  });

  it("renders Text badge for text type", () => {
    render(<ArtifactCard artifact={makeArtifact({ type: "text", content: "hello world" })} />);
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("shows the artifact content in a pre block for non-diff types", () => {
    const content = "const x = 42;";
    render(<ArtifactCard artifact={makeArtifact({ type: "code", content })} />);
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it("renders diff lines individually for diff type", () => {
    render(
      <ArtifactCard
        artifact={makeArtifact({
          type: "diff",
          content: "+ line added\n- line removed\n  unchanged",
        })}
      />
    );
    expect(screen.getByText("+ line added")).toBeInTheDocument();
    expect(screen.getByText("- line removed")).toBeInTheDocument();
    // getByText normalizes whitespace by default — match without leading spaces
    expect(screen.getByText("unchanged")).toBeInTheDocument();
  });

  it("has a copy button with aria-label", () => {
    render(<ArtifactCard artifact={makeArtifact()} />);
    expect(screen.getByRole("button", { name: "Copy artifact content" })).toBeInTheDocument();
  });

  it("calls clipboard.writeText with artifact content on copy click", async () => {
    const content = "some code here";
    render(<ArtifactCard artifact={makeArtifact({ content })} />);
    await userEvent.click(screen.getByRole("button", { name: "Copy artifact content" }));
    expect(writeTextMock).toHaveBeenCalledWith(content);
  });

  it("copy button is still present after clicking copy", async () => {
    render(<ArtifactCard artifact={makeArtifact()} />);
    await userEvent.click(screen.getByRole("button", { name: "Copy artifact content" }));
    // Button is still in the DOM (either copy or check icon state)
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });
    expect(screen.getByRole("button", { name: "Copy artifact content" })).toBeInTheDocument();
  });

  it("renders Palette badge for palette type", () => {
    const palette = JSON.stringify([{ hex: "#ff0000", name: "Red", contrastOnWhite: 3.5 }]);
    render(<ArtifactCard artifact={makeArtifact({ type: "palette", content: palette })} />);
    expect(screen.getByText("Palette")).toBeInTheDocument();
  });

  it("renders color swatches for palette type with hex codes", () => {
    const palette = JSON.stringify([
      { hex: "#0066ff", name: "Blue", contrastOnWhite: 5.2 },
      { hex: "#ff3300", name: "Red", contrastOnWhite: 4.0 },
    ]);
    render(<ArtifactCard artifact={makeArtifact({ type: "palette", content: palette })} />);
    expect(screen.getByText("#0066ff")).toBeInTheDocument();
    expect(screen.getByText("#ff3300")).toBeInTheDocument();
  });

  it("renders palette contrast ratio with pass indicator when >= 4.5", () => {
    const palette = JSON.stringify([{ hex: "#000000", name: "Black", contrastOnWhite: 21 }]);
    render(<ArtifactCard artifact={makeArtifact({ type: "palette", content: palette })} />);
    expect(screen.getByText("21.0:1")).toBeInTheDocument();
  });

  it("falls back to pre block for palette when content is not valid JSON", () => {
    render(<ArtifactCard artifact={makeArtifact({ type: "palette", content: "not json" })} />);
    expect(screen.getByText("not json")).toBeInTheDocument();
  });

  it("renders MermaidDiagram container for mermaid type", async () => {
    const { container } = render(
      <ArtifactCard artifact={makeArtifact({ type: "mermaid", content: "graph TD; A-->B" })} />
    );
    await waitFor(() => {
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  it("displays a formatted timestamp", () => {
    const ts = new Date("2024-06-15T14:30:45Z").getTime();
    render(<ArtifactCard artifact={makeArtifact({ createdAt: ts })} />);
    // Just check there's some time-like text present (locale varies by env)
    const timePattern = /\d{1,2}:\d{2}/;
    const container = screen.getByText(timePattern);
    expect(container).toBeInTheDocument();
  });
});
