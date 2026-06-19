import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileTree } from "../FileTree";
import type { WordPressFile } from "@ai-builder/schemas";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const flatFiles: WordPressFile[] = [
  { id: "wpf_aa0001", path: "style.css", type: "css", content: "/* css */" },
  { id: "wpf_aa0002", path: "functions.php", type: "php", content: "<?php" },
  { id: "wpf_aa0003", path: "template-parts/content.php", type: "php", content: "<?php" },
  { id: "wpf_aa0004", path: "template-parts/content-none.php", type: "php", content: "<?php" },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FileTree", () => {
  it("renders the project slug as root folder label", () => {
    render(
      <FileTree files={[]} activeFileId={null} projectSlug="my-theme" onSelectFile={vi.fn()} />
    );
    expect(screen.getByText("my-theme/")).toBeInTheDocument();
  });

  it("shows empty state message when no files", () => {
    render(
      <FileTree files={[]} activeFileId={null} projectSlug="my-theme" onSelectFile={vi.fn()} />
    );
    expect(screen.getByText(/no files yet/i)).toBeInTheDocument();
  });

  it("renders flat file names", () => {
    render(
      <FileTree
        files={flatFiles}
        activeFileId={null}
        projectSlug="my-theme"
        onSelectFile={vi.fn()}
      />
    );
    expect(screen.getByText("style.css")).toBeInTheDocument();
    expect(screen.getByText("functions.php")).toBeInTheDocument();
  });

  it("renders directory node for nested files", () => {
    render(
      <FileTree
        files={flatFiles}
        activeFileId={null}
        projectSlug="my-theme"
        onSelectFile={vi.fn()}
      />
    );
    expect(screen.getByText("template-parts")).toBeInTheDocument();
  });

  it("renders children of directory when open (depth=0 is open by default)", () => {
    render(
      <FileTree
        files={flatFiles}
        activeFileId={null}
        projectSlug="my-theme"
        onSelectFile={vi.fn()}
      />
    );
    // depth=0 → open=true
    expect(screen.getByText("content.php")).toBeInTheDocument();
    expect(screen.getByText("content-none.php")).toBeInTheDocument();
  });

  it("calls onSelectFile with correct file when a file button is clicked", () => {
    const onSelect = vi.fn();
    render(
      <FileTree
        files={flatFiles}
        activeFileId={null}
        projectSlug="my-theme"
        onSelectFile={onSelect}
      />
    );
    fireEvent.click(screen.getByText("style.css"));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(flatFiles[0]);
  });

  it("toggles directory open/closed on click", () => {
    render(
      <FileTree
        files={flatFiles}
        activeFileId={null}
        projectSlug="my-theme"
        onSelectFile={vi.fn()}
      />
    );
    // template-parts is open by default (depth=0 < 2), click to close
    const dirButton = screen.getByRole("button", { name: /template-parts/i });
    fireEvent.click(dirButton);
    expect(screen.queryByText("content.php")).not.toBeInTheDocument();
    // click again to reopen
    fireEvent.click(dirButton);
    expect(screen.getByText("content.php")).toBeInTheDocument();
  });
});
