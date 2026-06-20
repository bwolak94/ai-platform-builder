import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MermaidDiagram } from "../MermaidDiagram";

// ─── Mock mermaid ─────────────────────────────────────────────────────────────

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

import mermaid from "mermaid";
const mermaidMock = vi.mocked(mermaid);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MermaidDiagram", () => {
  it("calls mermaid.render with the chart string", async () => {
    mermaidMock.render.mockResolvedValue({
      svg: "<svg>diagram</svg>",
      bindFunctions: vi.fn(),
      diagramType: "flowchart",
    });

    render(<MermaidDiagram chart="graph TD; A-->B" />);

    await waitFor(() => {
      expect(mermaidMock.render).toHaveBeenCalledWith(
        expect.stringContaining("mermaid-"),
        "graph TD; A-->B"
      );
    });
  });

  it("injects rendered SVG into the container", async () => {
    const svgContent = "<svg><text>diagram</text></svg>";
    mermaidMock.render.mockResolvedValue({
      svg: svgContent,
      bindFunctions: vi.fn(),
      diagramType: "flowchart",
    });

    const { container } = render(<MermaidDiagram chart="graph TD; A-->B" />);

    await waitFor(() => {
      expect(container.innerHTML).toContain("<svg>");
    });
  });

  it("shows error message when mermaid.render rejects", async () => {
    mermaidMock.render.mockRejectedValue(new Error("Parse error near A"));

    render(<MermaidDiagram chart="invalid chart syntax ###" />);

    await waitFor(() => {
      expect(screen.getByText(/Parse error near A/)).toBeInTheDocument();
    });
  });

  it("shows generic error when non-Error is thrown", async () => {
    mermaidMock.render.mockRejectedValue("string error");

    render(<MermaidDiagram chart="bad" />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to render diagram/)).toBeInTheDocument();
    });
  });

  it("skips render when chart is empty", () => {
    render(<MermaidDiagram chart="" />);
    expect(mermaidMock.render).not.toHaveBeenCalled();
  });

  it("applies custom className to the container", () => {
    mermaidMock.render.mockResolvedValue({
      svg: "<svg/>",
      bindFunctions: vi.fn(),
      diagramType: "flowchart",
    });

    const { container } = render(<MermaidDiagram chart="graph TD; A-->B" className="my-class" />);

    expect(container.firstChild).toHaveClass("my-class");
  });

  it("re-renders when chart prop changes", async () => {
    mermaidMock.render.mockResolvedValue({
      svg: "<svg/>",
      bindFunctions: vi.fn(),
      diagramType: "flowchart",
    });

    const { rerender } = render(<MermaidDiagram chart="graph TD; A-->B" />);
    await waitFor(() => {
      expect(mermaidMock.render).toHaveBeenCalledTimes(1);
    });

    rerender(<MermaidDiagram chart="sequenceDiagram; A->>B: Hello" />);
    await waitFor(() => {
      expect(mermaidMock.render).toHaveBeenCalledTimes(2);
    });
  });
});
